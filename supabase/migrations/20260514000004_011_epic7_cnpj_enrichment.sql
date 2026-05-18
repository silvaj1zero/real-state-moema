-- =============================================================================
-- MIGRATION 011: Epic 7 — cnpj_enrichment (RFB CNPJ ETL target table)
-- Story: 7.5 — Container CNPJ ETL (rictom/cnpj-sqlite) + tabela cnpj_enrichment
-- Depends on: 000_extensions_and_types.sql (pgcrypto for gen_random_uuid),
--             008_epic7_schemas.sql (Epic 7 baseline — non-blocking link)
-- Ref: docs/code-anatomy/rictom-cnpj-sqlite/extraction-notes.md
-- =============================================================================
-- DESIGN
-- - Append-only upsert sink for the monthly CNPJ ETL container output.
-- - Single source of truth for classifyAdvertiser (Story 7.3) CNAE lookup.
-- - Indexed for two query shapes: single-cnpj point lookup AND uf+cnae scans.
-- - RLS: service_role has full I/O. `authenticated` baseline gets a column
--   subset (no socios) — Story 7.10 will refine via row-level policies and
--   audit. `anon` has zero access.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cnpj_enrichment (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj               TEXT         NOT NULL UNIQUE,                       -- 14 digits
  razao_social       TEXT,
  nome_fantasia      TEXT,
  cnae_primario      TEXT         NOT NULL,
  cnaes_secundarios  TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  uf                 TEXT,
  municipio          TEXT,
  situacao_cadastral TEXT,                                              -- '02' = ativa
  data_situacao      DATE,
  socios             JSONB        NOT NULL DEFAULT '[]'::JSONB,
  raw_data           JSONB        NOT NULL DEFAULT '{}'::JSONB,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT cnpj_enrichment_cnpj_is_14_digits
    CHECK (cnpj ~ '^[0-9]{14}$')
);

COMMENT ON TABLE  public.cnpj_enrichment IS
  'Subset of RFB CNPJ data filtered to SP real-estate CNAEs. Hydrated monthly by infrastructure/cnpj-etl.';
COMMENT ON COLUMN public.cnpj_enrichment.cnpj IS
  'Full 14-digit CNPJ: cnpj_basico (8) || cnpj_ordem (4) || cnpj_dv (2)';
COMMENT ON COLUMN public.cnpj_enrichment.cnae_primario IS
  'CNAE fiscal primario — used by classifyAdvertiser (Story 7.3) for Builder/Broker/Holding routing';
COMMENT ON COLUMN public.cnpj_enrichment.socios IS
  'PII — sensitive. authenticated role MUST NOT read this column (RLS below). Story 7.10 will encrypt at rest.';

-- =============================================================================
-- Indexes
-- =============================================================================
-- cnpj UNIQUE already implies a btree index. Keep additional shapes for the
-- hot read paths in Story 7.3 + Story 7.4.

CREATE INDEX IF NOT EXISTS idx_cnpj_enrichment_cnae_primario
  ON public.cnpj_enrichment (cnae_primario);

CREATE INDEX IF NOT EXISTS idx_cnpj_enrichment_uf
  ON public.cnpj_enrichment (uf);

CREATE INDEX IF NOT EXISTS idx_cnpj_enrichment_uf_cnae
  ON public.cnpj_enrichment (uf, cnae_primario);

CREATE INDEX IF NOT EXISTS idx_cnpj_enrichment_cnaes_secundarios
  ON public.cnpj_enrichment USING GIN (cnaes_secundarios);

CREATE INDEX IF NOT EXISTS idx_cnpj_enrichment_socios
  ON public.cnpj_enrichment USING GIN (socios jsonb_path_ops);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_cnpj_enrichment_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cnpj_enrichment_touch ON public.cnpj_enrichment;
CREATE TRIGGER cnpj_enrichment_touch
  BEFORE UPDATE ON public.cnpj_enrichment
  FOR EACH ROW EXECUTE FUNCTION public.tg_cnpj_enrichment_touch();

-- =============================================================================
-- RLS — authenticated gets safe subset; service_role gets full I/O; anon denied
-- =============================================================================
ALTER TABLE public.cnpj_enrichment ENABLE ROW LEVEL SECURITY;

-- service_role full access
DROP POLICY IF EXISTS cnpj_enrichment_service_role_all ON public.cnpj_enrichment;
CREATE POLICY cnpj_enrichment_service_role_all
  ON public.cnpj_enrichment
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated baseline: SELECT only (the column subset is enforced via
-- GRANT below — RLS in Postgres operates at row level, column-level is GRANT).
DROP POLICY IF EXISTS cnpj_enrichment_auth_select ON public.cnpj_enrichment;
CREATE POLICY cnpj_enrichment_auth_select
  ON public.cnpj_enrichment
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Column-level grants — authenticated must NOT see socios or raw_data
-- (Story 7.10 refines via SECURITY DEFINER RPC for audit).
REVOKE ALL ON public.cnpj_enrichment FROM authenticated;
GRANT SELECT
      (id, cnpj, razao_social, nome_fantasia,
       cnae_primario, cnaes_secundarios,
       uf, municipio, situacao_cadastral, data_situacao,
       created_at, updated_at)
  ON public.cnpj_enrichment TO authenticated;

-- anon: explicit deny by revoking all grants. RLS + no policy => deny.
REVOKE ALL ON public.cnpj_enrichment FROM anon;

-- service_role grants (full)
GRANT ALL ON public.cnpj_enrichment TO service_role;
