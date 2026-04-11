-- =============================================================================
-- MIGRATION 001: Base Foundation Tables (Epic 1)
-- Epic: 5.1 — Schema Migration Base (Audit PV Finding F1)
-- Depends on: 000_extensions_and_types.sql
-- =============================================================================

-- =============================================================================
-- consultant_settings — Consultant configuration & VGV tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS consultant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  franquia TEXT DEFAULT 'RE/MAX Galeria',
  regiao TEXT DEFAULT 'Moema',
  percentual_relacionamento_default NUMERIC(5,2) DEFAULT 3.0,
  vgv_acumulado NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(consultant_id)
);

-- =============================================================================
-- epicentros — Expansion epicenters with active radius
-- =============================================================================

CREATE TABLE IF NOT EXISTS epicentros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  raio_ativo_m INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epicentros_coordinates ON epicentros USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_epicentros_consultant ON epicentros(consultant_id);

-- =============================================================================
-- edificios — Buildings registry
-- =============================================================================

CREATE TABLE IF NOT EXISTS edificios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  endereco_normalizado TEXT,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  bairro TEXT,
  cep TEXT,
  cidade TEXT NOT NULL DEFAULT 'São Paulo',
  estado TEXT NOT NULL DEFAULT 'SP',
  origem origem_edificio NOT NULL DEFAULT 'manual',
  seed_source TEXT,
  seed_source_secondary TEXT,
  verificado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  -- Story 3.5 — GeoSampa IPTU enrichment fields
  total_units INTEGER,
  area_construida NUMERIC(12,2),
  ano_construcao INTEGER,
  padrao_iptu TEXT,
  tipo_uso_iptu TEXT,
  num_pavimentos INTEGER,
  sql_lote TEXT,
  edited_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edificios_coordinates ON edificios USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_edificios_bairro ON edificios(bairro);
CREATE INDEX IF NOT EXISTS idx_edificios_nome_trgm ON edificios USING GIN(nome gin_trgm_ops);

-- =============================================================================
-- edificios_qualificacoes — Building qualifications per consultant
-- =============================================================================

CREATE TABLE IF NOT EXISTS edificios_qualificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edificio_id UUID NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipologia tipologia_edificio,
  padrao padrao_edificio,
  status_varredura status_varredura NOT NULL DEFAULT 'nao_visitado',
  abertura_corretores abertura_corretores NOT NULL DEFAULT 'desconhecido',
  oportunidades_count INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  is_fisbo_detected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(edificio_id, consultant_id)
);

CREATE INDEX IF NOT EXISTS idx_qualificacoes_edificio ON edificios_qualificacoes(edificio_id);
CREATE INDEX IF NOT EXISTS idx_qualificacoes_consultant ON edificios_qualificacoes(consultant_id);

-- =============================================================================
-- RPC: fn_edificios_no_raio — Find buildings within radius
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_edificios_no_raio(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_raio_m INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  endereco TEXT,
  coordinates GEOGRAPHY,
  distancia_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.nome, e.endereco, e.coordinates,
         ST_Distance(e.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distancia_m
  FROM edificios e
  WHERE ST_DWithin(e.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio_m)
  ORDER BY distancia_m;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- RPC: fn_cobertura_raio — Radius coverage stats
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_cobertura_raio(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_raio_m INTEGER DEFAULT 500,
  p_consultant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_edificios BIGINT,
  mapeados BIGINT,
  em_prospeccao BIGINT,
  concluidos BIGINT,
  nao_visitados BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT e.id) AS total_edificios,
    COUNT(DISTINCT CASE WHEN eq.status_varredura = 'mapeado' THEN e.id END) AS mapeados,
    COUNT(DISTINCT CASE WHEN eq.status_varredura = 'em_prospeccao' THEN e.id END) AS em_prospeccao,
    COUNT(DISTINCT CASE WHEN eq.status_varredura = 'concluido' THEN e.id END) AS concluidos,
    COUNT(DISTINCT CASE WHEN eq.status_varredura = 'nao_visitado' OR eq.id IS NULL THEN e.id END) AS nao_visitados
  FROM edificios e
  LEFT JOIN edificios_qualificacoes eq ON eq.edificio_id = e.id
    AND (p_consultant_id IS NULL OR eq.consultant_id = p_consultant_id)
  WHERE ST_DWithin(e.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio_m);
END;
$$ LANGUAGE plpgsql STABLE;
