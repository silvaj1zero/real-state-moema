-- =============================================================================
-- MIGRATION 003: Epic 3 — Inteligencia, ACM & Agentes de Automacao
-- Updated 2026-03-18: Schema fixes from PO validation (Stories 3.3, 3.5, 3.6, 3.8)
-- =============================================================================
-- Stories: 3.1-3.8
-- Depende de: 001 + 002
-- Tabelas: scraped_listings, acm_comparaveis, dossies, intelligence_feed
-- Funcoes: fn_match_listing_edificio, fn_comparaveis_no_raio, fn_sugestao_proximo_bloco
-- Principio: ACM funciona com 0 dados de scraping (VETO PV #3)
-- =============================================================================

-- Enums Epic 3
CREATE TYPE portal_scraping AS ENUM ('zap', 'olx', 'vivareal', 'quintoandar', 'outro');
CREATE TYPE tipo_anunciante AS ENUM ('proprietario', 'corretor', 'imobiliaria', 'desconhecido');
CREATE TYPE geocoding_status AS ENUM ('pending', 'success', 'failed', 'manual');
CREATE TYPE match_method AS ENUM ('postgis_50m', 'geocoding', 'manual', 'unmatched');
CREATE TYPE fonte_comparavel AS ENUM ('manual', 'scraping', 'captei', 'cartorio');
CREATE TYPE tipo_feed AS ENUM (
  'novo_fisbo', 'reducao_preco', 'ex_imobiliaria_fisbo', 'novo_raio_desbloqueado',
  'lead_parado', 'agendamento_proximo', 'seed_completo', 'sync_completo'
);
CREATE TYPE prioridade_feed AS ENUM ('alta', 'media', 'baixa');

-- Tabela: scraped_listings (anuncios coletados dos portais — Story 3.4)
CREATE TABLE scraped_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal portal_scraping NOT NULL,
  external_id TEXT NOT NULL,
  url TEXT,
  tipo_anunciante tipo_anunciante NOT NULL DEFAULT 'desconhecido',
  endereco TEXT,
  endereco_normalizado TEXT,
  coordinates GEOGRAPHY(Point, 4326),
  geocoding_status geocoding_status DEFAULT 'pending',
  bairro TEXT,
  preco NUMERIC(12,2),
  area_m2 NUMERIC(8,2),
  preco_m2 NUMERIC(10,2),
  tipologia TEXT,
  quartos INTEGER,
  descricao TEXT,
  is_fisbo BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  preco_anterior NUMERIC(12,2),
  preco_changed_at TIMESTAMPTZ,
  -- Matching com edificios
  matched_edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  match_method match_method DEFAULT 'unmatched',
  match_distance_m DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal, external_id)
);

-- Tabela: acm_comparaveis (dados para ACM — Story 3.1)
-- VETO PV #3: funciona com origem='manual' sem scraping
CREATE TABLE acm_comparaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  edificio_referencia_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  endereco TEXT NOT NULL,
  coordinates GEOGRAPHY(Point, 4326),
  area_m2 NUMERIC(8,2) NOT NULL,
  preco NUMERIC(12,2) NOT NULL,
  preco_m2 NUMERIC(10,2),
  is_venda_real BOOLEAN NOT NULL DEFAULT false,  -- true = preco real, false = preco anuncio
  fonte fonte_comparavel NOT NULL DEFAULT 'manual',
  scraped_listing_id UUID REFERENCES scraped_listings(id) ON DELETE SET NULL,
  data_referencia DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE acm_comparaveis IS
  'Comparaveis para ACM. VETO PV #3: funciona com fonte=manual sem scraping. '
  'is_venda_real diferencia preco de anuncio (expectativa) de preco real (realidade).';

