-- Story 7.13 — coluna publisher_type em scraped_listings
--
-- Sinal nativo deterministico do anunciante (campo `publisherType` dos
-- feeds ZAP/VivaReal, backend Glue API da OLX). Supera a heuristica
-- 4-signal quando presente (ver Story 7.11 + ADR-EPIC7-004). NULL para
-- fontes que nao expoem o campo (ex.: MercadoLivre).
--
-- NOTA: scaffold Supabase dessincronizado (handoff 2026-06-15). Aplicar
-- via SQL Editor do projeto, OU `--workdir` + `migration repair`.
-- Ver docs/runbooks/apply-itbi-enum-migration.md.

ALTER TABLE public.scraped_listings
  ADD COLUMN IF NOT EXISTS publisher_type text
    CHECK (publisher_type IN ('owner', 'agency', 'developer'));

COMMENT ON COLUMN public.scraped_listings.publisher_type IS
  'Story 7.13 — publisherType nativo (owner|agency|developer) de ZAP/VivaReal. NULL se a fonte nao expoe o campo. Sinal deterministico que supera a heuristica 4-signal no classifyAdvertiser.';
