-- =============================================================================
-- MIGRATION 009: Epic 7 — Telemetry (crawl_runs/crawl_requests/crawl_failures)
-- Story: 7.2 — Wrapper PortalCrawler + Telemetry Layer
-- Depends on: 008_epic7_schemas.sql (pgcrypto extension assumed)
-- Ref: docs/code-anatomy/apify-crawlee-focused/extraction-notes.md Sec. 2
-- =============================================================================
--
-- Observabilidade do PortalCrawler. Cada execucao registra um row em
-- crawl_runs (com contadores agregados) e N rows em crawl_requests
-- (uma por URL) + crawl_failures (uma por falha definitiva).
--
-- AC5 (Story 7.2): expomos o schema esperado pela funcao
-- fn_mark_stale_runs() definida na migration 013 (Story 7.6). Colunas
-- relevantes: status, error_message, started_at, finished_at.

-- =============================================================================
-- crawl_runs — Uma corrida do crawler
-- =============================================================================

CREATE TABLE IF NOT EXISTS crawl_runs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal              TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'running'
                                   CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  requests_finished   INTEGER     NOT NULL DEFAULT 0,
  requests_failed     INTEGER     NOT NULL DEFAULT 0,
  http_only_runs      INTEGER     NOT NULL DEFAULT 0,
  browser_runs        INTEGER     NOT NULL DEFAULT 0,
  mispredictions      INTEGER     NOT NULL DEFAULT 0,
  avg_duration_ms     NUMERIC,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_portal
  ON crawl_runs (portal);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_status
  ON crawl_runs (status);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_created_at_desc
  ON crawl_runs (created_at DESC);

-- Healer (Story 7.6) consulta por status='running' AND started_at < now() - interval '30 min'
CREATE INDEX IF NOT EXISTS idx_crawl_runs_status_started_at
  ON crawl_runs (status, started_at);

COMMENT ON TABLE crawl_runs IS
  'Epic 7 Story 7.2 — Telemetry: 1 row por execucao do PortalCrawler';

-- =============================================================================
-- crawl_requests — Cada request executado durante um run
-- =============================================================================

CREATE TABLE IF NOT EXISTS crawl_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID        NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
  portal      TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  retries     INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_requests_run_id
  ON crawl_requests (run_id);

CREATE INDEX IF NOT EXISTS idx_crawl_requests_portal
  ON crawl_requests (portal);

CREATE INDEX IF NOT EXISTS idx_crawl_requests_created_at_desc
  ON crawl_requests (created_at DESC);

COMMENT ON TABLE crawl_requests IS
  'Epic 7 Story 7.2 — 1 row por URL requisitada (sucesso ou retry final)';

-- =============================================================================
-- crawl_failures — Falhas definitivas (apos retries esgotados)
-- =============================================================================

CREATE TABLE IF NOT EXISTS crawl_failures (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID        NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
  portal        TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  error_message TEXT        NOT NULL,
  error_stack   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_failures_run_id
  ON crawl_failures (run_id);

CREATE INDEX IF NOT EXISTS idx_crawl_failures_portal
  ON crawl_failures (portal);

CREATE INDEX IF NOT EXISTS idx_crawl_failures_created_at_desc
  ON crawl_failures (created_at DESC);

COMMENT ON TABLE crawl_failures IS
  'Epic 7 Story 7.2 — falhas definitivas (Story 7.8 popula review_queue a partir daqui)';

-- =============================================================================
-- Row Level Security
-- =============================================================================
--
-- service_role: full access (PortalCrawler escreve aqui)
-- authenticated: SELECT (admin dashboard pode visualizar telemetria)
-- anon: nenhum acesso (telemetria nunca exposta publicamente)

ALTER TABLE crawl_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_failures ENABLE ROW LEVEL SECURITY;

-- crawl_runs --------------------------------------------------------------

DROP POLICY IF EXISTS crawl_runs_service_all     ON crawl_runs;
DROP POLICY IF EXISTS crawl_runs_auth_select     ON crawl_runs;

CREATE POLICY crawl_runs_service_all ON crawl_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY crawl_runs_auth_select ON crawl_runs
  FOR SELECT TO authenticated
  USING (true);

-- crawl_requests ---------------------------------------------------------

DROP POLICY IF EXISTS crawl_requests_service_all ON crawl_requests;
DROP POLICY IF EXISTS crawl_requests_auth_select ON crawl_requests;

CREATE POLICY crawl_requests_service_all ON crawl_requests
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY crawl_requests_auth_select ON crawl_requests
  FOR SELECT TO authenticated
  USING (true);

-- crawl_failures ---------------------------------------------------------

DROP POLICY IF EXISTS crawl_failures_service_all ON crawl_failures;
DROP POLICY IF EXISTS crawl_failures_auth_select ON crawl_failures;

CREATE POLICY crawl_failures_service_all ON crawl_failures
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY crawl_failures_auth_select ON crawl_failures
  FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- Grants (explicit, defense-in-depth on top of RLS)
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON crawl_runs     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON crawl_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON crawl_failures TO service_role;

GRANT SELECT ON crawl_runs     TO authenticated;
GRANT SELECT ON crawl_requests TO authenticated;
GRANT SELECT ON crawl_failures TO authenticated;

-- =============================================================================
-- AC5 schema-compat assertion
-- =============================================================================
--
-- A funcao fn_mark_stale_runs() (Story 7.6 migration 013) espera estas
-- colunas com semantica abaixo. Mudar nomes/tipos exige coordenar com
-- Story 7.6 e atualizar a funcao downstream.
--
--   crawl_runs.status         TEXT IN ('running','completed','failed','cancelled')
--   crawl_runs.started_at     TIMESTAMPTZ NOT NULL
--   crawl_runs.finished_at    TIMESTAMPTZ (nullable)
--   crawl_runs.error_message  TEXT (nullable)
--
-- Esta migration NAO define fn_mark_stale_runs() — apenas garante que
-- as colunas existem com os tipos esperados.
