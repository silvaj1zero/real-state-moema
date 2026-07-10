-- Story 8.7 (mapa + revisão humana) — fn_comparaveis_no_raio expõe coordenadas e
-- link do anúncio. TAMBÉM CORRIGE BUG DE PRODUÇÃO: a versão viva da RPC referencia
-- `ac.ano_referencia` (coluna inexistente — a tabela tem `data_referencia`), o que
-- quebrava a tela ACM ("column ac.ano_referencia does not exist"). Aqui mapeamos
-- ano_referencia := EXTRACT(YEAR FROM ac.data_referencia).
--
-- POR QUÊ:
--   1) MAPA: o app precisa de lat/lng por comparável para plotar os pins reais do
--      Top N (dourado Top3, laranja Top4-5, azul demais) no mapa estático dos PDFs.
--      Hoje a RPC só devolve `distancia_m` — sem coords não há pins fiéis.
--   2) REVISÃO HUMANA (Art. IV): cada comparável deve trazer o LINK do anúncio
--      quando ainda disponível (scraped_listings.url), para conferência humana e
--      checagem no processo. Sem link → o app exibe "sem link público / não
--      recuperável" (NUNCA um link inventado).
--
-- CREATE OR REPLACE FIEL: preserva a lógica PostGIS verbatim da
-- 20260615000004 (assinatura, filtro consultant_id, ST_DWithin, ORDER BY). As
-- únicas mudanças são 3 colunas novas no fim do RETURNS TABLE / SELECT:
--   latitude, longitude  ← ST_Y/ST_X das coordinates (geometry)
--   anuncio_url          ← scraped_listings.url via LEFT JOIN (NULL = off-market)
--
-- PENDENTE @data-engineer (Dara): validar nomes de coluna reais
--   (`acm_comparaveis.scraped_listing_id`, `scraped_listings.url`) contra a base
--   viva e APLICAR via SQL Editor (scaffold Supabase dessincronizado — mesmo
--   bloqueio das demais migrations ACM/ITBI). O swap roda em transação (DROP+CREATE):
--   se o CREATE falhar, o DROP reverte e a função antiga permanece. Após aplicar,
--   regenerar os tipos TS (ComparavelNoRaio ganha latitude/longitude/anuncio_url) e
--   mapear nos export sheets (hoje degradam para null).

DROP FUNCTION IF EXISTS public.fn_comparaveis_no_raio(double precision, double precision, uuid, integer);

CREATE FUNCTION public.fn_comparaveis_no_raio(
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
  -- Story 8.1 — campos da metodologia
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
  status_anuncio text,
  -- Story 8.7 — coordenadas (mapa) + link do anúncio (revisão humana)
  latitude double precision,
  longitude double precision,
  anuncio_url text
)
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT ac.id, ac.endereco, ac.area_m2, ac.preco, ac.preco_m2,
    ac.is_venda_real, ac.fonte,
    ST_Distance(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography),
    -- Story 8.1
    ac.area_construida_m2, ac.area_terreno_m2, ac.preco_m2_terreno,
    ac.dormitorios, ac.suites, ac.vagas,
    -- FIX: ano_referencia derivado de data_referencia (coluna ano_referencia não existe)
    ac.score, ac.sql_cadastral, EXTRACT(YEAR FROM ac.data_referencia)::smallint,
    ac.preco_pedido, ac.desagio_percent, ac.status_anuncio,
    -- Story 8.7 — coords (NULL-safe via ::geometry) + url do anúncio (LEFT JOIN)
    ST_Y(ac.coordinates::geometry) AS latitude,
    ST_X(ac.coordinates::geometry) AS longitude,
    sl.url AS anuncio_url
  FROM acm_comparaveis ac
  LEFT JOIN scraped_listings sl ON sl.id = ac.scraped_listing_id
  WHERE ac.consultant_id = p_consultant_id
    AND ST_DWithin(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio_metros)
  ORDER BY ST_Distance(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_comparaveis_no_raio(double precision, double precision, uuid, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_comparaveis_no_raio(double precision, double precision, uuid, integer) IS
  'Comparáveis ACM no raio do consultor. Story 8.1: campos da metodologia. Story 8.7: latitude/longitude (pins do mapa) + anuncio_url (revisão humana via scraped_listings). Lógica PostGIS preservada.';
