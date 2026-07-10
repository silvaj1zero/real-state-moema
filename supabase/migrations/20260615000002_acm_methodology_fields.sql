-- Story 8.1 — Modelo de dados da metodologia ACM.
-- Estende acm_comparaveis com os campos que a metodologia (laudo Honduras) usa e
-- que o engine acm-imobiliario JÁ produz (schema canônico engine/src/schema.py),
-- mas hoje descarta no sink (colapsa em area_m2 / enfia SQL em notas).
--
-- AC0 (spike 2026-06-15) confirmou disponibilidade na fonte ITBI/IPTU:
--   area_terreno/construida, testada, ano_construcao, padrao, valor_venal, id_fonte.
--   dormitorios/suites/vagas vêm SÓ de anúncios (NULL p/ linhas puramente ITBI).
--
-- Idempotente (ADD COLUMN IF NOT EXISTS). NÃO aplicada ainda — ver
-- docs/runbooks/apply-itbi-enum-migration.md (mesmo bloqueio de credencial).
-- DDL é território @data-engineer; este arquivo é o draft do spike 8.1.

-- 1. Área construída × terreno (engine: area_construida_m2 / area_terreno_m2) --------
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS area_construida_m2 NUMERIC;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS area_terreno_m2    NUMERIC;

-- Backfill: o area_m2 legado representava (na prática do sink) a área construída,
-- com fallback p/ terreno. Copiamos p/ a coluna canônica; area_m2 fica como legado
-- por 1 release (depreciação) — consumidores migram p/ area_construida_m2 na 8.2.
UPDATE acm_comparaveis
   SET area_construida_m2 = area_m2
 WHERE area_construida_m2 IS NULL AND area_m2 IS NOT NULL;

-- 2. Atributos cadastrais ITBI/IPTU (engine: testada_m / ano_construcao / padrao / valor_venal)
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS testada_m       NUMERIC;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS ano_construcao  SMALLINT;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS padrao_iptu     SMALLINT
  CHECK (padrao_iptu IS NULL OR padrao_iptu BETWEEN 0 AND 5);  -- 0-5; 5 = superior
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS valor_venal     NUMERIC;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS tipo            TEXT;  -- Casa/Apto/...

-- 3. SQL cadastral estruturado (engine: id_fonte = Setor/Quadra/Lote do GeoSampa) ----
-- Hoje vai em notas como '[ITBI] SQL <sql>; <bairro>'. Promove a coluna própria.
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS sql_cadastral   TEXT;

-- 4. Programa (engine: só de anúncios; NULL p/ ITBI puro) ----------------------------
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS dormitorios SMALLINT;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS suites      SMALLINT;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS vagas       SMALLINT;

-- 5. Score (calculado na Story 8.2; persistência opcional) ---------------------------
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS score TEXT
  CHECK (score IS NULL OR score IN ('AAA','AA','A','B'));

-- 6. Anúncio: pedido vs. fechado / deságio medido (engine: match.py, quando recuperado)
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS preco_pedido   NUMERIC;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS desagio_percent NUMERIC;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS status_anuncio TEXT
  CHECK (status_anuncio IS NULL OR
         status_anuncio IN ('confirmado','parcial','off_market','nao_recuperavel'));

-- 7. R$/m² de terreno (derivado; útil ao efeito-escala) ------------------------------
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS preco_m2_terreno NUMERIC;
UPDATE acm_comparaveis
   SET preco_m2_terreno = ROUND(preco / area_terreno_m2, 2)
 WHERE preco_m2_terreno IS NULL AND area_terreno_m2 IS NOT NULL AND area_terreno_m2 > 0;

-- Índices p/ filtros da metodologia (Score, faixa de lote)
CREATE INDEX IF NOT EXISTS idx_acm_comparaveis_score        ON acm_comparaveis (score);
CREATE INDEX IF NOT EXISTS idx_acm_comparaveis_area_terreno ON acm_comparaveis (area_terreno_m2);

COMMENT ON COLUMN acm_comparaveis.padrao_iptu IS 'Padrão construtivo IPTU/PMSP 0-5 (5=superior). Input oficial de Score — Roadmap ACM Fase 2.2.';
COMMENT ON COLUMN acm_comparaveis.sql_cadastral IS 'Setor/Quadra/Lote (GeoSampa). Promovido de notas [ITBI]. Rastreabilidade da venda.';
