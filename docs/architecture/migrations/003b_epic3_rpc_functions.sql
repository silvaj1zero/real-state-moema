-- =============================================================================
-- MIGRATION 003b: RPC Functions for Epic 3 API Routes
-- Stories: 3.4 (geocoding, coordinate insert), 3.5 (seed), 3.6 (cross-ref)
-- Depends on: 003_epic3_intelligence.sql
-- =============================================================================

-- fn_set_listing_coordinates: update listing with geocoded coordinates
-- Used by /api/cron/geocode-listings
CREATE OR REPLACE FUNCTION fn_set_listing_coordinates(
  p_listing_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_endereco_normalizado TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE scraped_listings
  SET coordinates = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      geocoding_status = 'success',
      endereco_normalizado = COALESCE(p_endereco_normalizado, endereco_normalizado)
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

-- fn_insert_scraped_listing_with_coords: insert listing with PostGIS coordinates
-- Used by /api/cron/scrape-portals when portal provides lat/lng
CREATE OR REPLACE FUNCTION fn_insert_scraped_listing_with_coords(
  p_portal portal_scraping,
  p_external_id TEXT,
  p_url TEXT DEFAULT NULL,
  p_tipo_anunciante tipo_anunciante DEFAULT 'desconhecido',
  p_endereco TEXT DEFAULT NULL,
  p_bairro TEXT DEFAULT NULL,
  p_preco NUMERIC DEFAULT NULL,
  p_area_m2 NUMERIC DEFAULT NULL,
  p_preco_m2 NUMERIC DEFAULT NULL,
  p_tipologia TEXT DEFAULT NULL,
  p_quartos INTEGER DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_is_fisbo BOOLEAN DEFAULT false,
  p_geocoding_status geocoding_status DEFAULT 'pending',
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_coords GEOGRAPHY;
BEGIN
  IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    v_coords := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  END IF;

  INSERT INTO scraped_listings (
    portal, external_id, url, tipo_anunciante, endereco, bairro,
    preco, area_m2, preco_m2, tipologia, quartos, descricao,
    is_fisbo, geocoding_status, coordinates, is_active
  ) VALUES (
    p_portal, p_external_id, p_url, p_tipo_anunciante, p_endereco, p_bairro,
    p_preco, p_area_m2, p_preco_m2, p_tipologia, p_quartos, p_descricao,
    p_is_fisbo, CASE WHEN v_coords IS NOT NULL THEN 'success' ELSE p_geocoding_status END,
    v_coords, true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Vercel Cron Schedule (documentation for pg_cron alternative)
-- =============================================================================
-- If using pg_cron instead of Vercel Cron, execute:
--
-- SELECT cron.schedule('scrape-zap-daily', '0 9 * * *',
--   $$SELECT net.http_post('https://your-app.vercel.app/api/cron/scrape-portals?portal=zap',
--     '{}', 'application/json', ARRAY[http_header('authorization', 'Bearer YOUR_CRON_SECRET')])$$
-- );
--
-- SELECT cron.schedule('scrape-olx-weekly', '0 9 * * 1',
--   $$SELECT net.http_post('https://your-app.vercel.app/api/cron/scrape-portals?portal=olx',
--     '{}', 'application/json', ARRAY[http_header('authorization', 'Bearer YOUR_CRON_SECRET')])$$
-- );
--
-- SELECT cron.schedule('geocode-daily', '30 9 * * *',
--   $$SELECT net.http_post('https://your-app.vercel.app/api/cron/geocode-listings',
--     '{}', 'application/json', ARRAY[http_header('authorization', 'Bearer YOUR_CRON_SECRET')])$$
-- );
--
-- SELECT cron.schedule('match-daily', '0 10 * * *',
--   $$SELECT net.http_post('https://your-app.vercel.app/api/cron/match-listings',
--     '{}', 'application/json', ARRAY[http_header('authorization', 'Bearer YOUR_CRON_SECRET')])$$
-- );
--
-- SELECT cron.schedule('crossref-weekly', '0 3 * * 0',
--   $$SELECT net.http_post('https://your-app.vercel.app/api/cron/cross-reference',
--     '{}', 'application/json', ARRAY[http_header('authorization', 'Bearer YOUR_CRON_SECRET')])$$
-- );
-- =============================================================================
