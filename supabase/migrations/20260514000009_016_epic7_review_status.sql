-- =============================================================================
-- MIGRATION 016: Epic 7 — Review Queue Status (Story 7.8 AC5)
-- Story: 7.8 — Tela Manual Review Queue (confidence < 0.70)
-- Depends on: 008_epic7_schemas.sql (scraped_listings + classification_confidence)
-- Ref: docs/stories/7.8.story.md AC5
-- =============================================================================
-- DESIGN
-- - Adiciona 4 colunas em scraped_listings para suportar fluxo de revisão manual
--   da Luciana sobre anúncios com classification_confidence < 0.70.
-- - review_status NULL = pendente de revisão (estado inicial).
-- - Index parcial WHERE review_status IS NULL otimiza a query da fila (queue
--   tende a ser pequena após calibragem; sem o filtro parcial o index inflaria
--   com listings antigos já decididos).
-- - review_decided_by referencia auth.users (RLS aplica policies herdadas).
-- =============================================================================

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS review_status TEXT
    CHECK (review_status IS NULL OR review_status IN (
      'confirmed_fisbo',
      'confirmed_other',
      'rejected_is_broker',
      'rejected_is_construtora',
      'discarded',
      'skipped'
    ));

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS review_decided_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS review_decided_at TIMESTAMPTZ;

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- =============================================================================
-- Index parcial — só linhas pendentes de revisão
-- =============================================================================
-- Optimiza a query principal da fila:
--   SELECT ... WHERE classification_confidence < 0.70 AND review_status IS NULL
-- Ordenação por created_at DESC já é coberta por idx implícito do PK + sort.
CREATE INDEX IF NOT EXISTS idx_scraped_listings_review_pending
  ON scraped_listings(created_at DESC)
  WHERE review_status IS NULL
    AND classification_confidence IS NOT NULL
    AND classification_confidence < 0.70;

-- =============================================================================
-- COMMENTS — Documentação inline para devs futuros
-- =============================================================================

COMMENT ON COLUMN scraped_listings.review_status IS
  'Story 7.8 — decisão da consultora na fila de revisão manual. NULL = pendente.';

COMMENT ON COLUMN scraped_listings.review_decided_by IS
  'Story 7.8 — auth.users.id da consultora que decidiu. SET NULL se user removido.';

COMMENT ON COLUMN scraped_listings.review_decided_at IS
  'Story 7.8 — timestamp da decisão na fila de revisão.';

COMMENT ON COLUMN scraped_listings.review_notes IS
  'Story 7.8 — anotação opcional da consultora sobre o motivo da decisão.';
