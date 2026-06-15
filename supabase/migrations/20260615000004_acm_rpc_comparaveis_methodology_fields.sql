-- Story 8.1 (AC2) — fn_comparaveis_no_raio retorna os campos da metodologia ACM.
--
-- CREATE OR REPLACE FIEL: a lógica PostGIS (assinatura lat/lng, filtro
-- consultant_id, ST_DWithin, ORDER BY ST_Distance) é preservada VERBATIM da
-- definição viva (capturada via pg_get_functiondef 2026-06-15). As únicas
-- mudanças são as colunas novas anexadas ao final do RETURNS TABLE e do
-- SELECT (mapeamento posicional preservado) — as colunas vêm da migration
-- 20260615000002_acm_methodology_fields.sql (já aplicada).
--
-- NOTA: aplicar via SQL Editor (scaffold Supabase dessincronizado — mesmo
-- bloqueio das migrations ITBI). A RPC alimenta a tela ACM em produção;
-- por ser CREATE OR REPLACE com a mesma assinatura, o swap é atômico e
-- retrocompatível (consumidores que ignoram as colunas novas seguem OK).

CREATE OR REPLACE FUNCTION public.fn_comparaveis_no_raio(
  p_lat double precision,
  p_lng double precision,
  p_consultant_id uuid,
  p_raio_metros integer DEFAULT 500
)
RETURNS TABLE(
  comparavel_id uuid,
  endereco text,
  area_m2 numeric,
  preco numeric,
  preco_m2 numeric,
  is_venda_real boolean,
  fonte fonte_comparavel,
  distancia_m double precision,
  -- Story 8.1 — campos da metodologia (anexados; ordem espelha o SELECT)
  area_construida_m2 numeric,
  area_terreno_m2 numeric,
  preco_m2_terreno numeric,
  dormitorios smallint,
  suites smallint,
  vagas smallint,
  score text,
  sql_cadastral text,
  ano_referencia smallint,
  preco_pedido numeric,
  desagio_percent numeric,
  status_anuncio text
)
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT ac.id, ac.endereco, ac.area_m2, ac.preco, ac.preco_m2,
    ac.is_venda_real, ac.fonte,
    ST_Distance(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography),
    -- Story 8.1 — colunas novas (NULL para linhas legadas / fontes sem o dado)
    ac.area_construida_m2, ac.area_terreno_m2, ac.preco_m2_terreno,
    ac.dormitorios, ac.suites, ac.vagas,
    ac.score, ac.sql_cadastral, ac.ano_referencia,
    ac.preco_pedido, ac.desagio_percent, ac.status_anuncio
  FROM acm_comparaveis ac
  WHERE ac.consultant_id = p_consultant_id
    AND ST_DWithin(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio_metros)
  ORDER BY ST_Distance(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
END;
$function$;

COMMENT ON FUNCTION public.fn_comparaveis_no_raio(double precision, double precision, uuid, integer) IS
  'Comparáveis ACM dentro de p_raio_metros de (p_lat,p_lng) do consultor. Story 8.1: retorna os campos da metodologia (construído×terreno, score, SQL cadastral, pedido/deságio). Lógica PostGIS preservada da versão viva.';
