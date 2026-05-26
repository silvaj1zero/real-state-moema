-- =============================================================================
-- MIGRATION 021: Epic 7 — MercadoLivre schema fix bundle
-- Story: 7.4 — MercadoLivre crawler
-- Depends on: 003_epic3_intelligence.sql (scraped_listings), 008_epic7_schemas.sql,
--             011_epic7_cnpj_enrichment.sql (raw_data shape reference)
-- Ref: docs/sessions/HANDOFF-20260526-EPIC7-MVP-LOCAL.md (3 latent bugs)
-- Ref: docs/qa/gates/7.4-mercadolivre-crawler.yml (schema-vs-code coverage gap)
-- =============================================================================
--
-- Root cause (detectado 2026-05-26 via PoC local):
--   apps/crawlers/mercadolivre-imoveis/src/main.ts persistListing escreve em
--   colunas/enum que nao existiam em scraped_listings:
--     1. portal = 'mercadolivre' (enum portal_scraping nao tinha esse valor)
--     2. raw_data (coluna inexistente — payload original HTML/JSON-LD para debug)
--     3. cnpj_anunciante (coluna inexistente — input para Story 7.5 CNPJ pipeline)
--
-- Decisao (founder 2026-05-26): adicionar colunas (opcao A) ao inves de remover
-- writes do codigo (opcao B). Justificativa: raw_data preserva HTML/JSON-LD bruto
-- para debug forensico de drift de selector; cnpj_anunciante eh vital para o
-- pipeline CNPJ Story 7.5 (input da classify CNAE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Enum portal_scraping — ADD VALUE 'mercadolivre'
-- -----------------------------------------------------------------------------
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS eh idempotente desde PostgreSQL 12.
-- Pode rodar dentro de transacao desde que o novo valor nao seja usado na mesma
-- transacao. Esta migration so adiciona o valor — uso ocorre em runtime do crawler.

ALTER TYPE portal_scraping ADD VALUE IF NOT EXISTS 'mercadolivre';

-- -----------------------------------------------------------------------------
-- Step 2: scraped_listings — ADD COLUMN raw_data JSONB
-- -----------------------------------------------------------------------------
-- Stores raw HTML/JSON-LD payload extracted from listing page. Used by:
--   - Debug/forensics quando classify confidence < 0.7 (manual review queue)
--   - Reprocessing offline se parser drift requer re-extracao
--   - Audit trail para LGPD (origem do dado capturado)
--
-- Schema-flexible (JSONB) porque conteudo varia entre portais. Crawler decide
-- quais campos preservar (ex: telefone_anunciante mascarado, whatsapp link).

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::JSONB;

-- -----------------------------------------------------------------------------
-- Step 3: scraped_listings — ADD COLUMN cnpj_anunciante TEXT
-- -----------------------------------------------------------------------------
-- CNPJ do broker/imobiliaria extraido por parseDetail.ts (regex CNPJ_RE).
-- Input para Story 7.5 (CNAE lookup) — alimenta classification_signals com
-- dados Receita Federal (CNAE = atividade economica → confirma imobiliaria).
--
-- Sem CHECK constraint para validar formato (XX.XXX.XXX/XXXX-XX) porque
-- portals as vezes capturam parcialmente. Validation eh responsabilidade do
-- pipeline CNPJ (Story 7.5) que normaliza antes de lookup.

ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS cnpj_anunciante TEXT;

-- -----------------------------------------------------------------------------
-- Comments — documentacao inline para Supabase/PgAdmin
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN scraped_listings.raw_data IS
  'Epic 7 (Story 7.4): payload bruto JSONB extraido pelo crawler (HTML snippet, JSON-LD, telefone mascarado, whatsapp link). Preserva origem para debug/forensics/reprocessing. Default {} para retrocompatibilidade.';

COMMENT ON COLUMN scraped_listings.cnpj_anunciante IS
  'Epic 7 (Story 7.4): CNPJ extraido por parseDetail.ts (regex). Input para Story 7.5 CNAE lookup. Formato bruto (XX.XXX.XXX/XXXX-XX ou variantes); normalizacao na Story 7.5.';

-- -----------------------------------------------------------------------------
-- Index — raw_data nao precisa indexar (consulta forensica ad-hoc)
-- Index — cnpj_anunciante: consultado pela Story 7.5 enrichment + classify
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_scraped_cnpj_anunciante
  ON scraped_listings(cnpj_anunciante)
  WHERE cnpj_anunciante IS NOT NULL;