-- Tabela: dossies (Showcase PDF — Story 3.2)
CREATE TABLE dossies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  pdf_url TEXT,  -- URL no Supabase Storage
  acm_snapshot JSONB,  -- Snapshot dos dados ACM usados
  plano_marketing JSONB,
  historico_resultados JSONB,
  versao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: intelligence_feed (eventos dos agentes — Story 3.7)
CREATE TABLE intelligence_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
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

-- Indexes
CREATE INDEX idx_scraped_listings_coordinates ON scraped_listings USING GIST (coordinates);
CREATE INDEX idx_acm_comparaveis_coordinates ON acm_comparaveis USING GIST (coordinates);
CREATE INDEX idx_intelligence_feed_coordinates ON intelligence_feed USING GIST (coordinates);
CREATE INDEX idx_scraped_listings_portal_extid ON scraped_listings(portal, external_id);
CREATE INDEX idx_intelligence_feed_created ON intelligence_feed(created_at DESC);
CREATE INDEX idx_intelligence_feed_unread ON intelligence_feed(consultant_id)
  WHERE is_read = false;
CREATE INDEX idx_scraped_listings_fisbo_active ON scraped_listings(is_fisbo)
  WHERE is_fisbo = true AND is_active = true;
CREATE INDEX idx_scraped_listings_active ON scraped_listings(is_active)
  WHERE is_active = true;
CREATE INDEX idx_acm_comparaveis_consultant ON acm_comparaveis(consultant_id);
CREATE INDEX idx_dossies_lead ON dossies(lead_id);

