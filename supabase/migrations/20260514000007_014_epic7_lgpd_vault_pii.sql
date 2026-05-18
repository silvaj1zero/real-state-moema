-- =============================================================================
-- MIGRATION 014: Epic 7 — LGPD Foundation Part 1 — Vault PII Cifragem
-- Story: 7.10 (AC2 — cifragem PII em repouso via Supabase Vault)
-- Depends on: 002_epic2_methodology.sql (table leads), 006_epic6_parametric_search.sql
-- LIA: docs/legal/lia-epic7.md (Art. 7º IX LGPD — interesse legítimo)
-- Vault availability: docs/poc/7.10-vault-availability-check.md (supabase_vault 0.3.1)
-- =============================================================================
-- DESIGN
-- - PII bruta NUNCA reside em colunas claras de `leads`. Em vez disso, cada
--   campo PII tem uma coluna `*_secret_id UUID REFERENCES vault.secrets(id)`.
-- - Write path: app code -> RPC SECURITY DEFINER `fn_store_lead_pii` que chama
--   `vault.create_secret` e armazena o UUID retornado em `leads`.
-- - Read path: app code -> RPC SECURITY DEFINER `fn_decrypt_lead_pii` que (a)
--   passa pela RLS de `leads` para garantir que o caller pode ver o lead, (b)
--   resolve o secret via `vault.decrypted_secrets`, (c) registra audit log.
-- - `anon` NUNCA recebe grant em vault.decrypted_secrets. Só service_role/
--   authenticated via RPCs definidas aqui.
-- =============================================================================

-- Pre-requisito: extensão deve estar instalada (já está em prod conforme PoC).
-- Em ambiente local de teste, isso garante idempotência.
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- =============================================================================
-- 1. ALTER leads — adicionar colunas de secret_id (FKs para vault.secrets)
-- =============================================================================
-- Nullable porque (a) leads pre-existentes não tem secrets, (b) nem todo lead
-- captura todos os campos PII (e-mail é opcional, etc.). ON DELETE SET NULL
-- evita orfanização em caso de rotação manual de secrets via vault.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS telefone_secret_id  UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_secret_id     UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_secret_id  UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nome_secret_id      UUID REFERENCES vault.secrets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lgpd_status         TEXT NOT NULL DEFAULT 'active'
    CHECK (lgpd_status IN ('active', 'opted_out', 'anonymized')),
  ADD COLUMN IF NOT EXISTS lgpd_anonymized_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_lgpd_status ON leads(lgpd_status);

-- =============================================================================
-- 2. RPC: fn_store_lead_pii — escreve PII cifrada no vault e retorna o UUID
-- =============================================================================
-- SECURITY DEFINER porque o caller (role authenticated) NÃO tem grant em
-- vault.create_secret. A função roda como owner (postgres) e devolve apenas o
-- UUID do secret — o plaintext sai do escopo imediatamente após o RPC.
CREATE OR REPLACE FUNCTION public.fn_store_lead_pii(
  p_lead_id   UUID,
  p_field     TEXT,         -- 'telefone' | 'email' | 'whatsapp' | 'nome'
  p_plaintext TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id    UUID;
  v_secret_name  TEXT;
  v_consultant   UUID;
BEGIN
  -- Validation
  IF p_lead_id IS NULL OR p_plaintext IS NULL OR length(p_plaintext) = 0 THEN
    RAISE EXCEPTION 'fn_store_lead_pii: lead_id and plaintext are required';
  END IF;
  IF p_field NOT IN ('telefone','email','whatsapp','nome') THEN
    RAISE EXCEPTION 'fn_store_lead_pii: invalid field %', p_field;
  END IF;

  -- RLS bridge: garantir que o caller é dono do lead OU service_role.
  -- SECURITY DEFINER bypassa RLS, então cheque explicitamente aqui.
  SELECT consultant_id INTO v_consultant FROM public.leads WHERE id = p_lead_id;
  IF v_consultant IS NULL THEN
    RAISE EXCEPTION 'fn_store_lead_pii: lead % not found', p_lead_id;
  END IF;
  IF auth.role() = 'authenticated' AND v_consultant <> auth.uid() THEN
    RAISE EXCEPTION 'fn_store_lead_pii: lead does not belong to caller';
  END IF;

  -- Naming convention: lead_{field}_{leadId} — facilita auditoria via vault.
  v_secret_name := 'lead_' || p_field || '_' || p_lead_id::text;

  -- Idempotência: se já existe secret para este lead+field, atualiza.
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_secret_name;
  IF v_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_secret_id, p_plaintext);
  ELSE
    v_secret_id := vault.create_secret(p_plaintext, v_secret_name,
      'Epic 7 LGPD — lead PII (' || p_field || ') — LIA Art. 7º IX');
  END IF;

  -- Persiste FK na linha do lead.
  EXECUTE format('UPDATE public.leads SET %I = $1, updated_at = now() WHERE id = $2',
                 p_field || '_secret_id')
    USING v_secret_id, p_lead_id;

  RETURN v_secret_id;
