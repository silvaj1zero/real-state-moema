-- =============================================================================
-- MIGRATION 003: Epic 3 — Inteligência, ACM & Agentes de Automação
-- Epic: 5.1 — Schema Migration Base (Audit PV Finding F1)
-- Depends on: 002_epic2_methodology.sql
-- =============================================================================

-- =============================================================================
-- scraped_listings — Portal scraping results
-- =============================================================================

CREATE TABLE IF NOT EXISTS scraped_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal portal_scraping NOT NULL,
  external_id TEXT NOT NULL,
  url TEXT,
  tipo_anunciante tipo_anunciante NOT NULL DEFAULT 'desconhecido',
  endereco TEXT,
  endereco_normalizado TEXT,
  coordinates GEOGRAPHY(Point, 4326),
  geocoding_status geocoding_status NOT NULL DEFAULT 'pending',
  bairro TEXT,
  preco NUMERIC(14,2),
  area_m2 NUMERIC(10,2),
  preco_m2 NUMERIC(10,2),
  tipologia TEXT,
  quartos INTEGER,
  descricao TEXT,
  is_fisbo BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  preco_anterior NUMERIC(14,2),
  preco_changed_at TIMESTAMPTZ,
  matched_edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  match_method match_method NOT NULL DEFAULT 'unmatched',
  match_distance_m NUMERIC(8,2),
  merged_group_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal, external_id)
);

CREATE INDEX IF NOT EXISTS idx_scraped_coordinates ON scraped_listings USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_scraped_portal ON scraped_listings(portal);
CREATE INDEX IF NOT EXISTS idx_scraped_active ON scraped_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_scraped_bairro ON scraped_listings(bairro);
CREATE INDEX IF NOT EXISTS idx_scraped_fisbo ON scraped_listings(is_fisbo) WHERE is_fisbo = true;

-- =============================================================================
-- acm_comparaveis — Market comparables for ACM
-- =============================================================================

CREATE TABLE IF NOT EXISTS acm_comparaveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edificio_referencia_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  endereco TEXT NOT NULL,
  coordinates GEOGRAPHY(Point, 4326),
  area_m2 NUMERIC(10,2) NOT NULL,
  preco NUMERIC(14,2) NOT NULL,
  preco_m2 NUMERIC(10,2),
  is_venda_real BOOLEAN NOT NULL DEFAULT false,
  fonte fonte_comparavel NOT NULL DEFAULT 'manual',
  scraped_listing_id UUID REFERENCES scraped_listings(id) ON DELETE SET NULL,
  data_referencia DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acm_coordinates ON acm_comparaveis USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_acm_consultant ON acm_comparaveis(consultant_id);

-- =============================================================================
-- listing_cross_refs — Cross-referencing between listings
-- =============================================================================

CREATE TABLE IF NOT EXISTS listing_cross_refs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_a_id UUID NOT NULL REFERENCES scraped_listings(id) ON DELETE CASCADE,
  listing_b_id UUID NOT NULL REFERENCES scraped_listings(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  match_method TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  merged_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_a_id, listing_b_id)
);

-- =============================================================================
-- intelligence_feed — Real-time intelligence events
-- =============================================================================

CREATE TABLE IF NOT EXISTS intelligence_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo tipo_feed NOT NULL,
  prioridade prioridade_feed NOT NULL DEFAULT 'media',
  titulo TEXT NOT NULL,
  descricao TEXT,
  coordinates GEOGRAPHY(Point, 4326),
  edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  scraped_listing_id UUID REFERENCES scraped_listings(id) ON DELETE SET NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_push_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_consultant ON intelligence_feed(consultant_id);
CREATE INDEX IF NOT EXISTS idx_feed_tipo ON intelligence_feed(tipo);
CREATE INDEX IF NOT EXISTS idx_feed_created ON intelligence_feed(created_at DESC);

-- =============================================================================
-- RPC: fn_comparaveis_no_raio — Find comparables within radius
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_comparaveis_no_raio(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_consultant_id UUID,
  p_raio_m INTEGER DEFAULT 500
)
RETURNS TABLE (
  comparavel_id UUID,
  endereco TEXT,
  area_m2 NUMERIC,
  preco NUMERIC,
  preco_m2 NUMERIC,
  is_venda_real BOOLEAN,
  fonte fonte_comparavel,
  distancia_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT ac.id, ac.endereco, ac.area_m2, ac.preco, ac.preco_m2,
         ac.is_venda_real, ac.fonte,
         ST_Distance(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distancia_m
  FROM acm_comparaveis ac
  WHERE ac.consultant_id = p_consultant_id
    AND ac.coordinates IS NOT NULL
    AND ST_DWithin(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio_m)
  ORDER BY distancia_m;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- RPC: fn_match_listing_edificio — Match scraped listing to building
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_match_listing_edificio(
  p_listing_id UUID,
  p_max_distance_m INTEGER DEFAULT 50
)
RETURNS TABLE (
  edificio_id UUID,
  edificio_nome TEXT,
  distancia_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.nome,
         ST_Distance(e.coordinates, sl.coordinates) AS distancia_m
  FROM scraped_listings sl
  JOIN edificios e ON ST_DWithin(e.coordinates, sl.coordinates, p_max_distance_m)
  WHERE sl.id = p_listing_id
    AND sl.coordinates IS NOT NULL
  ORDER BY distancia_m
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
