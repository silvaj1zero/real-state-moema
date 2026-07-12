-- Story 9.4 (ampliação R5, 09-Jul) — colunas de ingestão que o sink do engine
-- `acm-imobiliario` passa a popular (SPEC-EXEC-STORY-9.4-CROSS-REPO.md §contrato).
-- Baseline 11-Jul (9.4-sink-coverage.mjs): estas colunas NÃO existiam em PROD.
--
--   complemento  — ex.: "AP 82" da guia ITBI. Causa-raiz do incidente casa×apto
--                  (Andrade Pertence, 09-Jul): sem ele, ~50% da amostra do proxy
--                  eram apartamentos classificados como casa. Consumidor: R5
--                  `classificarTipologia` (tipologia.ts).
--   uso_iptu     — Uso (IPTU) / descrição de uso. Consumidor: R5 casa×apto, Score.
--   fracao_ideal — fração ideal da guia. Consumidor: R5 heurística condominial,
--                  fração de terreno.
--   bairro_real  — bairro verificado via CEP (auditoria 03-Jul §3.1: laudo de
--                  referência rotulava 16/23 comparáveis com bairro incorreto).
--                  Consumidor: composição por bairro (9.11), índice C-3.
--
-- ADITIVA e anulável (zero quebra — design opt-in já implementado no app,
-- Stories 9.17/9.23). Colunas ficam NULL até o backfill do engine (sessão C).
-- Idempotente (ADD COLUMN IF NOT EXISTS). Aplicação: Management API / SQL Editor
-- (scaffold Supabase dessincronizado — NUNCA `db push`, ver
-- docs/runbooks/apply-itbi-enum-migration.md).

ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS complemento  TEXT;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS uso_iptu     TEXT;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS fracao_ideal NUMERIC;
ALTER TABLE acm_comparaveis ADD COLUMN IF NOT EXISTS bairro_real  TEXT;

-- Alinhamento padrao_iptu (9.4-sink-ac3-verification.md §1.3): a guia traz
-- "descrição do padrão" como RÓTULO TEXTUAL (42/46 amostras = tipologia, não
-- qualidade 0-5 — SPEC §contrato). A coluna era SMALLINT CHECK 0-5 (20260615000002)
-- e está 100% NULL em PROD (verificado 11-Jul) → widening seguro, zero dado perdido.
ALTER TABLE acm_comparaveis DROP CONSTRAINT IF EXISTS acm_comparaveis_padrao_iptu_check;
ALTER TABLE acm_comparaveis ALTER COLUMN padrao_iptu TYPE TEXT USING padrao_iptu::text;

COMMENT ON COLUMN acm_comparaveis.complemento  IS 'Complemento da guia ITBI (ex.: AP 82). Story 9.4 R5 — distinção casa×apto por construção.';
COMMENT ON COLUMN acm_comparaveis.uso_iptu     IS 'Uso/descrição de uso IPTU. Story 9.4 R5 — tipologia + Score.';
COMMENT ON COLUMN acm_comparaveis.fracao_ideal IS 'Fração ideal da guia ITBI. Story 9.4 R5 — heurística condominial e fração de terreno.';
COMMENT ON COLUMN acm_comparaveis.bairro_real  IS 'Bairro verificado via CEP. Story 9.4 — composição por bairro (9.11) e índice C-3.';
