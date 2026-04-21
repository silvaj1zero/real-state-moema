-- UNBLOCK POSTGREST SCHEMA CACHE
-- Como rodar: Supabase Dashboard → SQL Editor → colar tudo → Run
-- URL: https://supabase.com/dashboard/project/hculsnvpyccnekfyficu/sql/new
--
-- Contexto: o schema cache do PostgREST está preso numa versão pre-Epic 6.
-- Não reconhece:
--   - tabela portal_searches
--   - tabela portal_search_results
--   - colunas novas em scraped_listings (nome_anunciante, telefone_anunciante, ...)
--   - função fn_scraped_listings_parametric
--
-- Estratégia: três passos em ordem, do mais leve para o mais agressivo.

-- ============================================================================
-- PASSO 1 — NOTIFY (tentativa leve)
-- ============================================================================
-- Envia sinal para PostgREST recarregar o schema. Normalmente instantâneo.

NOTIFY pgrst, 'reload schema';

-- Aguarde 5-10s, depois teste localmente:
--   curl -H "Authorization: Bearer $CRON_SECRET" \
--     https://real-state-moema.vercel.app/api/health/db
-- Se todos os checks voltarem ok=true, o cache destravou. FIM.


-- ============================================================================
-- PASSO 2 — Forçar invalidação via rebuild de dependência (se PASSO 1 falhar)
-- ============================================================================
-- Às vezes o PostgREST ignora NOTIFY se um mutex interno estiver preso.
-- Um comentário em tabela força o scanner a re-ler o schema.

COMMENT ON TABLE public.portal_searches IS 'Epic 6 — portal searches (cache refresh trigger)';
COMMENT ON TABLE public.portal_search_results IS 'Epic 6 — portal search results (cache refresh trigger)';
COMMENT ON TABLE public.scraped_listings IS 'Scraped listings from ZAP/OLX/VivaReal (cache refresh trigger)';

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Aguarde 10s e teste de novo o /api/health/db.


-- ============================================================================
-- PASSO 3 — Restart do PostgREST via dashboard (se PASSO 2 falhar)
-- ============================================================================
-- Não é SQL. No dashboard Supabase:
--   1. Project Settings → General → Restart project (ou Pause + Resume)
--   2. Aguardar 1-2 minutos (app fica offline durante restart)
--   3. Testar /api/health/db — deve voltar ok em todos os checks
--
-- ALTERNATIVA: abrir ticket no suporte Supabase (support@supabase.com) com:
--   - Project ref: hculsnvpyccnekfyficu
--   - Problema: "PostgREST schema cache stuck on outdated version.
--     NOTIFY pgrst 'reload schema' has no effect. New tables (portal_searches)
--     and columns (scraped_listings.nome_anunciante) are invisible via REST API.
--     Restart from dashboard does not resolve."


-- ============================================================================
-- BÔNUS — Validação completa via SQL
-- ============================================================================
-- Confirma que as tabelas e colunas realmente existem no banco (independente
-- do cache do PostgREST).

SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('portal_searches', 'portal_search_results')
 ORDER BY table_name;
-- Esperado: 2 linhas.

SELECT column_name
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'scraped_listings'
   AND column_name IN ('nome_anunciante', 'telefone_anunciante', 'email_anunciante', 'creci_anunciante')
 ORDER BY column_name;
-- Esperado: 4 linhas.

SELECT routine_name
  FROM information_schema.routines
 WHERE routine_schema = 'public'
   AND routine_name   = 'fn_scraped_listings_parametric';
-- Esperado: 1 linha.
