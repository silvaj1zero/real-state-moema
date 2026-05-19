-- Migration 017 — Epic 7 — trigger secret header for MercadoLivre cron
-- Story 7.4 QA fix (gate 2794411): SEC-002
--
-- Reconfigura o cron job `epic7_mercadolivre_daily` (criado em migration 012,
-- Story 7.6) para enviar o header `x-trigger-secret` exigido pela Edge Function
-- `trigger_mercadolivre_crawl` após o fix SEC-002.
--
-- Requer GUC `app.mercadolivre_trigger_secret` configurado no projeto Supabase:
--   ALTER DATABASE postgres SET app.mercadolivre_trigger_secret = '...';
-- Ou setting per-cluster equivalente. Gere via:
--   openssl rand -hex 32
--
-- Idempotente — unschedule + reschedule.

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
      'authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'x-trigger-secret', current_setting('app.mercadolivre_trigger_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'epic7_mercadolivre_daily reconfigured 2026-05-19 (Story 7.4 QA SEC-002 fix)';