END;
$$;

COMMENT ON FUNCTION public.fn_store_lead_pii IS
  'Epic 7 Story 7.10 AC2 — cifra PII de lead no Supabase Vault, retorna secret_id. SECURITY DEFINER + RLS bridge manual.';

-- =============================================================================
-- 3. RPC: fn_decrypt_lead_pii — decifra um campo PII e registra audit log
-- =============================================================================
-- Este é o ÚNICO caminho legítimo de revelar PII para a aplicação. Cada chamada
-- gera uma linha em lgpd_audit_log (migration 015), garantindo proof of access.
CREATE OR REPLACE FUNCTION public.fn_decrypt_lead_pii(
  p_lead_id  UUID,
  p_field    TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id   UUID;
  v_plaintext   TEXT;
  v_consultant  UUID;
  v_status      TEXT;
BEGIN
  IF p_field NOT IN ('telefone','email','whatsapp','nome') THEN
    RAISE EXCEPTION 'fn_decrypt_lead_pii: invalid field %', p_field;
  END IF;

  -- RLS bridge
  SELECT consultant_id, lgpd_status INTO v_consultant, v_status
  FROM public.leads WHERE id = p_lead_id;

  IF v_consultant IS NULL THEN
    RAISE EXCEPTION 'fn_decrypt_lead_pii: lead % not found', p_lead_id;
  END IF;
  IF auth.role() = 'authenticated' AND v_consultant <> auth.uid() THEN
    RAISE EXCEPTION 'fn_decrypt_lead_pii: lead does not belong to caller';
  END IF;
  IF v_status <> 'active' THEN
    -- LGPD: titular optou-out ou foi anonimizado. Nunca decifrar.
    RAISE EXCEPTION 'fn_decrypt_lead_pii: lead is % — PII decryption blocked', v_status;
  END IF;

  EXECUTE format('SELECT %I FROM public.leads WHERE id = $1', p_field || '_secret_id')
    INTO v_secret_id USING p_lead_id;

  IF v_secret_id IS NULL THEN
    RETURN NULL; -- campo nunca foi capturado para este lead
  END IF;

  SELECT decrypted_secret INTO v_plaintext
  FROM vault.decrypted_secrets WHERE id = v_secret_id;

  -- Audit log: registrar acesso. Insert direto na tabela criada em 015.
  -- Esta tabela ainda não existe quando esta migration roda; usar bloco
  -- condicional para evitar erro durante a primeira aplicação.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lgpd_audit_log'
  ) THEN
    INSERT INTO public.lgpd_audit_log (
      user_id, lead_id, action, legal_basis, evidence
    ) VALUES (
      COALESCE(auth.uid(), v_consultant),
      p_lead_id,
      CASE p_field
        WHEN 'telefone' THEN 'reveal_phone'
        WHEN 'whatsapp' THEN 'reveal_phone'
        WHEN 'email'    THEN 'reveal_email'
        ELSE 'reveal_name'
      END,
      'legitimate_interest',
      jsonb_build_object('field', p_field, 'lead_id', p_lead_id, 'ts', now())
    );
  END IF;

  RETURN v_plaintext;
END;
$$;

COMMENT ON FUNCTION public.fn_decrypt_lead_pii IS
  'Epic 7 Story 7.10 AC2/AC4 — decifra PII e registra audit log. ÚNICO caminho legítimo de leitura.';

-- =============================================================================
-- 4. Grants — quem pode chamar
-- =============================================================================
-- Bloqueia anon. Authenticated pode chamar (RLS bridge interno filtra ownership).
-- service_role já tem tudo por padrão.
REVOKE ALL ON FUNCTION public.fn_store_lead_pii(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_decrypt_lead_pii(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_store_lead_pii(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_decrypt_lead_pii(UUID, TEXT) TO authenticated, service_role;

-- vault.decrypted_secrets: explicitamente NÃO grantear a authenticated/anon.
-- Toda decifragem passa pela função acima.
REVOKE ALL ON vault.decrypted_secrets FROM PUBLIC, anon, authenticated;
