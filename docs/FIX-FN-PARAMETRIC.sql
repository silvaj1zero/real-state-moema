-- Corrige fn_scraped_listings_parametric (erro 42804 — type mismatch)
-- Adiciona casts explícitos para blindar contra diferenças sutis de tipo
-- entre a tabela real e o RETURNS TABLE da função.

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
    sl.id,
    sl.portal,
    sl.external_id::TEXT,
    sl.url::TEXT,
    sl.tipo_anunciante,
    sl.endereco::TEXT,
    sl.endereco_normalizado::TEXT,
    sl.bairro::TEXT,
    sl.preco::NUMERIC,
    sl.area_m2::NUMERIC,
    sl.preco_m2::NUMERIC,
    sl.tipologia::TEXT,
    sl.quartos::INTEGER,
    sl.descricao::TEXT,
    sl.is_fisbo,
    sl.is_active,
    sl.first_seen_at,
    sl.last_seen_at,
    sl.removed_at,
    sl.preco_anterior::NUMERIC,
    sl.matched_edificio_id,
    sl.match_method,
    sl.match_distance_m::NUMERIC,
    sl.nome_anunciante::TEXT,
    sl.telefone_anunciante::TEXT,
    sl.email_anunciante::TEXT,
    sl.whatsapp_anunciante::TEXT,
    sl.creci_anunciante::TEXT,
    ST_Distance(
      sl.coordinates,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    )::DOUBLE PRECISION AS distancia_m
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

GRANT EXECUTE ON FUNCTION fn_scraped_listings_parametric TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
