-- =============================================================================
-- MIGRATION 008: Epic 7 — Schemas unificados Advertiser/Property/HomeFlags
-- Story: 7.1 — Schema Unificado + Migration 008
-- Depends on: 003_epic3_intelligence.sql (scraped_listings), 002_epic2_methodology.sql (leads)
-- Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
-- Ref: docs/architecture/adrs/ADR-EPIC7-006-workspace-layout.md
-- =============================================================================

-- =============================================================================
-- scraped_listings — Adicionar colunas Epic 7
-- =============================================================================
--
-- 4 colunas novas:
--   - classification:            categoria do anunciante (5+1 enum via CHECK)
--   - classification_confidence: 0-1 (precisao da classificacao)
--   - classification_signals:    rastreabilidade dos sinais (JSONB array)
--   - home_flags:                7 booleans discriminantes (JSONB)
--
-- DEFAULT 'unknown' garante que linhas Epic 6 existentes nao violem CHECK
-- (mitigacao do risco listado na story 7.1).

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS classification TEXT
    DEFAULT 'unknown'
    CHECK (classification IN ('agent', 'broker', 'builder', 'for_sale_by_owner', 'unknown'));

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC(3,2)
    CHECK (classification_confidence IS NULL OR (classification_confidence >= 0 AND classification_confidence <= 1));

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS classification_signals JSONB;

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS home_flags JSONB;

-- =============================================================================
-- scraped_listings — Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_scraped_listings_classification
  ON scraped_listings(classification)
  WHERE classification IS NOT NULL;

-- =============================================================================
-- leads — Adicionar coluna lead_type
-- =============================================================================
--
-- Categoria do lead Epic 7 — usada por captacao/funnel para diferenciar
-- proprietario direto (FISBO) de imobiliaria/construtora.
--
--   - FISBO:    proprietario anunciando direto
--   - IMOB:     imobiliaria (broker)
--   - CONSTR:   construtora (builder)
--   - ADM:      administradora
--   - PJ_HOLD:  holding (pessoa juridica de gestao patrimonial)
--   - UNKNOWN:  default seguro

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_type TEXT
    DEFAULT 'UNKNOWN'
    CHECK (lead_type IN ('FISBO', 'IMOB', 'CONSTR', 'ADM', 'PJ_HOLD', 'UNKNOWN'));

-- =============================================================================
-- leads — Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_type
  ON leads(lead_type)
  WHERE lead_type IS NOT NULL AND lead_type <> 'UNKNOWN';

-- =============================================================================
-- Comments — documentacao inline para Supabase/PgAdmin
-- =============================================================================

COMMENT ON COLUMN scraped_listings.classification IS
  'Epic 7: categoria do anunciante. Enum: agent, broker, builder, for_sale_by_owner, unknown. Preenchido por classifyAdvertiser (Story 7.3).';

COMMENT ON COLUMN scraped_listings.classification_confidence IS
  'Epic 7: confianca [0-1] da classificacao. NULL ate Story 7.3 rodar.';

COMMENT ON COLUMN scraped_listings.classification_signals IS
  'Epic 7: array JSONB de sinais que justificam a classificacao (ex: ["ddd_mobile","no_creci_match"]).';

COMMENT ON COLUMN scraped_listings.home_flags IS
  'Epic 7: objeto JSONB com 7 booleans (is_pending, is_contingent, is_new_construction, is_fisbo_inferred, is_pf_disclosed, is_pj_disclosed, has_creci_validated).';

COMMENT ON COLUMN leads.lead_type IS
  'Epic 7: tipo do lead. Enum: FISBO, IMOB, CONSTR, ADM, PJ_HOLD, UNKNOWN.';
