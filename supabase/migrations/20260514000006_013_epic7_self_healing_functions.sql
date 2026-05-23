-- =============================================================================
-- MIGRATION 013: Epic 7 — Self-Healing Functions + pgmq Queue
-- Story: 7.6 — Pipeline cron-Supabase + Self-Healing (ACs 2, 3, 4, 5, 10)
-- Depends on: 009 (crawl_runs table), 012 (cron schedules consume these fns)
-- Ref: ADR-EPIC7-003, docs/poc/7.6-pgmq-availability-check.md
-- =============================================================================
--
-- AC2: fn_mark_stale_runs() — marks crawl_runs stuck in 'running' > 15min as
--      'failed'. Called every 5min by epic7_stale_runs_healer (migration 012).
-- AC3: fn_retry_failed_runs(p_max_retries) — re-enqueue failed runs via pgmq
--      OR pg_notify; increments retry_count.
-- AC4: ALTER crawl_runs ADD retry_count.
-- AC5: pgmq extension + queue epic7_long_tasks.
-- AC10: v_crawl_health view (24h consolidated metrics per portal).
--
-- Note (cross-story): Story 7.2 AC5 is hereby de facto rewritten to "consume
-- fn_mark_stale_runs() defined in this migration". The function does NOT
-- exist in 009; this is the canonical owner.
--
-- =============================================================================
-- CHANGELOG
-- =============================================================================
-- 2026-05-23 — Dara (@db-sage) — INLINE FIX (justified exception to
--   migration-immutability rule):
--
--   Bug: v_crawl_health avg_duration_ms expression placed FILTER on the
--   outer ROUND() (scalar function), triggering Postgres SQLSTATE 42809:
--   "FILTER specified, but round is not an aggregate function". Parser
--   associated FILTER with ROUND instead of the inner AVG aggregate.
--
--   Fix: moved FILTER inside ROUND() so it applies to AVG() before cast.
--
--   Discovery: @devops Gage, Phase 1 deploy on Supabase branch
--   `staging-epic7` (isolated, disposable). Bug aborted parser before
--   any DDL was committed.
--
--   Production impact: ZERO. This migration NEVER applied successfully
--   in any environment. No deployed state depends on the pre-fix DDL.
--
--   Why inline over new migration 020:
--     - 013 failure aborts the entire migration transaction; a follow-up
--       migration 020 attempting DROP/CREATE would never execute because
--       Postgres halts the migration chain at the first parser error.
--     - Migration 018 (ALTER VIEW v_crawl_health SET security_invoker)
--       requires the view to exist — only reachable if 013 succeeds.
--     - Immutability rule protects DEPLOYED state from drift; there is
--       no deployed state here to protect.
--
--   Authority: @db-sage owns DDL/migrations (.claude/rules/agent-authority.md).
--   Re-gate required: @qa on Story 7.6 against this fix.
--   See: docs/stories/7.6.story.md Change Log 2026-05-23 entry.

-- =============================================================================
-- AC4 — crawl_runs.retry_count
-- =============================================================================
ALTER TABLE crawl_runs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN crawl_runs.retry_count IS
  'Story 7.6 AC4 — number of self-healing retries attempted. Capped by fn_retry_failed_runs(p_max_retries).';

-- =============================================================================
-- AC5 — pgmq extension + queue
-- Per docs/poc/7.6-pgmq-availability-check.md (Path A): pgmq 1.5.1 is
-- available and we adopt it natively. Fallback `epic7_task_queue` table is
-- documented in the PoC but NOT created here — adopting Path B requires
-- explicit verdict change.
--
-- VERSION pinning (QA fix INFRA-001, gate fde1ca3): we lock to the exact
-- version validated by @data-engineer (PoC: pgmq 1.5.1). Supabase platform
-- updates may bump default_version forward and silently break the contract
-- surface (`pgmq.send`, `pgmq.create`, `pgmq.read`). If the extension is
-- already installed at a different version, Postgres emits a NOTICE (not
-- an error) because IF NOT EXISTS short-circuits before VERSION is enforced;
-- pre-deploy validation MUST run: `SELECT extversion FROM pg_extension
-- WHERE extname='pgmq';` and require '1.5.1'.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgmq VERSION '1.5.1';

