-- =============================================================================
-- MIGRATION 023: Story 6.6 — Lookup de Proprietario via Cartorio (Infosimples/ARISP)
-- Depends on: 001_base_foundation.sql (edificios), 003_epic3_intelligence.sql
--             (intelligence_feed), 20260414000001_rls_policies.sql
-- =============================================================================
--
-- NOTA DE FRONTEIRA (decisao do plano 2026-07-08):
--   Esta story foi implementada ATE a fronteira da API paga (Infosimples).
--   O schema abaixo esta completo, mas a ativacao real da consulta depende de
--   OWNER_LOOKUP_ENABLED=true + INFOSIMPLES_TOKEN no ambiente (decisao de
--   custo do founder). Sem a flag, o endpoint responde 503 sem consumir nada.
--
-- DECISAO DE SCHEMA (AC2, ajuste consciente):
--   `edificio_id` e NULLABLE — o AC1 admite a variante de body
--   `{ sql_lote, endereco }` sem edificio cadastrado; nesse caso o cache e o
--   dedup usam `sql_lote`. Quando `edificio_id` existe, ele e a chave de cache.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela: owner_lookups (AC2)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owner_lookups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edificio_id       UUID REFERENCES edificios(id) ON DELETE CASCADE,
  sql_lote          TEXT,
  endereco          TEXT,
  matricula         TEXT,
  nome_proprietario TEXT,
  cpf_cnpj_masked   TEXT,
  cartorio          TEXT,
  data_matricula    DATE,
  ultima_transacao  DATE,
  fonte             TEXT NOT NULL DEFAULT 'infosimples',
  custo_brl         NUMERIC(6,2) NOT NULL DEFAULT 0,
  raw_response      JSONB,
  status            TEXT NOT NULL CHECK (status IN ('pending','success','failed','not_found')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedup: uma matricula por edificio (NULLs nao colidem — parcial).
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_lookups_edificio_matricula
  ON owner_lookups(edificio_id, matricula)
  WHERE edificio_id IS NOT NULL AND matricula IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_owner_lookups_consultant
  ON owner_lookups(consultant_id);
CREATE INDEX IF NOT EXISTS idx_owner_lookups_edificio
  ON owner_lookups(edificio_id);
CREATE INDEX IF NOT EXISTS idx_owner_lookups_created
  ON owner_lookups(created_at DESC);
-- Cache de 90 dias (AC6): busca por (edificio, success) recente.
CREATE INDEX IF NOT EXISTS idx_owner_lookups_edificio_success
  ON owner_lookups(edificio_id, status)
  WHERE status = 'success';
-- Cache p/ variante sem edificio: por sql_lote.
CREATE INDEX IF NOT EXISTS idx_owner_lookups_sql_lote_success
  ON owner_lookups(sql_lote, status)
  WHERE sql_lote IS NOT NULL AND status = 'success';

COMMENT ON TABLE owner_lookups IS
  'Story 6.6: resultado de consultas de proprietario via cartorio '
  '(Infosimples/ARISP). Cache de 90 dias por edificio/sql_lote. '
  'cpf_cnpj_masked NUNCA contem o documento completo (LGPD, AC10).';
COMMENT ON COLUMN owner_lookups.custo_brl IS
  'Custo da consulta em BRL (0.28 em 2026). 0 para cache hit / not_found.';
COMMENT ON COLUMN owner_lookups.cpf_cnpj_masked IS
  'Apenas mascara ***.***.***-XX (ultimos 2 digitos). AC10 LGPD.';

-- -----------------------------------------------------------------------------
-- updated_at trigger (padrao do projeto: funcao inline por tabela)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_owner_lookups_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_owner_lookups_updated_at ON owner_lookups;
CREATE TRIGGER trg_owner_lookups_updated_at
  BEFORE UPDATE ON owner_lookups
  FOR EACH ROW EXECUTE FUNCTION fn_owner_lookups_touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS (AC3): tenant-isolated — CRUD proprio por consultant_id
-- -----------------------------------------------------------------------------
ALTER TABLE owner_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_lookups_select_own"
  ON owner_lookups FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "owner_lookups_insert_own"
  ON owner_lookups FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "owner_lookups_update_own"
  ON owner_lookups FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "owner_lookups_delete_own"
  ON owner_lookups FOR DELETE
  USING (consultant_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON owner_lookups TO authenticated;
GRANT ALL ON owner_lookups TO service_role;

-- -----------------------------------------------------------------------------
-- RPC: fn_check_owner_lookup_rate_limit (AC4)
--   Retorna o consumo da ultima 1h do consultor: {count, oldest_at}.
--   SECURITY INVOKER — RLS restringe ao proprio consultor de qualquer forma.
--   O limite (default 30/h) e comparado no endpoint (env OWNER_LOOKUP_RATE_LIMIT).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_owner_lookup_rate_limit(p_consultant_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'oldest_at', MIN(created_at)
  )
  FROM owner_lookups
  WHERE consultant_id = p_consultant_id
    AND created_at > now() - interval '1 hour';
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION fn_check_owner_lookup_rate_limit(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: fn_anonimize_owner_lookup (AC10 — LGPD "esquecer dados")
--   SECURITY INVOKER: o UPDATE passa pela RLS, so o consultor dono anonimiza.
--   Retorna TRUE se a linha foi encontrada/anonimizada.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_anonimize_owner_lookup(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  UPDATE owner_lookups
  SET
    nome_proprietario = NULL,
    matricula = NULL,
    cpf_cnpj_masked = NULL,
    raw_response = NULL,
    error_message = 'anonimizado a pedido do titular (LGPD)',
    updated_at = now()
  WHERE id = p_id;
  GET DIAGNOSTICS v_found = ROW_COUNT;
  RETURN v_found;
END;
$$ LANGUAGE plpgsql VOLATILE;

GRANT EXECUTE ON FUNCTION fn_anonimize_owner_lookup(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- intelligence_feed: novo tipo de evento (AC9)
-- -----------------------------------------------------------------------------
ALTER TYPE tipo_feed ADD VALUE IF NOT EXISTS 'owner_lookup_completo';
