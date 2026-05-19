-- =============================================================================
-- MIGRATION 012: Epic 7 — pg_cron Schedules (single owner: Story 7.6 AC1)
-- Story: 7.6 — Pipeline cron-Supabase + Self-Healing
-- Depends on: 013 (defines fn_mark_stale_runs/fn_retry_failed_runs)
--             NOTE: 013 is created in the same migration set; order-wise this
--             file runs BEFORE 013 by timestamp ordering, so we use pg_cron
--             only to register schedules. The functions referenced will exist
--             at execution time of the cron jobs (post-deploy of 013).
-- Ref: ADR-EPIC7-003, docs/bench/cron-supabase-vs-langgraph-day1/
-- =============================================================================
--
-- Owner statement (per AC1): Story 7.6 is THE SINGLE OWNER of all Epic 7
-- pg_cron schedules. No other migration in Epic 7 may call cron.schedule()
-- or cron.unschedule().
--
-- Idempotent pattern: every schedule unschedules-if-exists before scheduling,
-- so re-running this migration in dev does not raise "job already exists".
--
-- Timezone: pg_cron runs in the database server timezone (Supabase = UTC).
-- BRT (UTC-3) reference times are documented as comments. Translate:
--   04:00 BRT == 07:00 UTC
--   02:00 BRT == 05:00 UTC
--   03:00 BRT == 06:00 UTC

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage so the service role can introspect (Supabase pattern)
GRANT USAGE ON SCHEMA cron TO postgres;

-- =============================================================================
-- Helper: idempotent (unschedule + reschedule)
-- =============================================================================
-- Postgres does not have a "cron.upsert"; we wrap in DO blocks. Each block
-- checks for an existing job by name and unschedules it before creating the
-- new one. cron.unschedule raises if the job is missing, so we guard with
-- a SELECT against cron.job.

-- -----------------------------------------------------------------------------
-- 1) epic7_mercadolivre_daily — daily 04:00 BRT (07:00 UTC)
--    Calls Edge Function trigger_mercadolivre_crawl (Story 7.4)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'epic7_mercadolivre_daily') THEN
    PERFORM cron.unschedule('epic7_mercadolivre_daily');
  END IF;
END $$;

SELECT cron.schedule(
  'epic7_mercadolivre_daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_base_url', true) || '/trigger_mercadolivre_crawl',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- -----------------------------------------------------------------------------
-- 2) epic7_cnpj_monthly — monthly day 20 02:00 BRT (05:00 UTC)
--    Calls Edge Function trigger_cnpj_etl (Story 7.5)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'epic7_cnpj_monthly') THEN
    PERFORM cron.unschedule('epic7_cnpj_monthly');
  END IF;
END $$;

SELECT cron.schedule(
  'epic7_cnpj_monthly',
  '0 5 20 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_base_url', true) || '/trigger_cnpj_etl',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- -----------------------------------------------------------------------------
-- 3) epic7_itbi_monthly — monthly day 25 03:00 BRT (06:00 UTC)
--    Placeholder Wave B (Story 7.11 stub). Edge Function may not exist yet;
--    cron call returns non-2xx and is logged in cron.job_run_details — that
--    is acceptable until Wave B materializes the endpoint.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'epic7_itbi_monthly') THEN
    PERFORM cron.unschedule('epic7_itbi_monthly');
  END IF;
END $$;

SELECT cron.schedule(
  'epic7_itbi_monthly',
  '0 6 25 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_base_url', true) || '/trigger_itbi_snapshot',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- -----------------------------------------------------------------------------
-- 4) epic7_geosampa_quarterly — quarterly day 1 of Jan/Apr/Jul/Oct, 04:00 UTC
--    Reuses Story 3.5 GeoSampa refresh logic (already in place).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'epic7_geosampa_quarterly') THEN
    PERFORM cron.unschedule('epic7_geosampa_quarterly');
  END IF;
END $$;

SELECT cron.schedule(
  'epic7_geosampa_quarterly',
  '0 4 1 1,4,7,10 *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_base_url', true) || '/trigger_geosampa_refresh',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- -----------------------------------------------------------------------------
-- 5) epic7_stale_runs_healer — every 5 minutes
--    Calls fn_mark_stale_runs() + fn_retry_failed_runs(3) defined in 013.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'epic7_stale_runs_healer') THEN
    PERFORM cron.unschedule('epic7_stale_runs_healer');
  END IF;
END $$;

SELECT cron.schedule(
  'epic7_stale_runs_healer',
  '*/5 * * * *',
  $$
  SELECT fn_mark_stale_runs();
  SELECT fn_retry_failed_runs(3);
  $$
);

-- =============================================================================
-- Verification helper (read-only). Run after migration:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'epic7_%';
-- =============================================================================

COMMENT ON EXTENSION pg_cron IS
  'Epic 7 Story 7.6 — pg_cron 1.6.4 owner: migration 012 only';
