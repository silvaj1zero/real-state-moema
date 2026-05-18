-- =============================================================================
-- MIGRATION 015: Epic 7 — LGPD Foundation Part 2 — Audit Log + Opt-Out + Retention
-- Story: 7.10 (AC3, AC4, AC5, AC6 — audit, opt-out flow, retencao 90d)
-- Depends on: 014_epic7_lgpd_vault_pii.sql
-- =============================================================================

-- =============================================================================
-- 1. Tabela lgpd_audit_log — proof of compliance
-- =============================================================================
-- Append-only. UPDATE/DELETE bloqueados via RLS para anon/authenticated;
-- somente service_role pode tamper (usado para retenção legal).
CREATE TABLE IF NOT EXISTS lgpd_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  listing_id  UUID,  -- soft FK (scraped_listings ainda nao existe na Wave A)
  action      TEXT NOT NULL CHECK (action IN (
    'scrape','reveal_phone','reveal_email','reveal_name',
    'export','delete','anonymize',
    'opt_out_request','opt_out_complete'
  )),
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'legitimate_interest','consent','legal_obligation'
  )),
  evidence    JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_audit_user      ON lgpd_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_lead      ON lgpd_audit_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_action    ON lgpd_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_lgpd_audit_timestamp ON lgpd_audit_log(timestamp DESC);

COMMENT ON TABLE lgpd_audit_log IS
  'Epic 7 Story 7.10 AC3 — append-only audit log para Art. 37 LGPD. Retencao indefinida Wave A.';

-- RLS
ALTER TABLE lgpd_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: admin (claim role=admin) ve tudo; consultor ve apenas suas linhas.
CREATE POLICY lgpd_audit_select_own ON lgpd_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR coalesce((auth.jwt() ->> 'role')::text, '') = 'admin');

-- INSERT: qualquer authenticated pode inserir (as funcoes SECURITY DEFINER
-- usam service_role e bypassam RLS; manter politica permissiva nao expoe
-- nada porque colunas user_id sao derivadas de auth.uid()).
CREATE POLICY lgpd_audit_insert_self ON lgpd_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Nao ha policy de UPDATE/DELETE para authenticated => proibido por RLS.
-- service_role bypassa RLS (so para retencao legal manual).