-- Triggers
CREATE TRIGGER trg_scraped_listings_updated_at BEFORE UPDATE ON scraped_listings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_acm_comparaveis_updated_at BEFORE UPDATE ON acm_comparaveis
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_dossies_updated_at BEFORE UPDATE ON dossies
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Trigger: gerar evento no feed quando novo FISBO detectado
CREATE OR REPLACE FUNCTION fn_notify_new_fisbo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_fisbo = true AND (OLD IS NULL OR OLD.is_fisbo = false) THEN
    INSERT INTO intelligence_feed (consultant_id, tipo, prioridade, titulo, descricao, coordinates, scraped_listing_id)
    SELECT c.id, 'novo_fisbo', 'alta',
      'Novo FISBO detectado: ' || COALESCE(NEW.endereco, 'Endereco desconhecido'),
      'Preco: R$ ' || COALESCE(NEW.preco::TEXT, 'N/A') || ' | ' || COALESCE(NEW.area_m2::TEXT, '?') || 'm2 | ' || NEW.portal::TEXT,
      NEW.coordinates, NEW.id
    FROM consultores c
    WHERE EXISTS (
      SELECT 1 FROM epicentros ep
      WHERE ep.consultant_id = c.id AND ep.is_active = true
      AND ST_DWithin(NEW.coordinates, ep.coordinates, ep.raio_ativo_m)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_new_fisbo AFTER INSERT OR UPDATE ON scraped_listings
  FOR EACH ROW EXECUTE FUNCTION fn_notify_new_fisbo();

-- Trigger: gerar evento quando preco cai >10%
CREATE OR REPLACE FUNCTION fn_notify_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.preco IS NOT NULL AND NEW.preco IS NOT NULL
     AND NEW.preco < OLD.preco * 0.9 THEN
    NEW.preco_anterior = OLD.preco;
    NEW.preco_changed_at = now();
    INSERT INTO intelligence_feed (consultant_id, tipo, prioridade, titulo, descricao, coordinates, scraped_listing_id)
    SELECT c.id, 'reducao_preco', 'media',
      'Reducao de preco: ' || COALESCE(NEW.endereco, '?'),
      'De R$ ' || OLD.preco::TEXT || ' para R$ ' || NEW.preco::TEXT || ' (-' || ROUND((1 - NEW.preco/OLD.preco)*100, 1) || '%)',
      NEW.coordinates, NEW.id
    FROM consultores c
    WHERE EXISTS (
      SELECT 1 FROM epicentros ep
      WHERE ep.consultant_id = c.id AND ep.is_active = true
      AND ST_DWithin(NEW.coordinates, ep.coordinates, ep.raio_ativo_m)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_price_change BEFORE UPDATE ON scraped_listings
  FOR EACH ROW EXECUTE FUNCTION fn_notify_price_change();

-- =============================================================================
-- FUNCOES PostGIS — Epic 3
-- =============================================================================

-- fn_match_listing_edificio: encontrar edificio mais proximo de um listing (50m)
CREATE OR REPLACE FUNCTION fn_match_listing_edificio(
  p_listing_id UUID
)
RETURNS TABLE (
  edificio_id UUID,
  nome TEXT,
  distancia_m DOUBLE PRECISION,
  metodo match_method
) AS $$
DECLARE
  v_coords GEOGRAPHY;
BEGIN
  SELECT coordinates INTO v_coords FROM scraped_listings WHERE id = p_listing_id;
  IF v_coords IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT e.id, e.nome,
    ST_Distance(e.coordinates, v_coords) AS distancia_m,
    'postgis_50m'::match_method AS metodo
  FROM edificios e
  WHERE ST_DWithin(e.coordinates, v_coords, 50)
  ORDER BY ST_Distance(e.coordinates, v_coords)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- fn_comparaveis_no_raio: buscar comparaveis para ACM dentro de raio
CREATE OR REPLACE FUNCTION fn_comparaveis_no_raio(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_consultant_id UUID,
  p_raio_metros INTEGER DEFAULT 500
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
    ST_Distance(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  FROM acm_comparaveis ac
  WHERE ac.consultant_id = p_consultant_id
    AND ST_DWithin(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio_metros)
  ORDER BY ST_Distance(ac.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- SCHEMA FIX — PO Validation (2026-03-18)
-- Gaps identified during Story validation for Epic 3
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fix 1 — Story 3.3 (Home Staging): FALSE POSITIVE
-- The field `home_staging_enviado` already exists in `checklists_preparacao`
-- (created in migration 002_epic2_methodology.sql, line 161).
-- No schema change needed.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Fix 2 — Story 3.5 (Pre-Mapping Advanced): GeoSampa IPTU enrichment fields
-- ---------------------------------------------------------------------------
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS total_units INTEGER;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS area_construida NUMERIC(10,2);
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS ano_construcao INTEGER;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS padrao_iptu TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS tipo_uso_iptu TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS num_pavimentos INTEGER;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS sql_lote TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS seed_source_secondary TEXT;
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS edited_fields JSONB DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- Fix 3 — Story 3.6 (Cross-Referencing): Cross-referencing entre portais
-- ---------------------------------------------------------------------------
ALTER TABLE scraped_listings ADD COLUMN IF NOT EXISTS merged_group_id UUID;

CREATE TABLE IF NOT EXISTS listing_cross_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_a_id UUID NOT NULL REFERENCES scraped_listings(id) ON DELETE CASCADE,
  listing_b_id UUID NOT NULL REFERENCES scraped_listings(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  match_method TEXT, -- 'geo_area_price', 'address_normalize', 'manual'
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  merged_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES consultores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_a_id, listing_b_id)
);

CREATE INDEX idx_cross_refs_listing_a ON listing_cross_refs(listing_a_id);
CREATE INDEX idx_cross_refs_listing_b ON listing_cross_refs(listing_b_id);
CREATE INDEX idx_scraped_merged_group ON scraped_listings(merged_group_id) WHERE merged_group_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Fix 4 — Story 3.8 (Lead Enrichment): Enriquecimento sob demanda
-- ---------------------------------------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enrichment_data JSONB;
-- Structure: {enriched_at, anuncios_entorno: [], estimativa_m2: {}, fisbo_score: {}, scraped_match_id}

-- =============================================================================
-- FIM: Migration 003 — Epic 3 Intelligence
-- =============================================================================
