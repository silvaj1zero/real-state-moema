-- Hardening: SET search_path explícito nas funções PL/pgSQL
--
-- Por que: funções SECURITY DEFINER (ou invocadas com privilégios elevados)
-- são vulneráveis a "search_path hijacking" — um role atacante pode criar
-- objetos num schema priority-ordered antes de 'public' e sequestrar o
-- resolvement de nomes (ex: criar uma tabela "scraped_listings" falsa).
--
-- Mitigação: fixar search_path na definição da função. Boa prática de
-- segurança recomendada pelo Supabase Security Advisor.
--
-- Como rodar: SQL Editor → colar → Run. Idempotente.

ALTER FUNCTION public.fn_scraped_listings_parametric(
  DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER, INTEGER,
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT[], BOOLEAN, TEXT, INTEGER
) SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_anonimize_contact_data(UUID)
  SET search_path = public, pg_temp;

-- Verificação: lista funções do schema public com search_path configurado
SELECT n.nspname AS schema,
       p.proname AS function,
       pg_get_function_arguments(p.oid) AS args,
       p.proconfig AS config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('fn_scraped_listings_parametric', 'fn_anonimize_contact_data');
-- Esperado: ambas com proconfig contendo 'search_path=public, pg_temp'.
