-- =============================================================================
-- MIGRATION 022: Epic 10 — Call list FISBO (status de tentativa de contato)
-- Story: 10.1 — Call list FISBO priorizada + status de tentativa de contato
-- Depends on: 002_epic2_methodology.sql (leads), 003_epic3_intelligence.sql (scraped_listings)
-- =============================================================================
--
-- DECISÃO @data-engineer (AC2):
--   O status de tentativa de contato mora em `leads`, NÃO em `scraped_listings`.
--   Motivo determinante: a RLS de `scraped_listings` é SELECT-only para usuários
--   `authenticated` (migration 20260414000001, seção 5.1 — system/cron table); o
--   client não pode fazer UPDATE nela. Já `leads` tem CRUD completo por
--   `consultant_id = auth.uid()`, é a entidade acionável do funil e não exige CRM
--   novo (Art. IV — reuso). A call list materializa o FISBO de `scraped_listings`
--   em `leads` na primeira interação de status (reusando o fluxo de captação
--   da Story 6.x), e a coluna `scraped_listing_id` abaixo dá o vínculo
--   determinístico (sobreposição de status + dedup), sem depender do soft-link
--   em `enrichment_data`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM: contato_status
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contato_status') THEN
    CREATE TYPE contato_status AS ENUM (
      'nao_contatado', 'atendeu', 'nao_atendeu', 'retornar', 'agendado', 'descartado'
    );
  END IF;
END$$;

-- -----------------------------------------------------------------------------
-- leads — colunas de status de tentativa de contato + vínculo com o anúncio FISBO
-- -----------------------------------------------------------------------------
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contato_status contato_status NOT NULL DEFAULT 'nao_contatado',
  ADD COLUMN IF NOT EXISTS contato_status_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contato_notas TEXT,
  ADD COLUMN IF NOT EXISTS scraped_listing_id UUID
    REFERENCES scraped_listings(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
-- Dedup: um lead por (consultor, anúncio FISBO) — evita captar o mesmo listing 2x.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_consultant_scraped_listing
  ON leads(consultant_id, scraped_listing_id)
  WHERE scraped_listing_id IS NOT NULL;

-- Filtro/ordenação da call list por status (AC4/AC7).
CREATE INDEX IF NOT EXISTS idx_leads_contato_status
  ON leads(consultant_id, contato_status);

-- -----------------------------------------------------------------------------
-- Comments — documentação inline (Supabase/PgAdmin)
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN leads.contato_status IS
  'Epic 10 (Story 10.1): resultado da tentativa de contato na call list FISBO. '
  'Enum: nao_contatado, atendeu, nao_atendeu, retornar, agendado, descartado.';
COMMENT ON COLUMN leads.contato_status_at IS
  'Epic 10 (Story 10.1): timestamp da última atualização de contato_status.';
COMMENT ON COLUMN leads.contato_notas IS
  'Epic 10 (Story 10.1): nota opcional registrada junto da tentativa de contato.';
COMMENT ON COLUMN leads.scraped_listing_id IS
  'Epic 10 (Story 10.1): vínculo determinístico com o anúncio FISBO de origem '
  '(scraped_listings) p/ sobreposição de status na call list e dedup de captação.';

-- =============================================================================
-- RLS: nenhuma policy nova necessária — `leads` já tem CRUD por consultant_id
-- (migration 20260414000001, seção 2.4). As novas colunas herdam as policies.
-- =============================================================================
