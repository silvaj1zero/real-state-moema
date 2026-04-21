-- =============================================================================
-- APLICAR MIGRATION EPIC 6 (portal_searches, colunas de contato, RPC)
-- =============================================================================
-- As migrations do Epic 6 não foram aplicadas ao banco remoto (descoberto
-- em 2026-04-21 após a query de information_schema retornar zero linhas).
--
-- Este script é idempotente — pode rodar quantas vezes quiser.
-- Como rodar: SQL Editor → colar tudo → Run
-- =============================================================================

-- ENUM: search_status
DO $$ BEGIN
  CREATE TYPE search_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend tipo_feed
ALTER TYPE tipo_feed ADD VALUE IF NOT EXISTS 'busca_parametrica';

-- portal_searches
CREATE TABLE IF NOT EXISTS portal_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status search_status NOT NULL DEFAULT 'pending',
  search_params JSONB NOT NULL,
  portals TEXT[] NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  new_listings_count INTEGER NOT NULL DEFAULT 0,
  fisbo_count INTEGER NOT NULL DEFAULT 0,
  apify_run_ids JSONB,
  apify_cost_usd NUMERIC(8,4),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_searches_consultant ON portal_searches(consultant_id);
CREATE INDEX IF NOT EXISTS idx_portal_searches_created ON portal_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_searches_status ON portal_searches(status) WHERE status IN ('pending', 'running');

-- portal_search_results
CREATE TABLE IF NOT EXISTS portal_search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES portal_searches(id) ON DELETE CASCADE,
  scraped_listing_id UUID NOT NULL REFERENCES scraped_listings(id) ON DELETE CASCADE,
  is_new BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(search_id, scraped_listing_id)
);

CREATE INDEX IF NOT EXISTS idx_search_results_search ON portal_search_results(search_id);

-- scraped_listings — contact enrichment columns
ALTER TABLE scraped_listings
  ADD COLUMN IF NOT EXISTS nome_anunciante TEXT,
  ADD COLUMN IF NOT EXISTS telefone_anunciante TEXT,
  ADD COLUMN IF NOT EXISTS email_anunciante TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_anunciante TEXT,
  ADD COLUMN IF NOT EXISTS creci_anunciante TEXT,
  ADD COLUMN IF NOT EXISTS contact_enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lgpd_consent_origin TEXT;

-- RPC: fn_scraped_listings_parametric
CREATE OR REPLACE FUNCTION fn_scraped_listings_parametric(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_raio_metros INTEGER DEFAULT 2000,
  p_quartos_min INTEGER DEFAULT NULL,
  p_quartos_max INTEGER DEFAULT NULL,
  p_area_min NUMERIC DEFAULT NULL,
  p_area_max NUMERIC DEFAULT NULL,
  p_preco_min NUMERIC DEFAULT NULL,
  p_preco_max NUMERIC DEFAULT NULL,
  p_bairros TEXT[] DEFAULT NULL,
  p_fisbo_only BOOLEAN DEFAULT false,
  p_portal TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID, portal portal_scraping, external_id TEXT, url TEXT,
  tipo_anunciante tipo_anunciante, endereco TEXT, endereco_normalizado TEXT,
  bairro TEXT, preco NUMERIC, area_m2 NUMERIC, preco_m2 NUMERIC,
  tipologia TEXT, quartos INTEGER, descricao TEXT,
  is_fisbo BOOLEAN, is_active BOOLEAN,
  first_seen_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ, removed_at TIMESTAMPTZ,
  preco_anterior NUMERIC, matched_edificio_id UUID,
  match_method match_method, match_distance_m NUMERIC,
  nome_anunciante TEXT, telefone_anunciante TEXT, email_anunciante TEXT,
  whatsapp_anunciante TEXT, creci_anunciante TEXT,
  distancia_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id, sl.portal, sl.external_id, sl.url,
    sl.tipo_anunciante, sl.endereco, sl.endereco_normalizado,
    sl.bairro, sl.preco, sl.area_m2, sl.preco_m2,
    sl.tipologia, sl.quartos, sl.descricao,
    sl.is_fisbo, sl.is_active,
    sl.first_seen_at, sl.last_seen_at, sl.removed_at,
    sl.preco_anterior, sl.matched_edificio_id,
    sl.match_method, sl.match_distance_m,
    sl.nome_anunciante, sl.telefone_anunciante,
    sl.email_anunciante, sl.whatsapp_anunciante,
    sl.creci_anunciante,
    ST_Distance(
      sl.coordinates,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distancia_m
  FROM scraped_listings sl
  WHERE sl.is_active = true
    AND sl.coordinates IS NOT NULL
    AND ST_DWithin(sl.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio_metros)
    AND (p_quartos_min IS NULL OR sl.quartos >= p_quartos_min)
    AND (p_quartos_max IS NULL OR sl.quartos <= p_quartos_max)
    AND (p_area_min IS NULL OR sl.area_m2 >= p_area_min)
    AND (p_area_max IS NULL OR sl.area_m2 <= p_area_max)
    AND (p_preco_min IS NULL OR sl.preco >= p_preco_min)
    AND (p_preco_max IS NULL OR sl.preco <= p_preco_max)
    AND (p_bairros IS NULL OR sl.bairro = ANY(p_bairros))
    AND (p_fisbo_only = false OR sl.is_fisbo = true)
    AND (p_portal IS NULL OR sl.portal::TEXT = p_portal)
  ORDER BY distancia_m ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: fn_anonimize_contact_data (LGPD)
CREATE OR REPLACE FUNCTION fn_anonimize_contact_data(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE scraped_listings
  SET nome_anunciante = NULL, telefone_anunciante = NULL, email_anunciante = NULL,
      whatsapp_anunciante = NULL, creci_anunciante = NULL,
      contact_enriched_at = NULL, lgpd_consent_origin = NULL, updated_at = now()
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- RLS: portal_searches
ALTER TABLE portal_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_searches_select_own" ON portal_searches;
CREATE POLICY "portal_searches_select_own" ON portal_searches FOR SELECT USING (consultant_id = auth.uid());

DROP POLICY IF EXISTS "portal_searches_insert_own" ON portal_searches;
CREATE POLICY "portal_searches_insert_own" ON portal_searches FOR INSERT WITH CHECK (consultant_id = auth.uid());

DROP POLICY IF EXISTS "portal_searches_update_own" ON portal_searches;
CREATE POLICY "portal_searches_update_own" ON portal_searches FOR UPDATE USING (consultant_id = auth.uid()) WITH CHECK (consultant_id = auth.uid());

DROP POLICY IF EXISTS "portal_searches_delete_own" ON portal_searches;
CREATE POLICY "portal_searches_delete_own" ON portal_searches FOR DELETE USING (consultant_id = auth.uid());

-- RLS: portal_search_results
ALTER TABLE portal_search_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_search_results_select_via_search" ON portal_search_results;
CREATE POLICY "portal_search_results_select_via_search" ON portal_search_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM portal_searches ps WHERE ps.id = portal_search_results.search_id AND ps.consultant_id = auth.uid())
);

-- GRANT para roles REST
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_searches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_search_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_searches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_search_results TO service_role;
GRANT EXECUTE ON FUNCTION fn_scraped_listings_parametric TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_anonimize_contact_data TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
