-- Story 9.4 — fn_comparaveis_no_raio passa a expor os campos do contrato do sink
-- (SPEC-EXEC-STORY-9.4-CROSS-REPO.md §RPC). Motivações:
--
--   1) R5 in-app: `complemento`/`uso_iptu`/`fracao_ideal`/`tipo` habilitam
--      `classificarTipologia` sobre dado de guia (não heurística) — ComparavelNoRaio
--      já declara os campos opt-in (types.ts, Story 9.17).
--   2) Homogeneização FipeZap (achado 9.23, 10-Jul): a RPC não expunha
--      `data_venda` — TODOS os comparáveis in-app caíam em `semAjuste`. Como
--      `data_referencia` está 100% preenchida nas linhas ITBI (verificado em PROD
--      11-Jul: 3.658/3.658, 2023-11→2026-05), expomos `data_venda := data_referencia`
--      SEM coluna nova (evita divergência de duas datas com o mesmo significado).
--   3) AC1 da story: `padrao_iptu`, `ano_construcao`, `testada_m`, `valor_venal`,
--      `tipo` já existem como colunas (migration 20260615000002) mas não saíam na RPC.
--   4) `bairro_real` (migration 20260711000001) — composição por bairro (9.11).
--
-- TRAP 42P13: mudar RETURNS TABLE exige DROP FUNCTION + CREATE + re-GRANT
-- (CREATE OR REPLACE falha com "cannot change return type"). Precedente:
-- migrations 20260615000004 / 20260616000001. O swap roda em transação: se o
-- CREATE falhar, o DROP reverte e a função antiga permanece.
--
-- Lógica PostGIS preservada VERBATIM da 20260616000001 (conferida contra
-- pg_get_functiondef do PROD em 11-Jul). Únicas mudanças: 10 colunas novas no
-- fim do RETURNS TABLE / SELECT — aditivas; consumidores atuais (8.2/9.2/9.3)
-- não mudam de comportamento (AC5).
--
-- Aplicação: Management API / SQL Editor (NUNCA `db push` — runbook
-- docs/runbooks/apply-itbi-enum-migration.md).

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
  anuncio_url text,
  -- Story 9.4 — AC1 (colunas 8.1 que faltavam na RPC; padrao_iptu virou TEXT na 20260711000001)
  padrao_iptu text,
  tipo text,
  ano_construcao smallint,
  testada_m numeric,
  valor_venal numeric,
  -- Story 9.4 — ampliação R5 (migration 20260711000001)
  complemento text,
  uso_iptu text,
  fracao_ideal numeric,
  bairro_real text,
  -- Story 9.4 — homogeneização FipeZap (9.23): competência da venda
  data_venda date
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
    -- ano_referencia derivado de data_referencia (coluna ano_referencia não existe)
    ac.score, ac.sql_cadastral, EXTRACT(YEAR FROM ac.data_referencia)::smallint,
    ac.preco_pedido, ac.desagio_percent, ac.status_anuncio,
    -- Story 8.7 — coords (NULL-safe via ::geometry) + url do anúncio (LEFT JOIN)
    ST_Y(ac.coordinates::geometry) AS latitude,
    ST_X(ac.coordinates::geometry) AS longitude,
    sl.url AS anuncio_url,
    -- Story 9.4 — AC1 + ampliação R5 + data_venda
    ac.padrao_iptu, ac.tipo, ac.ano_construcao, ac.testada_m, ac.valor_venal,
    ac.complemento, ac.uso_iptu, ac.fracao_ideal, ac.bairro_real,
    ac.data_referencia AS data_venda
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
  'Comparáveis ACM no raio do consultor. 8.1: metodologia. 8.7: coords + anuncio_url. 9.4: padrao_iptu/tipo/ano_construcao/testada_m/valor_venal + R5 (complemento/uso_iptu/fracao_ideal/bairro_real) + data_venda (homogeneização 9.23). Lógica PostGIS preservada.';