-- pgmq.create is idempotent (returns null if queue exists in 1.5.1+)
DO $$
BEGIN
  PERFORM pgmq.create('epic7_long_tasks');
EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE 'pgmq queue epic7_long_tasks already exists';
END $$;

GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;

-- =============================================================================
-- AC2 — fn_mark_stale_runs()
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_mark_stale_runs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH stale AS (
    UPDATE crawl_runs
    SET
      status = 'failed',
      finished_at = NOW(),
      error_message = CONCAT(
        'stale: started_at=',
        to_char(started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        ' (> 15min in running)'
      )
    WHERE status = 'running'
      AND started_at < NOW() - INTERVAL '15 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM stale;

  IF v_count > 0 THEN
    RAISE NOTICE '[fn_mark_stale_runs] marked % stale runs as failed', v_count;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION fn_mark_stale_runs() IS
  'Story 7.6 AC2 — sweeps crawl_runs stuck > 15min in running, marks failed. Called by epic7_stale_runs_healer cron.';

-- =============================================================================
-- AC3 — fn_retry_failed_runs(p_max_retries int)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_retry_failed_runs(p_max_retries INTEGER DEFAULT 3)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_run   RECORD;
BEGIN
  FOR v_run IN
    SELECT id, portal, retry_count
    FROM crawl_runs
    WHERE status = 'failed'
      AND retry_count < p_max_retries
      AND finished_at > NOW() - INTERVAL '2 hours'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Enqueue retry signal into pgmq for the async worker.
    -- The worker (Edge Function or background process) reads from
    -- epic7_long_tasks and re-triggers the original portal scraper.
    PERFORM pgmq.send(
      'epic7_long_tasks',
      jsonb_build_object(
        'kind', 'retry_crawl_run',
        'run_id', v_run.id,
        'portal', v_run.portal,
        'retry_count', v_run.retry_count + 1
      )
    );

    -- Also fire a pg_notify channel for any in-DB listeners (debug/observability).
    PERFORM pg_notify('crawl_retry', v_run.id::text);

    UPDATE crawl_runs
    SET retry_count = retry_count + 1
    WHERE id = v_run.id;

    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE '[fn_retry_failed_runs] re-enqueued % failed runs (max_retries=%)', v_count, p_max_retries;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION fn_retry_failed_runs(INTEGER) IS
  'Story 7.6 AC3 — re-enqueues failed runs via pgmq + pg_notify, increments retry_count. Caps at p_max_retries.';

-- =============================================================================
-- AC10 — v_crawl_health view (read-only 24h consolidated dashboard)
-- =============================================================================
CREATE OR REPLACE VIEW v_crawl_health AS
SELECT
  portal,
  COUNT(*)                                                       AS total_runs_24h,
  COUNT(*) FILTER (WHERE status = 'completed')                   AS completed,
  COUNT(*) FILTER (WHERE status = 'failed')                      AS failed,
  COUNT(*) FILTER (WHERE status = 'running')                     AS running,
  COUNT(*) FILTER (WHERE status = 'cancelled')                   AS cancelled,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed')
         / NULLIF(COUNT(*) FILTER (WHERE status IN ('completed','failed')), 0),
    2
  )                                                              AS success_rate_pct,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000)
      FILTER (WHERE finished_at IS NOT NULL)
    ::NUMERIC,
    0
  )                                                              AS avg_duration_ms,
  SUM(retry_count)                                                AS total_retries,
  MAX(started_at)                                                 AS last_run_at
FROM crawl_runs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY portal
ORDER BY portal;

COMMENT ON VIEW v_crawl_health IS
  'Story 7.6 AC10 — 24h health snapshot per portal: counts, success rate, avg duration, retries.';

-- Optional: extend with apify_cost_usd when scraped_listings join is needed.
-- Left for a follow-up to avoid coupling this migration to schemas owned by 7.3/7.4.