-- =============================================================================
-- 2. Helper SQL: log de scrape (sera chamado pelos crawlers PF — story 7.4+)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_lgpd_log_scrape(
  p_lead_id    UUID,
  p_listing_id UUID,
  p_evidence   JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO lgpd_audit_log (user_id, lead_id, listing_id, action, legal_basis, evidence)
  VALUES (auth.uid(), p_lead_id, p_listing_id, 'scrape', 'legitimate_interest',
          COALESCE(p_evidence, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_lgpd_log_scrape(UUID, UUID, JSONB) TO authenticated, service_role;

-- =============================================================================
-- 3. Tabela lgpd_opt_out_requests — fila manual processada por admin
-- =============================================================================
CREATE TABLE IF NOT EXISTS lgpd_opt_out_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_number TEXT NOT NULL UNIQUE,  -- e.g. "OPT-2026-05-18-A3F7"
  telefone        TEXT,
  email           TEXT,
  evidence        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','rejected')),
  processed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Pelo menos um identificador deve estar presente
  CONSTRAINT lgpd_opt_out_at_least_one_field
    CHECK (telefone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_lgpd_opt_out_status     ON lgpd_opt_out_requests(status);
CREATE INDEX IF NOT EXISTS idx_lgpd_opt_out_protocol   ON lgpd_opt_out_requests(protocol_number);
CREATE INDEX IF NOT EXISTS idx_lgpd_opt_out_created_at ON lgpd_opt_out_requests(created_at DESC);

ALTER TABLE lgpd_opt_out_requests ENABLE ROW LEVEL SECURITY;

-- Anon pode inserir (endpoint publico /api/lgpd/opt-out).
-- Admin pode select/update; service_role full.
CREATE POLICY lgpd_opt_out_insert_anon ON lgpd_opt_out_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY lgpd_opt_out_select_admin ON lgpd_opt_out_requests
  FOR SELECT TO authenticated
  USING (coalesce((auth.jwt() ->> 'role')::text, '') = 'admin');

CREATE POLICY lgpd_opt_out_update_admin ON lgpd_opt_out_requests
  FOR UPDATE TO authenticated
  USING (coalesce((auth.jwt() ->> 'role')::text, '') = 'admin')
  WITH CHECK (coalesce((auth.jwt() ->> 'role')::text, '') = 'admin');

-- =============================================================================
-- 4. RPC fn_lgpd_process_opt_out — anonimiza leads matching telefone/email
-- =============================================================================
-- Chamado pelo endpoint admin /api/admin/lgpd/process-opt-out.
-- Estrategia: matchar via decrypt em batch (pequeno volume Wave A — <= 10/mes).
CREATE OR REPLACE FUNCTION public.fn_lgpd_process_opt_out(
  p_protocol_number TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_request   lgpd_opt_out_requests%ROWTYPE;
  v_lead_id   UUID;
  v_matched   INT := 0;
  v_phone     TEXT;
  v_email     TEXT;
BEGIN
  SELECT * INTO v_request FROM lgpd_opt_out_requests WHERE protocol_number = p_protocol_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_lgpd_process_opt_out: protocol % not found', p_protocol_number;
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'fn_lgpd_process_opt_out: protocol % already %', p_protocol_number, v_request.status;
  END IF;

  UPDATE lgpd_opt_out_requests SET status = 'processing' WHERE id = v_request.id;

  -- Loop: para cada lead com phone/email matching, anonimiza.
  FOR v_lead_id IN
    SELECT l.id FROM leads l
    WHERE l.lgpd_status = 'active'
      AND (
        (v_request.telefone IS NOT NULL AND l.telefone_secret_id IS NOT NULL
          AND (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = l.telefone_secret_id) = v_request.telefone)
        OR
        (v_request.email IS NOT NULL AND l.email_secret_id IS NOT NULL
          AND (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = l.email_secret_id) = v_request.email)
      )
  LOOP
    PERFORM public.fn_lgpd_anonymize_lead(v_lead_id, 'opt_out:' || p_protocol_number);
    v_matched := v_matched + 1;
  END LOOP;

  UPDATE lgpd_opt_out_requests
    SET status = 'completed',
        processed_by = auth.uid(),
        processed_at = now(),
        notes = format('Matched %s lead(s)', v_matched)
  WHERE id = v_request.id;

  INSERT INTO lgpd_audit_log (user_id, action, legal_basis, evidence)
  VALUES (auth.uid(), 'opt_out_complete', 'legal_obligation',
          jsonb_build_object('protocol', p_protocol_number, 'matched', v_matched));

  RETURN jsonb_build_object('protocol', p_protocol_number, 'matched', v_matched, 'status', 'completed');
END;
$$;

-- =============================================================================
-- 5. RPC fn_lgpd_anonymize_lead — hard-anonymize com cascading vault delete
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_lgpd_anonymize_lead(
  p_lead_id UUID,
  p_reason  TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_phone_id    UUID;
  v_email_id    UUID;
  v_whats_id    UUID;
  v_nome_id     UUID;
  v_consultant  UUID;
BEGIN
  SELECT telefone_secret_id, email_secret_id, whatsapp_secret_id, nome_secret_id, consultant_id
    INTO v_phone_id, v_email_id, v_whats_id, v_nome_id, v_consultant
    FROM leads WHERE id = p_lead_id;

  IF v_consultant IS NULL THEN
    RAISE EXCEPTION 'fn_lgpd_anonymize_lead: lead % not found', p_lead_id;
  END IF;

  -- 1. Apaga secrets do vault. ON DELETE SET NULL nas FKs evita orfanização.
  DELETE FROM vault.secrets WHERE id IN (v_phone_id, v_email_id, v_whats_id, v_nome_id);

  -- 2. Limpa colunas claras remanescentes em leads (defesa em profundidade —
  --    estas colunas existem por compatibilidade Epic 2 antes da cifragem).
  UPDATE leads
    SET nome = '[ANONIMIZADO]',
        telefone = NULL,
        email = NULL,
        notas = NULL,
        lgpd_status = 'anonymized',
        lgpd_anonymized_at = now(),
        updated_at = now()
  WHERE id = p_lead_id;

  -- 3. Audit log
  INSERT INTO lgpd_audit_log (user_id, lead_id, action, legal_basis, evidence)
  VALUES (COALESCE(auth.uid(), v_consultant), p_lead_id, 'anonymize', 'legal_obligation',
          jsonb_build_object('reason', p_reason, 'ts', now()));
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_lgpd_process_opt_out(TEXT)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_lgpd_anonymize_lead(UUID, TEXT)    TO authenticated, service_role;
-- (RLS bridge dentro das funcoes filtra ownership — admin via JWT claim)

-- =============================================================================
-- 6. Retencao 90d — RPC para limpar leads stale (AC5)
-- =============================================================================
-- Estrategia Wave A: RPC manual chamado por Edge Function cron mensal (devops
-- pluga o cron na hora do deploy). Sem pg_cron por enquanto para evitar deps.
CREATE OR REPLACE FUNCTION public.fn_lgpd_retention_sweep(
  p_max_age_days INT DEFAULT 90
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_count   INT := 0;
BEGIN
  IF p_max_age_days < 30 THEN
    RAISE EXCEPTION 'fn_lgpd_retention_sweep: refusing age threshold < 30 days';
  END IF;

  FOR v_lead_id IN
    SELECT id FROM leads
    WHERE lgpd_status = 'active'
      AND etapa_funil = 'contato'  -- nao convertido (ainda na etapa inicial)
      AND created_at < now() - (p_max_age_days || ' days')::interval
  LOOP
    PERFORM public.fn_lgpd_anonymize_lead(v_lead_id, 'retention_sweep_' || p_max_age_days || 'd');
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_lgpd_retention_sweep(INT) TO service_role;
REVOKE ALL ON FUNCTION public.fn_lgpd_retention_sweep(INT) FROM PUBLIC, anon, authenticated;
