-- =============================================================================
-- MIGRATION 020: Epic 7 — Validation Batch 001 (Story 7.9 AC1)
-- Story: 7.9 — Workshop Validacao Empirica Luciana (Batch 200 Anuncios)
-- Depends on: 008_epic7_schemas.sql (scraped_listings)
-- Ref: docs/stories/7.9.story.md AC1/AC2
-- Note: numero 016 ja usado por review_status (Story 7.8); 020 = proximo
--       sequencial apos 019_epic7_cron_timezone_guard.
-- =============================================================================
-- DESIGN
-- - Tabela dedicada (nao colunas em scraped_listings) porque o batch e
--   efêmero: 200 linhas selecionadas para 1 workshop, com decisoes que
--   alimentam relatorio AC3 e ADR AC5.
-- - UNIQUE (scraped_listing_id) torna o script build-validation-batch.sql
--   idempotente — re-rodar nao duplica e preserva luciana_decision.
-- - luciana_decision NULL = ainda nao decidido (estado inicial). Index
--   parcial WHERE luciana_decision IS NULL otimiza "proximo pendente".
-- - RLS: service_role tem ALL (job seed + relatorios server-side);
--   authenticated tem SELECT/UPDATE (workshop UI roda sob auth do admin).
--   Guard de role=admin e aplicado na app layer (Server Component).
-- =============================================================================

CREATE TABLE IF NOT EXISTS validation_batch_001 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_listing_id UUID NOT NULL
    REFERENCES scraped_listings(id) ON DELETE CASCADE,
  hypothesis_classification TEXT NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL
    CHECK (confidence >= 0 AND confidence <= 1),
  luciana_decision TEXT
    CHECK (luciana_decision IS NULL OR luciana_decision IN (
      'is_fisbo',
      'not_fisbo',
      'unknown'
    )),
  luciana_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT validation_batch_001_scraped_listing_unique
    UNIQUE (scraped_listing_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Otimiza "proximo pendente" no fluxo de workshop:
--   SELECT ... FROM validation_batch_001 WHERE luciana_decision IS NULL
--   ORDER BY created_at LIMIT 1
CREATE INDEX IF NOT EXISTS idx_validation_batch_001_pending
  ON validation_batch_001(created_at)
  WHERE luciana_decision IS NULL;

-- Lookup reverso scraped_listing -> batch entry (para join do relatorio AC3)
CREATE INDEX IF NOT EXISTS idx_validation_batch_001_scraped_listing
  ON validation_batch_001(scraped_listing_id);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE validation_batch_001 ENABLE ROW LEVEL SECURITY;

-- service_role: tudo (seed via psql, jobs de relatorio)
CREATE POLICY validation_batch_001_service_all
  ON validation_batch_001
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: leitura para listagem do workshop
-- (guard de role=admin aplicado em app/src/app/admin/validation-workshop/page.tsx)
CREATE POLICY validation_batch_001_authenticated_select
  ON validation_batch_001
  FOR SELECT
  TO authenticated
  USING (true);

-- authenticated: update da decisao + notes
CREATE POLICY validation_batch_001_authenticated_update
  ON validation_batch_001
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE validation_batch_001 IS
  'Story 7.9 — batch de 200 anuncios estratificados para workshop empirico '
  'de validacao FISBO com a Luciana. Cada linha = 1 listing + decisao '
  'qualitativa (is_fisbo|not_fisbo|unknown) + notas. Alimenta H-001 '
  'verdict em curiosity_queue.yaml.';

COMMENT ON COLUMN validation_batch_001.scraped_listing_id IS
  'FK para o anuncio original. UNIQUE: evita duplicacao no re-run do seed.';

COMMENT ON COLUMN validation_batch_001.hypothesis_classification IS
  'Snapshot da classificacao automatica no momento do seed (ex: '
  'for_sale_by_owner | agent | broker | builder). Usado no calculo de '
  'precision/recall do relatorio.';

COMMENT ON COLUMN validation_batch_001.confidence IS
  'Snapshot do classification_confidence no momento do seed (0..1). '
  'Usado para estratificar bandas no relatorio AC3.';

COMMENT ON COLUMN validation_batch_001.luciana_decision IS
  'Decisao qualitativa da consultora: is_fisbo | not_fisbo | unknown. '
  'NULL = ainda nao revisado.';

COMMENT ON COLUMN validation_batch_001.luciana_notes IS
  'Comentario livre da consultora (max 500 char no Server Action).';

COMMENT ON COLUMN validation_batch_001.decided_at IS
  'Timestamp da decisao. NULL enquanto luciana_decision IS NULL.';
