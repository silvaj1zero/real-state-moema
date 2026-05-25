-- =============================================================================
-- Story 7.9 AC1 — Build Validation Batch 001 (200 listings stratified)
-- =============================================================================
-- PURPOSE
--   Popula `validation_batch_001` com 200 listings de `scraped_listings`
--   estratificados em 4 bandas para o workshop empirico da Luciana (H-001).
--
-- STRATA
--   - 50 FISBO confidence >= 0.85  (high conf)
--   - 50 FISBO confidence 0.70-0.85 (mid conf)
--   - 50 FISBO confidence 0.50-0.70 (low conf)
--   - 50 controle (agent/broker/builder)  (sabidamente nao FISBO)
--
-- GEOGRAPHIC COVERAGE
--   bairro ILIKE Moema | Vila Olimpia | Itaim — balanced via filter no WHERE.
--   Se um bairro nao tiver volume suficiente, ORDER BY random() preenche
--   com listings disponiveis e o relatorio (AC3) documenta o desvio.
--
-- IDEMPOTENCY
--   Insert usa ON CONFLICT (scraped_listing_id) DO NOTHING (UNIQUE constraint
--   na migration 020 garante que rodar 2x nao duplica). TRUNCATE explicito
--   ficou de fora porque destruiria decisoes da Luciana ja gravadas.
--
-- USAGE
--   psql $SUPABASE_URL -f scripts/epic7/build-validation-batch.sql
--   Pre-req: migration 020_epic7_validation_batch.sql aplicada.
--   Pre-req: scraped_listings com volume real (Story 7.4 deploy + 14d).
-- =============================================================================

BEGIN;

WITH
-- Banda 1 — FISBO high confidence
fisbo_high AS (
  SELECT id, classification, classification_confidence
  FROM scraped_listings
  WHERE classification = 'for_sale_by_owner'
    AND classification_confidence >= 0.85
    AND (
      bairro ILIKE '%moema%'
      OR bairro ILIKE '%vila olimpia%'
      OR bairro ILIKE '%vila olímpia%'
      OR bairro ILIKE '%itaim%'
    )
    AND is_active = true
  ORDER BY random()
  LIMIT 50
),
-- Banda 2 — FISBO mid confidence
fisbo_mid AS (
  SELECT id, classification, classification_confidence
  FROM scraped_listings
  WHERE classification = 'for_sale_by_owner'
    AND classification_confidence >= 0.70
    AND classification_confidence < 0.85
    AND (
      bairro ILIKE '%moema%'
      OR bairro ILIKE '%vila olimpia%'
      OR bairro ILIKE '%vila olímpia%'
      OR bairro ILIKE '%itaim%'
    )
    AND is_active = true
  ORDER BY random()
  LIMIT 50
),
-- Banda 3 — FISBO low confidence
fisbo_low AS (
  SELECT id, classification, classification_confidence
  FROM scraped_listings
  WHERE classification = 'for_sale_by_owner'
    AND classification_confidence >= 0.50
    AND classification_confidence < 0.70
    AND (
      bairro ILIKE '%moema%'
      OR bairro ILIKE '%vila olimpia%'
      OR bairro ILIKE '%vila olímpia%'
      OR bairro ILIKE '%itaim%'
    )
    AND is_active = true
  ORDER BY random()
  LIMIT 50
),
-- Banda 4 — controle (nao FISBO sabidamente)
control_group AS (
  SELECT id, classification, classification_confidence
  FROM scraped_listings
  WHERE classification IN ('agent', 'broker', 'builder')
    AND (
      bairro ILIKE '%moema%'
      OR bairro ILIKE '%vila olimpia%'
      OR bairro ILIKE '%vila olímpia%'
      OR bairro ILIKE '%itaim%'
    )
    AND is_active = true
  ORDER BY random()
  LIMIT 50
),
combined AS (
  SELECT * FROM fisbo_high
  UNION ALL
  SELECT * FROM fisbo_mid
  UNION ALL
  SELECT * FROM fisbo_low
  UNION ALL
  SELECT * FROM control_group
)
INSERT INTO validation_batch_001 (
  scraped_listing_id,
  hypothesis_classification,
  confidence
)
SELECT
  id,
  classification,
  classification_confidence
FROM combined
ON CONFLICT (scraped_listing_id) DO NOTHING;

-- Sanity report — escreve linha por banda no NOTICE log do psql
DO $$
DECLARE
  v_total INT;
  v_fisbo_high INT;
  v_fisbo_mid INT;
  v_fisbo_low INT;
  v_control INT;
BEGIN
  SELECT count(*) INTO v_total FROM validation_batch_001;
  SELECT count(*) INTO v_fisbo_high
    FROM validation_batch_001
    WHERE hypothesis_classification = 'for_sale_by_owner' AND confidence >= 0.85;
  SELECT count(*) INTO v_fisbo_mid
    FROM validation_batch_001
    WHERE hypothesis_classification = 'for_sale_by_owner'
      AND confidence >= 0.70 AND confidence < 0.85;
  SELECT count(*) INTO v_fisbo_low
    FROM validation_batch_001
    WHERE hypothesis_classification = 'for_sale_by_owner'
      AND confidence >= 0.50 AND confidence < 0.70;
  SELECT count(*) INTO v_control
    FROM validation_batch_001
    WHERE hypothesis_classification IN ('agent', 'broker', 'builder');

  RAISE NOTICE 'validation_batch_001 totals -> total=%, fisbo_high=%, fisbo_mid=%, fisbo_low=%, control=%',
    v_total, v_fisbo_high, v_fisbo_mid, v_fisbo_low, v_control;

  IF v_total < 200 THEN
    RAISE WARNING 'Batch incompleto (% < 200). Volume insuficiente em scraped_listings; rever Story 7.4 deploy + 14d acumulo.', v_total;
  END IF;
END $$;

COMMIT;
