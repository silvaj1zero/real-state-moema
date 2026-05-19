-- =============================================================================
-- MIGRATION 019: Epic 7 — pg_cron timezone GUC guard
-- Story: 7.6 — Pipeline cron-Supabase + Self-Healing (QA fix INFRA-002)
-- Depends on: 012 (cron schedules whose timing assumes cron.timezone=UTC)
-- Ref: docs/qa/gates/7.6-cron-pipeline.yml (commit fde1ca3)
-- =============================================================================
--
-- QA Fix INFRA-002 (medium severity):
--   Migration 012 cron schedules use UTC-based cron expressions and assume
--   `cron.timezone = 'UTC'` (Supabase default). If this GUC ever drifts
--   (manual override, custom Postgres deploy, future Supabase change), the
--   five Epic 7 schedules will fire at wrong wall-clock times silently —
--   no error, no log — and ETL windows shift undetected.
--
-- Fix: emit a WARNING (non-fatal) at migration apply time if `cron.timezone`
-- is anything other than 'UTC'. The migration intentionally does NOT fail —
-- a misaligned timezone is a runtime concern, not a schema defect, and
-- failing here would block unrelated migrations. The WARNING surfaces in
-- migration logs for @devops to triage.
--
-- GUC settings assumed for Epic 7 cron schedules (migration 012):
--   cron.timezone = 'UTC' (Supabase default)
--   cron.use_background_workers = 'on' (default)
-- Verify post-deploy via:
--   SELECT name, setting FROM pg_settings WHERE name LIKE 'cron.%';
--
-- Note: `current_setting('cron.timezone', true)` uses missing_ok=true. If
-- pg_cron was never loaded (extension missing), the setting is NULL and we
-- emit a separate warning rather than raising.
-- =============================================================================

DO $$
DECLARE
  v_tz TEXT;
BEGIN
  v_tz := current_setting('cron.timezone', true);

  IF v_tz IS NULL THEN
    RAISE WARNING '[migration 019] cron.timezone GUC unset — pg_cron extension may not be loaded yet. Epic 7 schedules in migration 012 assume UTC. Verify post-deploy: SELECT name, setting FROM pg_settings WHERE name=''cron.timezone'';';
  ELSIF v_tz IS DISTINCT FROM 'UTC' THEN
    RAISE WARNING '[migration 019] cron.timezone is ''%'' — Epic 7 schedules in migration 012 assume UTC. Schedule wall-clock times will be off by the UTC offset. Either: (a) ALTER DATABASE postgres SET cron.timezone = ''UTC''; or (b) audit and re-cron each Epic 7 schedule with offset-corrected expressions.', v_tz;
  ELSE
    RAISE NOTICE '[migration 019] cron.timezone = UTC — Epic 7 schedules will fire at documented BRT-converted times.';
  END IF;
END $$;
