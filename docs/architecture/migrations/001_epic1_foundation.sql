-- =============================================================================
-- MIGRATION 001: Epic 1 — Foundation, Mapa & Registro de Campo
-- =============================================================================
-- Stories: 1.1 (Setup), 1.2 (Mapa), 1.3 (Cadastro), 1.4 (Card),
--          1.5 (Status/Cores), 1.6 (Offline), 1.7 (Seed Data)
-- Tabelas: consultores, epicentros, edificios, edificios_qualificacoes,
--          consultant_settings
-- Funcoes: fn_edificios_no_raio, fn_cobertura_raio
-- Referencia: docs/architecture/schema.sql linhas 1-400, 897-1011, 1020-1120
-- =============================================================================

-- Extensoes
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums Epic 1
CREATE TYPE status_varredura AS ENUM (
  'nao_visitado', 'mapeado', 'em_prospeccao', 'concluido'
);

CREATE TYPE tipologia_edificio AS ENUM (
  'residencial_vertical', 'residencial_horizontal', 'comercial', 'misto', 'outro'
);

CREATE TYPE padrao_edificio AS ENUM (
  'popular', 'medio', 'medio_alto', 'alto', 'luxo'
);

CREATE TYPE abertura_corretores AS ENUM (
  'zelador_amigavel', 'rigido', 'exige_autorizacao', 'desconhecido'
);

CREATE TYPE origem_edificio AS ENUM (
  'manual', 'seed', 'api'
);

-- Tabela: consultores
CREATE TABLE consultores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone_encrypted BYTEA,
  franquia TEXT DEFAULT 'RE/MAX Galeria',
  regiao_foco TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE consultores IS
  'Consultores RE/MAX — usuarios do sistema. id = auth.uid() do Supabase Auth.';

-- Tabela: epicentros
CREATE TABLE epicentros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Principal',
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  raio_ativo_m INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE epicentros IS
  'Epicentro do territorio. raio_ativo_m expande ao atingir 80%% cobertura (FR-004).';

-- Tabela: edificios (BASE — futuramente publica)
-- ALERTA PV: separacao edificios/qualificacoes para multi-tenant
CREATE TABLE edificios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  endereco_normalizado TEXT,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  bairro TEXT,
  cep TEXT,
  cidade TEXT DEFAULT 'Sao Paulo',
  estado TEXT DEFAULT 'SP',
  origem origem_edificio NOT NULL DEFAULT 'manual',
  seed_source TEXT,
  verificado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES consultores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE edificios IS
  'Edificios — tabela BASE, dados objetivos. Futuramente PUBLICA. '
  'Decisao ADR-001: separacao edificios/qualificacoes para multi-tenant.';

-- Tabela: edificios_qualificacoes (PRIVADA — por consultor)
CREATE TABLE edificios_qualificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipologia tipologia_edificio,
  padrao padrao_edificio,
  status_varredura status_varredura NOT NULL DEFAULT 'nao_visitado',
  abertura_corretores abertura_corretores DEFAULT 'desconhecido',
  oportunidades_count INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  is_fisbo_detected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(edificio_id, consultant_id)
);

COMMENT ON TABLE edificios_qualificacoes IS
  'Qualificacao PRIVADA de edificios por consultor. Protegida por RLS no Epic 4.';

-- Tabela: consultant_settings
CREATE TABLE consultant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE UNIQUE,
  meta_v1_diaria INTEGER NOT NULL DEFAULT 5,
  lembrete_informante_dias INTEGER NOT NULL DEFAULT 15,
  notificacoes_push BOOLEAN NOT NULL DEFAULT true,
  notificacoes_fisbo BOOLEAN NOT NULL DEFAULT true,
  notificacoes_preco BOOLEAN NOT NULL DEFAULT true,
  tema TEXT DEFAULT 'remax',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes GIST (geoespaciais)
CREATE INDEX idx_edificios_coordinates ON edificios USING GIST (coordinates);
CREATE INDEX idx_epicentros_coordinates ON epicentros USING GIST (coordinates);

-- Indexes B-tree
CREATE INDEX idx_edificios_qual_consultant ON edificios_qualificacoes(consultant_id);
CREATE INDEX idx_edificios_qual_edificio ON edificios_qualificacoes(edificio_id);
CREATE INDEX idx_edificios_qual_status ON edificios_qualificacoes(status_varredura)
  WHERE status_varredura != 'concluido';
CREATE INDEX idx_epicentros_active ON epicentros(consultant_id) WHERE is_active = true;

-- Trigger: updated_at automatico
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consultores_updated_at BEFORE UPDATE ON consultores
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_epicentros_updated_at BEFORE UPDATE ON epicentros
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_edificios_updated_at BEFORE UPDATE ON edificios
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_edificios_qual_updated_at BEFORE UPDATE ON edificios_qualificacoes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_consultant_settings_updated_at BEFORE UPDATE ON consultant_settings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =============================================================================
-- FUNCOES PostGIS — Epic 1
-- =============================================================================

-- fn_edificios_no_raio: buscar edificios dentro de X metros de um ponto
-- Uso: SELECT * FROM fn_edificios_no_raio(-23.6008, -46.6658, 500);
CREATE OR REPLACE FUNCTION fn_edificios_no_raio(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_raio_metros INTEGER DEFAULT 500
)
RETURNS TABLE (
  edificio_id UUID,
  nome TEXT,
  endereco TEXT,
  distancia_metros DOUBLE PRECISION,
  coordinates GEOGRAPHY
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.endereco,
    ST_Distance(e.coordinates, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distancia_metros,
    e.coordinates
  FROM edificios e
  WHERE ST_DWithin(
    e.coordinates,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_raio_metros
  )
  ORDER BY distancia_metros;
END;
$$ LANGUAGE plpgsql STABLE;

-- fn_cobertura_raio: calcular % de cobertura de um raio
-- Uso: SELECT * FROM fn_cobertura_raio('uuid-epicentro', 'uuid-consultor');
CREATE OR REPLACE FUNCTION fn_cobertura_raio(
  p_epicentro_id UUID,
  p_consultant_id UUID
)
RETURNS TABLE (
  total_edificios BIGINT,
  visitados BIGINT,
  percentual_cobertura NUMERIC
) AS $$
DECLARE
  v_center GEOGRAPHY;
  v_raio INTEGER;
BEGIN
  SELECT coordinates, raio_ativo_m INTO v_center, v_raio
  FROM epicentros WHERE id = p_epicentro_id;

  RETURN QUERY
  SELECT
    COUNT(e.id) AS total_edificios,
    COUNT(eq.id) FILTER (WHERE eq.status_varredura != 'nao_visitado') AS visitados,
    CASE
      WHEN COUNT(e.id) = 0 THEN 0
      ELSE ROUND(
        COUNT(eq.id) FILTER (WHERE eq.status_varredura != 'nao_visitado') * 100.0 / COUNT(e.id),
        1
      )
    END AS percentual_cobertura
  FROM edificios e
  LEFT JOIN edificios_qualificacoes eq ON eq.edificio_id = e.id AND eq.consultant_id = p_consultant_id
  WHERE ST_DWithin(e.coordinates, v_center, v_raio);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- FIM: Migration 001 — Epic 1 Foundation
-- Proxima: 002_epic2_methodology.sql (quando Epic 2 iniciar)
-- =============================================================================
