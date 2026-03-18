-- =============================================================================
-- SCHEMA COMPLETO: Sistema de Mapeamento e Assessoria Imobiliaria RE/MAX
-- =============================================================================
-- Versao: 1.0
-- Data: 2026-03-18
-- Autor: Dara (Data Engineer Agent — AIOX)
-- Referencia: docs/prd.md v2.0 + docs/architecture/system-architecture.md v1.0
--
-- IMPORTANTE:
--   - Executar contra Supabase PostgreSQL com PostGIS habilitado
--   - Ordem de execucao: extensoes → enums → tabelas → indexes → functions → triggers → RLS → seed
--   - Colunas sensiveis (telefone, email) criptografadas via pgcrypto (LGPD)
--   - Separacao edificios (base publica) vs edificios_qualificacoes (privada) — ADR-001
--   - geography(Point, 4326) para coordenadas — distancias em metros nativo — ADR-002
-- =============================================================================


-- =============================================================================
-- 1. EXTENSOES
-- =============================================================================
-- PostGIS: queries geoespaciais (ST_DWithin, ST_Distance, GIST indexes)
-- pgcrypto: criptografia simetrica para dados LGPD (telefone, email)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- 2. ENUMS
-- Todos os tipos enumerados do sistema, organizados por dominio
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Dominio: Nucleo Territorial
-- ---------------------------------------------------------------------------

-- Status de varredura do edificio (por qualificacao do consultor)
-- Cores no mapa: Cinza / Azul / Amarelo / Verde
CREATE TYPE status_varredura AS ENUM (
  'nao_visitado',     -- Cinza — edificio nao visitado ainda
  'mapeado',          -- Azul — visitado e dados basicos coletados
  'em_prospeccao',    -- Amarelo — prospeccao ativa com leads
  'concluido'         -- Verde — varredura completa
);

-- Tipologia do edificio
CREATE TYPE tipologia_edificio AS ENUM (
  'residencial_vertical',
  'residencial_horizontal',
  'comercial',
  'misto',
  'outro'
);

-- Padrao do edificio (nivel socioeconomico)
CREATE TYPE padrao_edificio AS ENUM (
  'popular',
  'medio',
  'medio_alto',
  'alto',
  'luxo'
);

-- Abertura a corretores (como o edificio recebe profissionais)
CREATE TYPE abertura_corretores AS ENUM (
  'zelador_amigavel',     -- Facil acesso, zelador colaborativo
  'rigido',               -- Dificil acesso, regras restritivas
  'exige_autorizacao',    -- Precisa de autorizacao previa do sindico
  'desconhecido'          -- Ainda nao avaliado
);

-- Origem do edificio no sistema (como foi cadastrado)
CREATE TYPE origem_edificio AS ENUM (
  'manual',    -- Cadastrado pela consultora em campo
  'seed',      -- Pre-carregado via API publica (Google Places, OSM)
  'api'        -- Importado via integracao (Captei, etc.)
);

-- ---------------------------------------------------------------------------
-- Dominio: Leads e Funil de Vendas
-- ---------------------------------------------------------------------------

-- Etapas do funil RE/MAX (5 estagios obrigatorios)
-- Contato → V1 → V2 → Exclusividade → Venda
CREATE TYPE etapa_funil AS ENUM (
  'contato',          -- Primeiro contato com proprietario
  'v1',               -- Primeira visita ao imovel
  'v2',               -- Segunda visita — apresentacao Dossie/Showcase
  'exclusividade',    -- Contrato de exclusividade assinado
  'venda'             -- Imovel vendido
);

-- Origem do lead (como o lead chegou ao sistema)
CREATE TYPE origem_lead AS ENUM (
  'campo',                   -- Prospeccao presencial
  'indicacao_informante',    -- Via zelador/porteiro
  'fisbo_portal',            -- Detectado em portal (ZAP, OLX, etc.)
  'captei',                  -- Importado do Captei
  'referral',                -- Indicacao de parceiro
  'frog',                    -- Via metodo FROG
  'digital',                 -- Canal digital (site, redes sociais)
  'outro'
);

-- Prazo de urgencia do proprietario para vender
CREATE TYPE prazo_urgencia AS ENUM (
  'imediato',      -- < 1 mes
  'curto',         -- 1-3 meses
  'medio',         -- 3-6 meses
  'longo',         -- > 6 meses
  'indefinido'
);

-- Fonte FROG (Familia, Relacionamentos, Organizacoes, Geografia)
CREATE TYPE fonte_frog AS ENUM (
  'familia',
  'relacionamentos',
  'organizacoes',
  'geografia'
);

-- Tipo de agendamento
CREATE TYPE tipo_agendamento AS ENUM (
  'v1',
  'v2',
  'follow_up'
);

-- Status de agendamento
CREATE TYPE status_agendamento AS ENUM (
  'agendado',
  'confirmado',
  'realizado',
  'cancelado'
);

-- ---------------------------------------------------------------------------
-- Dominio: Informantes
-- ---------------------------------------------------------------------------

-- Funcao do informante no edificio
CREATE TYPE funcao_informante AS ENUM (
  'zelador',
  'porteiro',
  'sindico',
  'morador',
  'outro'
);

-- ---------------------------------------------------------------------------
-- Dominio: Scripts de Objecao
-- ---------------------------------------------------------------------------

-- Categoria do script de contorno de objecao
CREATE TYPE categoria_script AS ENUM (
  'resistencia_corretor',     -- "Nao trabalho com imobiliarias"
  'experiencia_negativa',     -- "Ja tive experiencia ruim"
  'preco_comissao',           -- "A comissao e muito alta"
  'exclusividade',            -- "Nao quero exclusividade"
  'tempo_mercado',            -- "Ja esta a venda ha muito tempo"
  'tecnica_fechamento',       -- Tecnicas de fechamento (Duas Opcoes, etc.)
  'rapport',                  -- Construcao de rapport e confianca
  'outro'
);

-- ---------------------------------------------------------------------------
-- Dominio: Referrals e Comissoes
-- ---------------------------------------------------------------------------

-- Status de referral (indicacao cruzada entre consultores)
CREATE TYPE status_referral AS ENUM (
  'enviada',           -- Indicacao enviada ao parceiro
  'aceita',            -- Parceiro aceitou trabalhar o lead
  'em_andamento',      -- Negociacao em andamento
  'convertida',        -- Venda realizada
  'comissao_paga',     -- Comissao paga ao indicador
  'cancelada'          -- Indicacao cancelada
);

-- Direcao do referral
CREATE TYPE direcao_referral AS ENUM (
  'enviada',     -- Luciana enviou indicacao para parceiro
  'recebida'     -- Luciana recebeu indicacao de parceiro
);

-- Clubes RE/MAX (progressao de reconhecimento por VGV)
CREATE TYPE clube_remax AS ENUM (
  'executive',
  '100_percent',
  'platinum',
  'chairmans',
  'titan',
  'diamond',
  'pinnacle'
);

-- ---------------------------------------------------------------------------
-- Dominio: Scraping e Inteligencia
-- ---------------------------------------------------------------------------

-- Portal de scraping de imoveis
CREATE TYPE portal_scraping AS ENUM (
  'zap',
  'olx',
  'vivareal',
  'outro'
);

-- Tipo de anunciante detectado no portal
CREATE TYPE tipo_anunciante AS ENUM (
  'proprietario',      -- FISBO — prioridade maxima
  'imobiliaria',
  'corretor',
  'desconhecido'
);

-- Status do geocoding de listings scraped
CREATE TYPE geocoding_status AS ENUM (
  'pending',       -- Aguardando geocodificacao
  'matched',       -- Match PostGIS direto (ST_DWithin 50m)
  'geocoded',      -- Geocodificado via Mapbox API
  'failed'         -- Geocodificacao falhou
);

-- Metodo de match entre scraped_listing e edificio
CREATE TYPE match_method AS ENUM (
  'postgis',       -- Match por proximidade PostGIS (ST_DWithin)
  'geocoding',     -- Match apos geocodificacao de endereco
  'manual'         -- Vinculacao manual pela consultora
);

-- Fonte do comparavel para ACM
CREATE TYPE fonte_comparavel AS ENUM (
  'manual',        -- Cadastrado manualmente pela consultora
  'scraping',      -- Importado via scraping de portais
  'captei'         -- Importado do Captei
);

-- ---------------------------------------------------------------------------
-- Dominio: Feed de Inteligencia
-- ---------------------------------------------------------------------------

-- Tipo de evento no feed de inteligencia
CREATE TYPE tipo_feed AS ENUM (
  'novo_fisbo',              -- FISBO detectado no portal
  'mudanca_preco',           -- Preco alterado em anuncio
  'ex_imobiliaria',          -- Anuncio saiu de imobiliaria → proprietario
  'raio_desbloqueado',       -- Novo raio de cobertura desbloqueado (80%)
  'lead_parado',             -- Lead sem atividade > 3 dias
  'novo_anuncio',            -- Novo anuncio no raio
  'duplicata_detectada',     -- Duplicata entre portais detectada
  'sistema'                  -- Notificacao do sistema
);

-- Prioridade do evento no feed
CREATE TYPE prioridade_feed AS ENUM (
  'alta',
  'media',
  'baixa'
);

-- ---------------------------------------------------------------------------
-- Dominio: Safari/Open House e Checklists
-- ---------------------------------------------------------------------------

-- Status de evento Safari/Open House
CREATE TYPE status_safari AS ENUM (
  'planejado',
  'ativo',
  'concluido',
  'cancelado'
);

-- Status de RSVP
CREATE TYPE status_rsvp AS ENUM (
  'convidado',
  'confirmado',
  'presente',
  'ausente'
);

-- Tipo de checklist de preparacao
CREATE TYPE tipo_checklist AS ENUM (
  'v1_para_v2',        -- Checklist V1→V2 (ACM, Dossie, Home Staging...)
  'home_staging',      -- Checklist de Home Staging
  'safari'             -- Checklist de Safari/Open House
);


-- =============================================================================
-- 3. TABELAS
-- Organizadas por dominio funcional, na ordem de dependencias (FKs)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 CONSULTORES
-- Tabela principal de usuarios do sistema. Vinculada ao Supabase Auth via id.
-- Referencia: PRD Secao 2 (todos os FRs dependem do consultor autenticado)
-- ---------------------------------------------------------------------------
CREATE TABLE consultores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- id sera o mesmo que auth.uid() do Supabase Auth
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone_encrypted BYTEA,                -- Criptografado via pgcrypto (LGPD)
  franquia TEXT DEFAULT 'RE/MAX Galeria',   -- Nome da franquia RE/MAX
  regiao_foco TEXT,                         -- Ex: "Moema, Vila Olimpia"
  avatar_url TEXT,                          -- URL no Supabase Storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE consultores IS
  'Consultores RE/MAX — usuarios do sistema. id = auth.uid() do Supabase Auth. '
  'Tabela central: todas as entidades privadas referenciam consultant_id.';

-- ---------------------------------------------------------------------------
-- 3.2 EPICENTROS
-- Ponto central do territorio do consultor. Cada consultor pode ter multiplos,
-- mas apenas um ativo (is_active). Raios concentricos partem daqui (500m, 1km, 2km).
-- Referencia: FR-001, FR-002, FR-004, Story 1.2
-- ---------------------------------------------------------------------------
CREATE TABLE epicentros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Principal',   -- Ex: "Rua Alvorada" ou "Vila Olimpia"
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,  -- Epicentro em lat/lng
  raio_ativo_m INTEGER NOT NULL DEFAULT 500,     -- Raio desbloqueado atual em metros
  is_active BOOLEAN NOT NULL DEFAULT true,       -- Apenas 1 ativo por consultor
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE epicentros IS
  'Epicentro do territorio do consultor. Default: Rua Alvorada, Moema. '
  'raio_ativo_m comeca em 500 e expande para 1000, 2000 ao atingir 80%% cobertura (FR-004).';

-- ---------------------------------------------------------------------------
-- 3.3 EDIFICIOS (BASE — futuramente publica)
-- Dados imutaveis/objetivos dos edificios: endereco, coordenadas, origem.
-- NAO contem qualificacoes subjetivas (essas ficam em edificios_qualificacoes).
-- DECISAO ARQUITETURAL: separacao edificios/qualificacoes — ADR-001, Alerta PV.
-- Referencia: FR-006, Story 1.3, NFR-005
-- ---------------------------------------------------------------------------
CREATE TABLE edificios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,                              -- Nome do edificio/condominio
  endereco TEXT NOT NULL,                          -- Endereco completo
  endereco_normalizado TEXT,                       -- Endereco normalizado para matching
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,     -- Localizacao GPS (GIST indexado)
  bairro TEXT,                                     -- Ex: "Moema", "Vila Olimpia"
  cep TEXT,                                        -- CEP (8 digitos)
  cidade TEXT DEFAULT 'Sao Paulo',
  estado TEXT DEFAULT 'SP',
  origem origem_edificio NOT NULL DEFAULT 'manual', -- Como foi cadastrado
  seed_source TEXT,                                 -- Fonte do seed (ex: "google_places", "osm")
  verificado BOOLEAN NOT NULL DEFAULT false,        -- Confirmado por consultor (vs seed automatico)
  created_by UUID REFERENCES consultores(id) ON DELETE SET NULL,  -- Quem cadastrou
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE edificios IS
  'Edificios — tabela BASE, dados objetivos. Futuramente PUBLICA/compartilhada entre consultores. '
  'NAO contem dados subjetivos (padrao, status, notas) — esses ficam em edificios_qualificacoes. '
  'Decisao ADR-001: separacao edificios/qualificacoes para multi-tenant sem migracao (Epic 4).';

-- ---------------------------------------------------------------------------
-- 3.4 EDIFICIOS_QUALIFICACOES (PRIVADA — por consultor)
-- Qualificacao subjetiva do edificio feita por cada consultor individualmente.
-- Um edificio pode ter N qualificacoes (uma por consultor no futuro multi-tenant).
-- UNIQUE(edificio_id, consultant_id) garante 1 qualificacao por consultor por edificio.
-- Referencia: FR-003, FR-006, FR-007, FR-010, Story 1.3, Story 1.4, Story 1.5, Story 2.10
-- ---------------------------------------------------------------------------
CREATE TABLE edificios_qualificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edificio_id UUID NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipologia tipologia_edificio,                       -- Tipo do edificio
  padrao padrao_edificio,                              -- Padrao socioeconomico
  status_varredura status_varredura NOT NULL DEFAULT 'nao_visitado',
  abertura_corretores abertura_corretores DEFAULT 'desconhecido',
  oportunidades_count INTEGER NOT NULL DEFAULT 0,      -- Placas + anuncios detectados
  notas TEXT,                                          -- Notas livres da consultora
  is_fisbo_detected BOOLEAN NOT NULL DEFAULT false,     -- Flag FISBO detectado (Story 2.10)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(edificio_id, consultant_id)                   -- 1 qualificacao por consultor por edificio
);

COMMENT ON TABLE edificios_qualificacoes IS
  'Qualificacao PRIVADA de edificios — dados subjetivos por consultor (padrao, status, tipologia, notas). '
  'UNIQUE(edificio_id, consultant_id): cada consultor qualifica cada edificio independentemente. '
  'Protegida por RLS no Epic 4 para isolamento multi-tenant.';

-- ---------------------------------------------------------------------------
-- 3.5 INFORMANTES
-- Zeladores, porteiros e outros contatos que fornecem leads em edificios.
-- Vinculado a N edificios via tabela associativa informantes_edificios.
-- Referencia: FR-028, FR-029, FR-030, Story 2.3
-- ---------------------------------------------------------------------------
CREATE TABLE informantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  funcao funcao_informante NOT NULL DEFAULT 'outro',
  telefone_encrypted BYTEA,            -- Criptografado via pgcrypto (LGPD)
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE informantes IS
  'Informantes — zeladores, porteiros, sindicos que fornecem leads. '
  'Vinculado a N edificios via informantes_edificios (multi-select). '
  'Telefone criptografado (LGPD). Tracking de leads originados e comissao 5%% (Regra de Ouro).';

-- ---------------------------------------------------------------------------
-- 3.6 INFORMANTES_EDIFICIOS (N:M)
-- Tabela associativa: um informante pode estar vinculado a varios edificios.
-- Referencia: Story 2.3 — "Informante vinculado a um ou mais edificios (multi-select)"
-- ---------------------------------------------------------------------------
CREATE TABLE informantes_edificios (
  informante_id UUID NOT NULL REFERENCES informantes(id) ON DELETE CASCADE,
  edificio_id UUID NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (informante_id, edificio_id)
);

COMMENT ON TABLE informantes_edificios IS
  'Tabela associativa N:M entre informantes e edificios. '
  'Um informante (zelador) pode atuar em multiplos edificios.';

-- ---------------------------------------------------------------------------
-- 3.7 ACOES_GENTILEZA
-- Marketing de Gentileza: acoes de relacionamento com informantes.
-- Presentes, visitas, parabens — com historico e lembretes.
-- Referencia: FR-030, Story 2.3 (Fase A)
-- ---------------------------------------------------------------------------
CREATE TABLE acoes_gentileza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informante_id UUID NOT NULL REFERENCES informantes(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,                      -- Ex: "Presente de Natal", "Cafe", "Visita"
  descricao TEXT,                          -- Detalhes da acao
  data_acao DATE NOT NULL DEFAULT CURRENT_DATE,
  proximo_lembrete DATE,                   -- Data do proximo follow-up
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE acoes_gentileza IS
  'Marketing de Gentileza — historico de acoes de relacionamento com informantes. '
  'Cada acao registra tipo, descricao e proximo lembrete de contato.';

-- ---------------------------------------------------------------------------
-- 3.8 LEADS (Proprietarios)
-- Proprietarios de imoveis (potenciais clientes). Nucleo do funil de vendas.
-- Campos V1 estruturados: motivacao_real, prazo_urgencia, fotos_v1_urls.
-- Telefone e email criptografados (LGPD via pgcrypto).
-- Referencia: FR-008, FR-009, FR-010, FR-011, FR-014, Stories 2.1, 2.2, 2.4
-- ---------------------------------------------------------------------------
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,    -- Edificio onde mora/tem imovel
  nome TEXT NOT NULL,
  telefone_encrypted BYTEA,                -- Criptografado via pgcrypto (LGPD — NFR-003)
  email_encrypted BYTEA,                   -- Criptografado via pgcrypto (LGPD — NFR-003)
  unidade TEXT,                            -- Apartamento/sala (ex: "Apto 121")
  origem origem_lead NOT NULL DEFAULT 'campo',
  is_fisbo BOOLEAN NOT NULL DEFAULT false,  -- Flag FISBO (For Sale By Owner)

  -- Perfil e qualificacao
  perfil_psicografico TEXT,                 -- Texto livre sobre perfil do proprietario
  o_que_valoriza TEXT[],                    -- Array: ["seguranca", "localizacao", "preco"]
  motivacao_real TEXT,                      -- Campo V1: motivacao real para venda
  prazo_urgencia prazo_urgencia,            -- Campo V1: urgencia do proprietario
  fotos_v1_urls TEXT[],                     -- Campo V1: URLs das fotos tiradas na V1

  -- FROG e funil
  fonte_frog fonte_frog,                    -- Fonte FROG do lead (FR-014)
  etapa_funil etapa_funil NOT NULL DEFAULT 'contato',
  etapa_funil_updated_at TIMESTAMPTZ DEFAULT now(),  -- Quando a etapa mudou pela ultima vez
  informante_id UUID REFERENCES informantes(id) ON DELETE SET NULL,  -- Quem indicou

  -- Notas e LGPD
  notas TEXT,
  lgpd_consent_at TIMESTAMPTZ,             -- Data do consentimento LGPD (NFR-003)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE leads IS
  'Proprietarios de imoveis — nucleo do funil de vendas RE/MAX. '
  'Campos V1 estruturados: motivacao_real, prazo_urgencia, fotos_v1_urls. '
  'Telefone e email criptografados via pgcrypto para conformidade LGPD (NFR-003). '
  'etapa_funil: Contato → V1 → V2 → Exclusividade → Venda.';

-- ---------------------------------------------------------------------------
-- 3.9 FUNNEL_TRANSITIONS
-- Historico de transicoes no funil de vendas. Cada mudanca de etapa e registrada.
-- Suporta retrocesso (is_regression) com justificativa obrigatoria (Story 2.2).
-- Referencia: FR-011, Story 2.2, Story 2.8
-- ---------------------------------------------------------------------------
CREATE TABLE funnel_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  from_stage etapa_funil NOT NULL,              -- Etapa anterior
  to_stage etapa_funil NOT NULL,                -- Nova etapa
  is_regression BOOLEAN NOT NULL DEFAULT false,  -- Retrocesso no funil
  justificativa TEXT,                            -- Obrigatoria se is_regression = true
  observacao TEXT NOT NULL,                      -- Observacao/nota da transicao
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE funnel_transitions IS
  'Historico de transicoes no funil RE/MAX. Cada mudanca de etapa e registrada. '
  'Retrocesso (is_regression=true) requer justificativa obrigatoria e gera alerta visual. '
  'Alimenta o diagnostico de gargalos (Story 2.8).';

-- ---------------------------------------------------------------------------
-- 3.10 AGENDAMENTOS
-- Agenda de visitas V1, V2 e follow-ups. "Tecnica de Duas Opcoes" (opcao_2_data_hora).
-- Referencia: FR-020, Story 2.6
-- ---------------------------------------------------------------------------
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipo tipo_agendamento NOT NULL,                -- V1, V2 ou follow_up
  data_hora TIMESTAMPTZ NOT NULL,                -- Data/hora da opcao 1
  opcao_2_data_hora TIMESTAMPTZ,                 -- "Tecnica de Duas Opcoes" — 2a opcao
  status status_agendamento NOT NULL DEFAULT 'agendado',
  notas TEXT,
  notificacao_enviada BOOLEAN NOT NULL DEFAULT false,  -- Push enviado 1h antes?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE agendamentos IS
  'Agenda V1/V2/follow-up. opcao_2_data_hora implementa a "Tecnica de Duas Opcoes" '
  'da metodologia RE/MAX. Push notification 1h antes (Story 2.6).';

-- ---------------------------------------------------------------------------
-- 3.11 SCRIPTS (Scripts de Contorno de Objecao)
-- Biblioteca de scripts RE/MAX para contornar objecoes de proprietarios.
-- Scripts default (is_default=true) sao pre-carregados. Consultora pode criar os seus.
-- Referencia: FR-013, Story 2.5
-- ---------------------------------------------------------------------------
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultores(id) ON DELETE CASCADE,  -- NULL = script default global
  titulo TEXT NOT NULL,                      -- Titulo do script
  categoria categoria_script NOT NULL,       -- Tipo de objecao
  etapa_funil etapa_funil,                   -- Etapa do funil onde e mais util (nullable)
  objecao TEXT NOT NULL,                     -- A objecao do proprietario
  resposta TEXT NOT NULL,                    -- A resposta/contorno sugerido
  is_default BOOLEAN NOT NULL DEFAULT false,  -- Scripts pre-carregados do sistema
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE scripts IS
  'Biblioteca de scripts de contorno de objecoes da metodologia RE/MAX. '
  'Scripts default (is_default=true) sao pre-carregados (seed data). '
  'Consultora pode criar scripts personalizados (consultant_id NOT NULL).';

-- ---------------------------------------------------------------------------
-- 3.12 FROG_CONTACTS
-- Contatos do metodo FROG (Familia, Relacionamentos, Organizacoes, Geografia).
-- Embaixadores FROG sao contatos que geram leads recorrentes.
-- Referencia: FR-014, Story 2.4
-- ---------------------------------------------------------------------------
CREATE TABLE frog_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria fonte_frog NOT NULL,                -- Familia, Relacionamentos, Organizacoes, Geografia
  is_embaixador BOOLEAN NOT NULL DEFAULT false,  -- Embaixador FROG = gerador recorrente de leads
  telefone_encrypted BYTEA,                     -- Criptografado via pgcrypto (LGPD)
  notas TEXT,
  leads_gerados_count INTEGER NOT NULL DEFAULT 0,  -- Contador de leads originados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE frog_contacts IS
  'Contatos FROG — Familia, Relacionamentos, Organizacoes, Geografia. '
  'Embaixadores (is_embaixador=true) sao fontes recorrentes de leads. '
  'Dashboard FROG mostra conversao por categoria (Story 2.4).';

-- ---------------------------------------------------------------------------
-- 3.13 REFERRALS (Indicacoes Cruzadas entre Consultores)
-- Sistema de referrals ganha/ganha. Funciona UNILATERAL no MVP:
-- Luciana gerencia parceiros como contatos, nao como usuarios do sistema.
-- Referencia: FR-017, FR-018, Story 4.1
-- ---------------------------------------------------------------------------
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  parceiro_nome TEXT NOT NULL,                   -- Nome do consultor parceiro
  parceiro_telefone_encrypted BYTEA,             -- Criptografado (LGPD)
  parceiro_email TEXT,                           -- Email do parceiro (nao sensivel)
  parceiro_regiao TEXT,                          -- Regiao de atuacao do parceiro
  direcao direcao_referral NOT NULL,             -- Enviada ou recebida
  perfil_cliente JSONB,                          -- Perfil do cliente indicado (JSON flexivel)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Lead criado ao aceitar (nullable)
  status status_referral NOT NULL DEFAULT 'enviada',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE referrals IS
  'Referrals ganha/ganha entre consultores (indicacoes cruzadas). '
  'Funciona UNILATERAL no MVP — parceiros sao contatos, nao usuarios. '
  'Status rastreavel: Enviada → Aceita → Em Andamento → Convertida → Comissao Paga. '
  'Multi-tenant no Epic 4 permitira referrals bidirecionais.';

-- ---------------------------------------------------------------------------
-- 3.14 COMISSOES
-- Registro de comissoes ao fechar vendas. Splits calculados mas NUNCA auto-pagos.
-- Clausula de Relacionamento (3-4%% configuravel).
-- Referencia: FR-029, Story 4.2
-- ---------------------------------------------------------------------------
CREATE TABLE comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,  -- RESTRICT: nao apagar lead com comissao
  valor_venda NUMERIC(15, 2) NOT NULL,            -- Valor total da venda (R$)
  percentual_comissao NUMERIC(5, 2) NOT NULL,     -- %% de comissao total
  valor_comissao_total NUMERIC(15, 2) NOT NULL,   -- Valor total da comissao (R$)
  split_consultora NUMERIC(15, 2) NOT NULL,       -- Parte da consultora
  split_franquia NUMERIC(15, 2) NOT NULL,         -- Parte da franquia RE/MAX
  split_informante NUMERIC(15, 2),                -- Parte do informante (5%% — Regra de Ouro)
  split_referral NUMERIC(15, 2),                  -- Parte do consultor que indicou
  split_relacionamento NUMERIC(15, 2),            -- Clausula de Relacionamento
  percentual_relacionamento NUMERIC(5, 2) DEFAULT 3.5,  -- 3-4%% configuravel
  confirmado BOOLEAN NOT NULL DEFAULT false,      -- Confirmacao manual obrigatoria — nunca auto-pagar
  data_fechamento DATE NOT NULL,                  -- Data do fechamento da venda
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE comissoes IS
  'Comissoes de vendas — splits calculados mas NUNCA auto-pagos (confirmacao manual obrigatoria). '
  'Splits: consultora + franquia + informante (5%% Regra de Ouro) + referral + relacionamento (3-4%%). '
  'Alimenta dashboard financeiro e progressao Clubes RE/MAX (Story 4.2, 4.3).';

-- ---------------------------------------------------------------------------
-- 3.15 SCRAPED_LISTINGS
-- Anuncios capturados de portais imobiliarios (ZAP, OLX, VivaReal).
-- Pipeline desacoplado: Apify Actors → Edge Function → esta tabela.
-- Match com edificios via PostGIS (ST_DWithin 50m) ou geocoding.
-- Referencia: FR-021, FR-024, FR-025, Stories 3.4, 3.6
-- ---------------------------------------------------------------------------
CREATE TABLE scraped_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal portal_scraping NOT NULL,                -- Portal de origem
  external_id TEXT NOT NULL,                       -- ID do anuncio no portal
  url TEXT NOT NULL,                               -- URL do anuncio
  titulo TEXT,                                     -- Titulo do anuncio
  endereco_raw TEXT,                               -- Endereco como aparece no portal
  endereco_normalizado TEXT,                       -- Endereco normalizado para matching
  coordinates GEOGRAPHY(Point, 4326),              -- Coordenadas (nullable — geocoding pode falhar)
  geocoding_status geocoding_status NOT NULL DEFAULT 'pending',
  preco NUMERIC(15, 2),                            -- Preco anunciado (R$)
  area_m2 NUMERIC(10, 2),                          -- Area em m2
  preco_m2 NUMERIC(15, 2),                         -- Preco por m2 (calculado)
  quartos INTEGER,
  tipo_anunciante tipo_anunciante NOT NULL DEFAULT 'desconhecido',
  is_fisbo BOOLEAN NOT NULL DEFAULT false,         -- Proprietario direto?
  edificio_matched_id UUID REFERENCES edificios(id) ON DELETE SET NULL,  -- Edificio vinculado
  match_method match_method,                       -- Como foi vinculado
  data_anuncio DATE,                               -- Data de publicacao no portal
  data_scraped TIMESTAMPTZ NOT NULL DEFAULT now(),  -- Quando foi capturado
  preco_historico JSONB DEFAULT '[]'::jsonb,        -- Historico de precos [{preco, data}]
  raw_data JSONB,                                  -- Payload completo do scraping
  is_active BOOLEAN NOT NULL DEFAULT true,          -- Anuncio ainda ativo?
  duplicate_of_id UUID REFERENCES scraped_listings(id) ON DELETE SET NULL,  -- Self-ref: duplicata de

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(portal, external_id)                      -- Um anuncio por portal
);

COMMENT ON TABLE scraped_listings IS
  'Anuncios capturados de portais imobiliarios (ZAP, OLX, VivaReal). '
  'Pipeline: Apify Actors → Edge Function scraping-ingest → matching-engine → feed. '
  'Match com edificios via ST_DWithin(50m) ou geocoding Mapbox (Stories 3.4, 3.6). '
  'duplicate_of_id: referencia cruzada entre portais para consolidacao.';

-- ---------------------------------------------------------------------------
-- 3.16 ACM_COMPARAVEIS
-- Comparaveis para Analise Comparativa de Mercado (ACM).
-- ACM funciona em modo manual-only no dia 1 — scraping e acelerador, nao dependencia (Veto PV #3).
-- Referencia: FR-015, FR-016, Story 3.1
-- ---------------------------------------------------------------------------
CREATE TABLE acm_comparaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,        -- ACM para qual lead (nullable)
  edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,  -- Edificio do comparavel
  endereco TEXT NOT NULL,                          -- Endereco do comparavel
  coordinates GEOGRAPHY(Point, 4326),              -- Para queries de raio
  area_m2 NUMERIC(10, 2) NOT NULL,                 -- Area em m2
  preco_anuncio NUMERIC(15, 2),                    -- Preco de anuncio (R$)
  preco_venda_real NUMERIC(15, 2),                 -- Preco real de venda (R$) — diferenciado
  preco_m2 NUMERIC(15, 2),                         -- Calculado: preco / area_m2
  quartos INTEGER,
  fonte fonte_comparavel NOT NULL DEFAULT 'manual',  -- Manual, scraping ou Captei
  scraped_listing_id UUID REFERENCES scraped_listings(id) ON DELETE SET NULL,  -- Se veio de scraping
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,  -- Data de referencia do dado
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE acm_comparaveis IS
  'Comparaveis para ACM (Analise Comparativa de Mercado). '
  'ACM funciona em modo manual-only — consultora cadastra comparaveis (Veto PV #3). '
  'Scraping enriquece quando disponivel. Diferencia preco_anuncio vs preco_venda_real. '
  'Queries de raio via PostGIS (ST_DWithin 500m do edificio alvo).';

-- ---------------------------------------------------------------------------
-- 3.17 SAFARI_EVENTS (Open House)
-- Eventos Safari/Open House vinculados a imovel exclusivo.
-- Referencia: Story 4.7
-- ---------------------------------------------------------------------------
CREATE TABLE safari_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Imovel exclusivo (nullable)
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_evento TIMESTAMPTZ NOT NULL,
  link_compartilhavel TEXT,                        -- Link para convite
  checklist JSONB DEFAULT '[]'::jsonb,             -- Checklist de preparacao
  feedback_pos_evento JSONB,                       -- Feedback e propostas pos-evento
  status status_safari NOT NULL DEFAULT 'planejado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE safari_events IS
  'Eventos Safari/Open House — vinculados a imovel exclusivo. '
  'Convite a parceiros + link compartilhavel, RSVP tracking, checklist, feedback pos-evento.';

-- ---------------------------------------------------------------------------
-- 3.18 SAFARI_EVENT_RSVPS
-- RSVPs de parceiros para eventos Safari/Open House.
-- Referencia: Story 4.7
-- ---------------------------------------------------------------------------
CREATE TABLE safari_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES safari_events(id) ON DELETE CASCADE,
  parceiro_nome TEXT NOT NULL,
  parceiro_email TEXT,
  status status_rsvp NOT NULL DEFAULT 'convidado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE safari_event_rsvps IS
  'RSVPs de parceiros para eventos Safari/Open House.';

-- ---------------------------------------------------------------------------
-- 3.19 INTELLIGENCE_FEED
-- Feed de inteligencia — eventos e alertas gerados pelo sistema.
-- Alimentado por triggers de banco e Edge Functions.
-- Referencia: FR-025, Story 3.7
-- ---------------------------------------------------------------------------
CREATE TABLE intelligence_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipo tipo_feed NOT NULL,                         -- Tipo de evento
  titulo TEXT NOT NULL,                            -- Titulo curto do alerta
  descricao TEXT,                                  -- Descricao detalhada
  prioridade prioridade_feed NOT NULL DEFAULT 'media',
  entity_type TEXT,                                -- Tipo da entidade relacionada (ex: "scraped_listing")
  entity_id UUID,                                  -- ID da entidade relacionada
  coordinates GEOGRAPHY(Point, 4326),              -- Para pin de alerta no mapa
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_push_sent BOOLEAN NOT NULL DEFAULT false,     -- Push notification enviado?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE intelligence_feed IS
  'Feed de inteligencia — alertas e eventos do sistema. '
  'Tipos: novo_fisbo, mudanca_preco, ex_imobiliaria, raio_desbloqueado, lead_parado, etc. '
  'Alimentado por triggers (scraped_listings) e Edge Functions. '
  'Pins de alerta no mapa via coordinates (Story 3.7).';

-- ---------------------------------------------------------------------------
-- 3.20 MARKETING_PLANS
-- Plano de Marketing Ativo por imovel — auto-criado ao fechar exclusividade.
-- Referencia: Story 4.8
-- ---------------------------------------------------------------------------
CREATE TABLE marketing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Itens: portais, redes, Safari, fotos, tour, placa
  progresso_percentual INTEGER NOT NULL DEFAULT 0,  -- 0-100
  template_id TEXT,                                 -- Template usado (customizavel)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE marketing_plans IS
  'Plano de Marketing Ativo por imovel — auto-criado ao fechar exclusividade. '
  'Checklist: portais, redes sociais, Safari, fotos profissionais, tour virtual, placa. '
  'Itens checkaveis com evidencia, progresso visual, lembretes.';

-- ---------------------------------------------------------------------------
-- 3.21 DOSSIES
-- Dossie/Showcase V2 — PDF gerado via React-PDF (client-side).
-- Compila ACM + Plano Marketing + historico + branding.
-- Referencia: FR-031, Story 3.2
-- ---------------------------------------------------------------------------
CREATE TABLE dossies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,                      -- Caminho no Supabase Storage
  versao INTEGER NOT NULL DEFAULT 1,               -- Versionamento do dossie
  dados_snapshot JSONB,                            -- Snapshot dos dados usados na geracao
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dossies IS
  'Dossie/Showcase V2 — PDF profissional gerado via React-PDF (client-side, funciona offline). '
  'Compila ACM + Plano Marketing + historico + branding RE/MAX + Luciana Borba.';

-- ---------------------------------------------------------------------------
-- 3.22 CHECKLISTS_PREPARACAO
-- Checklists de preparacao V1→V2, Home Staging e Safari.
-- Referencia: Story 2.6b, Story 3.3
-- ---------------------------------------------------------------------------
CREATE TABLE checklists_preparacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo tipo_checklist NOT NULL,                     -- v1_para_v2, home_staging, safari
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,         -- [{nome, concluido, evidencia_url}]
  progresso_percentual INTEGER NOT NULL DEFAULT 0,  -- 0-100
  notificacao_24h_enviada BOOLEAN NOT NULL DEFAULT false,  -- Lembrete 24h antes da V2
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE checklists_preparacao IS
  'Checklists de preparacao — V1→V2 (ACM, Dossie, Home Staging, Matricula, Plano Marketing), '
  'Home Staging (compartilhavel WhatsApp), Safari. Notificacao 24h antes (Story 2.6b).';

-- ---------------------------------------------------------------------------
-- 3.23 CONSULTANT_SETTINGS
-- Configuracoes pessoais do consultor — meta diaria, clube atual, tema, etc.
-- Referencia: FR-019, Stories 2.9, 4.3
-- ---------------------------------------------------------------------------
CREATE TABLE consultant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL UNIQUE REFERENCES consultores(id) ON DELETE CASCADE,
  meta_v1_diaria INTEGER NOT NULL DEFAULT 5,        -- Meta "5 V1s/dia" (configuravel)
  clube_remax_atual clube_remax,                    -- Clube RE/MAX atual do consultor
  vgv_acumulado NUMERIC(15, 2) NOT NULL DEFAULT 0,  -- Valor Geral de Vendas acumulado (R$)
  meta_vgv_anual NUMERIC(15, 2),                    -- Meta pessoal de VGV anual
  percentual_relacionamento_default NUMERIC(5, 2) NOT NULL DEFAULT 3.5,  -- Clausula padrao
  notificacoes_push BOOLEAN NOT NULL DEFAULT true,
  tema TEXT NOT NULL DEFAULT 'remax',               -- Tema visual (branding)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE consultant_settings IS
  'Configuracoes pessoais — meta V1 diaria (default 5), clube RE/MAX atual, VGV acumulado, '
  'meta VGV anual, clausula de relacionamento padrao, notificacoes. '
  'UNIQUE(consultant_id): 1 registro de settings por consultor.';


-- =============================================================================
-- 4. INDEXES
-- Organizados por tipo: geoespacial (GIST), lookup (B-tree), compostos, parciais
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 GIST (Geoespacial) — queries PostGIS de raio, matching, proximidade
-- ---------------------------------------------------------------------------
CREATE INDEX idx_edificios_coordinates
  ON edificios USING GIST (coordinates);

CREATE INDEX idx_epicentros_coordinates
  ON epicentros USING GIST (coordinates);

CREATE INDEX idx_scraped_listings_coordinates
  ON scraped_listings USING GIST (coordinates);

CREATE INDEX idx_acm_comparaveis_coordinates
  ON acm_comparaveis USING GIST (coordinates);

CREATE INDEX idx_intelligence_feed_coordinates
  ON intelligence_feed USING GIST (coordinates);

-- ---------------------------------------------------------------------------
-- 4.2 B-tree — lookup por consultor (RLS, queries frequentes)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_edificios_qual_consultant
  ON edificios_qualificacoes (consultant_id);

CREATE INDEX idx_edificios_qual_edificio
  ON edificios_qualificacoes (edificio_id);

CREATE INDEX idx_leads_consultant
  ON leads (consultant_id);

CREATE INDEX idx_leads_edificio
  ON leads (edificio_id);

CREATE INDEX idx_funnel_transitions_lead
  ON funnel_transitions (lead_id);

CREATE INDEX idx_informantes_consultant
  ON informantes (consultant_id);

CREATE INDEX idx_frog_contacts_consultant
  ON frog_contacts (consultant_id);

CREATE INDEX idx_referrals_consultant
  ON referrals (consultant_id);

CREATE INDEX idx_comissoes_consultant
  ON comissoes (consultant_id);

CREATE INDEX idx_agendamentos_lead
  ON agendamentos (lead_id);

CREATE INDEX idx_acm_comparaveis_consultant
  ON acm_comparaveis (consultant_id);

CREATE INDEX idx_marketing_plans_lead
  ON marketing_plans (lead_id);

CREATE INDEX idx_dossies_lead
  ON dossies (lead_id);

CREATE INDEX idx_checklists_lead
  ON checklists_preparacao (lead_id);

CREATE INDEX idx_safari_events_consultant
  ON safari_events (consultant_id);

CREATE INDEX idx_safari_rsvps_event
  ON safari_event_rsvps (event_id);

-- ---------------------------------------------------------------------------
-- 4.3 Compostos — queries com filtros combinados frequentes
-- ---------------------------------------------------------------------------

-- Qualificacoes por consultor + status (mapa filtrado por status)
CREATE INDEX idx_edificios_qual_status
  ON edificios_qualificacoes (consultant_id, status_varredura);

-- Leads por consultor + etapa (funil de vendas filtrado)
CREATE INDEX idx_leads_etapa
  ON leads (consultant_id, etapa_funil);

-- Scraped listings por portal + external_id (upsert durante ingestao)
CREATE INDEX idx_scraped_listings_portal_extid
  ON scraped_listings (portal, external_id);

-- Feed por consultor + data (timeline cronologica)
CREATE INDEX idx_intelligence_feed_created
  ON intelligence_feed (consultant_id, created_at DESC);

-- Agendamentos por consultor + data (agenda cronologica)
CREATE INDEX idx_agendamentos_consultant_data
  ON agendamentos (consultant_id, data_hora);

-- Referrals por consultor + status
CREATE INDEX idx_referrals_status
  ON referrals (consultant_id, status);

-- ---------------------------------------------------------------------------
-- 4.4 Parciais (WHERE) — filtros frequentes em subconjuntos
-- ---------------------------------------------------------------------------

-- Scraped listings FISBO ativos (prioridade de prospeccao)
CREATE INDEX idx_scraped_listings_fisbo_active
  ON scraped_listings (is_fisbo)
  WHERE is_fisbo = true AND is_active = true;

-- Scraped listings ativos (excluir desativados de queries)
CREATE INDEX idx_scraped_listings_active
  ON scraped_listings (is_active)
  WHERE is_active = true;

-- Feed nao lido por consultor (badge de notificacoes)
CREATE INDEX idx_intelligence_feed_unread
  ON intelligence_feed (consultant_id, is_read)
  WHERE is_read = false;

-- Epicentro ativo por consultor (apenas 1 ativo)
CREATE INDEX idx_epicentros_active
  ON epicentros (consultant_id, is_active)
  WHERE is_active = true;

-- Qualificacoes com FISBO detectado
CREATE INDEX idx_edificios_qual_fisbo
  ON edificios_qualificacoes (consultant_id, is_fisbo_detected)
  WHERE is_fisbo_detected = true;


-- =============================================================================
-- 5. FUNCOES PostGIS
-- Funcoes customizadas para queries geoespaciais reutilizaveis
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 fn_edificios_no_raio
-- Retorna edificios dentro de X metros de um ponto, com qualificacao do consultor.
-- Uso principal: renderizar pins no mapa com dados de qualificacao.
-- Referencia: FR-001, FR-004, Q1 da arquitetura
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_edificios_no_raio(
  p_consultant_id UUID,
  p_center_lng DOUBLE PRECISION,
  p_center_lat DOUBLE PRECISION,
  p_raio_metros INTEGER
)
RETURNS TABLE (
  edificio_id UUID,
  nome TEXT,
  endereco TEXT,
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  bairro TEXT,
  origem origem_edificio,
  verificado BOOLEAN,
  -- Qualificacao (pode ser NULL se nao qualificado)
  qualificacao_id UUID,
  tipologia tipologia_edificio,
  padrao padrao_edificio,
  status_varredura status_varredura,
  abertura_corretores abertura_corretores,
  oportunidades_count INTEGER,
  is_fisbo_detected BOOLEAN,
  distancia_metros DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id AS edificio_id,
    e.nome,
    e.endereco,
    ST_X(e.coordinates::geometry) AS lng,
    ST_Y(e.coordinates::geometry) AS lat,
    e.bairro,
    e.origem,
    e.verificado,
    eq.id AS qualificacao_id,
    eq.tipologia,
    eq.padrao,
    COALESCE(eq.status_varredura, 'nao_visitado') AS status_varredura,
    eq.abertura_corretores,
    COALESCE(eq.oportunidades_count, 0) AS oportunidades_count,
    COALESCE(eq.is_fisbo_detected, false) AS is_fisbo_detected,
    ST_Distance(
      e.coordinates,
      ST_SetSRID(ST_MakePoint(p_center_lng, p_center_lat), 4326)::geography
    ) AS distancia_metros
  FROM edificios e
  LEFT JOIN edificios_qualificacoes eq
    ON eq.edificio_id = e.id
    AND eq.consultant_id = p_consultant_id
  WHERE ST_DWithin(
    e.coordinates,
    ST_SetSRID(ST_MakePoint(p_center_lng, p_center_lat), 4326)::geography,
    p_raio_metros
  )
  ORDER BY distancia_metros ASC;
$$;

COMMENT ON FUNCTION fn_edificios_no_raio IS
  'Retorna edificios dentro de X metros de um ponto, com qualificacao do consultor. '
  'LEFT JOIN com edificios_qualificacoes: retorna mesmo edificios nao qualificados (status=nao_visitado).';

-- ---------------------------------------------------------------------------
-- 5.2 fn_cobertura_raio
-- Calcula percentual de cobertura: edificios qualificados / total no raio.
-- Usado para logica de expansao (80% → desbloqueia proximo raio).
-- Referencia: FR-004, Story 2.7, Q2 da arquitetura
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cobertura_raio(
  p_consultant_id UUID,
  p_raio_metros INTEGER DEFAULT NULL  -- NULL = usa raio_ativo do epicentro
)
RETURNS TABLE (
  total_edificios BIGINT,
  edificios_visitados BIGINT,
  percentual_cobertura NUMERIC(5, 1),
  raio_usado INTEGER
)
LANGUAGE sql STABLE
AS $$
  WITH epicentro AS (
    SELECT coordinates, raio_ativo_m
    FROM epicentros
    WHERE consultant_id = p_consultant_id AND is_active = true
    LIMIT 1
  ),
  raio_efetivo AS (
    SELECT COALESCE(p_raio_metros, (SELECT raio_ativo_m FROM epicentro)) AS valor
  ),
  edificios_no_raio AS (
    SELECT e.id
    FROM edificios e, epicentro ep
    WHERE ST_DWithin(e.coordinates, ep.coordinates, (SELECT valor FROM raio_efetivo))
  ),
  qualificados AS (
    SELECT eq.edificio_id
    FROM edificios_qualificacoes eq
    JOIN edificios_no_raio enr ON enr.id = eq.edificio_id
    WHERE eq.consultant_id = p_consultant_id
      AND eq.status_varredura != 'nao_visitado'
  )
  SELECT
    (SELECT COUNT(*) FROM edificios_no_raio) AS total_edificios,
    (SELECT COUNT(*) FROM qualificados) AS edificios_visitados,
    CASE
      WHEN (SELECT COUNT(*) FROM edificios_no_raio) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*) FROM qualificados)::numeric /
        (SELECT COUNT(*) FROM edificios_no_raio)::numeric * 100, 1
      )
    END AS percentual_cobertura,
    (SELECT valor FROM raio_efetivo) AS raio_usado;
$$;

COMMENT ON FUNCTION fn_cobertura_raio IS
  'Calcula percentual de cobertura do raio. '
  'Ao atingir 80%%, sistema notifica e desbloqueia proximo raio (500→1000→2000). '
  'Se p_raio_metros = NULL, usa o raio_ativo_m do epicentro ativo.';

-- ---------------------------------------------------------------------------
-- 5.3 fn_match_listing_edificio
-- Matching engine: encontra edificio mais proximo de coordenadas dentro de 50m.
-- Usado pelo pipeline de scraping para vincular anuncios a edificios.
-- Referencia: FR-021, Story 3.4, Q3 da arquitetura
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_match_listing_edificio(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_distance_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  edificio_id UUID,
  nome_edificio TEXT,
  distancia_metros DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id AS edificio_id,
    e.nome AS nome_edificio,
    ST_Distance(
      e.coordinates,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distancia_metros
  FROM edificios e
  WHERE ST_DWithin(
    e.coordinates,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_distance_meters
  )
  ORDER BY distancia_metros ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION fn_match_listing_edificio IS
  'Matching engine: encontra edificio mais proximo dentro de X metros (default 50m). '
  'Usado pelo pipeline de scraping para vincular scraped_listings a edificios (Story 3.4).';

-- ---------------------------------------------------------------------------
-- 5.4 fn_match_listings_batch
-- Match em lote: atualiza todas as scraped_listings sem match que tenham coordenadas.
-- Chamado pela Edge Function matching-engine.
-- Referencia: Story 3.4
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_match_listings_batch(
  p_distance_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  listings_matched BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE scraped_listings sl
  SET
    edificio_matched_id = match.edificio_id,
    match_method = 'postgis',
    geocoding_status = 'matched',
    updated_at = now()
  FROM (
    SELECT DISTINCT ON (sl2.id)
      sl2.id AS listing_id,
      e.id AS edificio_id
    FROM scraped_listings sl2
    JOIN edificios e
      ON ST_DWithin(e.coordinates, sl2.coordinates, p_distance_meters)
    WHERE sl2.coordinates IS NOT NULL
      AND sl2.edificio_matched_id IS NULL
    ORDER BY sl2.id, ST_Distance(e.coordinates, sl2.coordinates) ASC
  ) AS match
  WHERE sl.id = match.listing_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION fn_match_listings_batch IS
  'Match em lote: vincula scraped_listings sem match a edificios por proximidade PostGIS. '
  'Retorna quantidade de listings matched.';

-- ---------------------------------------------------------------------------
-- 5.5 fn_comparaveis_no_raio
-- Busca comparaveis para ACM dentro de X metros de um edificio.
-- Referencia: FR-015, Story 3.1, Q4 da arquitetura
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_comparaveis_no_raio(
  p_consultant_id UUID,
  p_edificio_id UUID,
  p_raio_metros INTEGER DEFAULT 500,
  p_meses_atras INTEGER DEFAULT 6
)
RETURNS TABLE (
  comparavel_id UUID,
  endereco TEXT,
  area_m2 NUMERIC,
  preco_anuncio NUMERIC,
  preco_venda_real NUMERIC,
  preco_m2 NUMERIC,
  quartos INTEGER,
  fonte fonte_comparavel,
  data_referencia DATE,
  distancia_metros DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ac.id AS comparavel_id,
    ac.endereco,
    ac.area_m2,
    ac.preco_anuncio,
    ac.preco_venda_real,
    ac.preco_m2,
    ac.quartos,
    ac.fonte,
    ac.data_referencia,
    ST_Distance(
      ac.coordinates,
      (SELECT coordinates FROM edificios WHERE id = p_edificio_id)
    ) AS distancia_metros
  FROM acm_comparaveis ac
  WHERE ac.consultant_id = p_consultant_id
    AND ac.coordinates IS NOT NULL
    AND ST_DWithin(
      ac.coordinates,
      (SELECT coordinates FROM edificios WHERE id = p_edificio_id),
      p_raio_metros
    )
    AND ac.data_referencia >= CURRENT_DATE - (p_meses_atras || ' months')::interval
  ORDER BY ac.data_referencia DESC;
$$;

COMMENT ON FUNCTION fn_comparaveis_no_raio IS
  'Comparaveis para ACM dentro de X metros de um edificio, nos ultimos N meses. '
  'Default: 500m, 6 meses. Diferencia preco_anuncio vs preco_venda_real (Story 3.1).';

-- ---------------------------------------------------------------------------
-- 5.6 fn_sugestao_proximo_bloco
-- Sugere proximas ruas/blocos para varredura, agrupados por endereco.
-- Referencia: FR-005, Q5 da arquitetura
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sugestao_proximo_bloco(
  p_consultant_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  rua TEXT,
  edificios_nao_visitados BIGINT,
  distancia_minima_metros DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  WITH epicentro AS (
    SELECT coordinates, raio_ativo_m
    FROM epicentros
    WHERE consultant_id = p_consultant_id AND is_active = true
    LIMIT 1
  )
  SELECT
    e.endereco AS rua,
    COUNT(*) AS edificios_nao_visitados,
    MIN(ST_Distance(e.coordinates, ep.coordinates)) AS distancia_minima_metros
  FROM edificios e
  CROSS JOIN epicentro ep
  LEFT JOIN edificios_qualificacoes eq
    ON eq.edificio_id = e.id AND eq.consultant_id = p_consultant_id
  WHERE (eq.id IS NULL OR eq.status_varredura = 'nao_visitado')
    AND ST_DWithin(e.coordinates, ep.coordinates, ep.raio_ativo_m)
  GROUP BY e.endereco
  ORDER BY COUNT(*) DESC, MIN(ST_Distance(e.coordinates, ep.coordinates)) ASC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION fn_sugestao_proximo_bloco IS
  'Sugere proximos blocos/ruas para varredura. Prioriza: mais edificios nao visitados, mais proximos. '
  'Usado para guiar a consultora durante o campo (FR-005).';


-- =============================================================================
-- 6. TRIGGERS
-- Automacoes de banco: updated_at, feed de inteligencia, validacoes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 6.1 Trigger generico: atualizar updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas as tabelas com updated_at
CREATE TRIGGER trg_consultores_updated_at
  BEFORE UPDATE ON consultores FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_epicentros_updated_at
  BEFORE UPDATE ON epicentros FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_edificios_updated_at
  BEFORE UPDATE ON edificios FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_edificios_qual_updated_at
  BEFORE UPDATE ON edificios_qualificacoes FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_informantes_updated_at
  BEFORE UPDATE ON informantes FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_scripts_updated_at
  BEFORE UPDATE ON scripts FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_frog_contacts_updated_at
  BEFORE UPDATE ON frog_contacts FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_comissoes_updated_at
  BEFORE UPDATE ON comissoes FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_scraped_listings_updated_at
  BEFORE UPDATE ON scraped_listings FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_acm_comparaveis_updated_at
  BEFORE UPDATE ON acm_comparaveis FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_safari_events_updated_at
  BEFORE UPDATE ON safari_events FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_intelligence_feed_no_update
  -- intelligence_feed e append-only, nao precisa de updated_at
  BEFORE UPDATE ON intelligence_feed FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_marketing_plans_updated_at
  BEFORE UPDATE ON marketing_plans FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_dossies_updated_at
  BEFORE UPDATE ON dossies FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_checklists_updated_at
  BEFORE UPDATE ON checklists_preparacao FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_consultant_settings_updated_at
  BEFORE UPDATE ON consultant_settings FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ---------------------------------------------------------------------------
-- 6.2 Trigger: atualizar etapa_funil_updated_at no lead ao mudar etapa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_lead_etapa_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.etapa_funil IS DISTINCT FROM OLD.etapa_funil THEN
    NEW.etapa_funil_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_etapa_timestamp
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION fn_update_lead_etapa_timestamp();

-- ---------------------------------------------------------------------------
-- 6.3 Trigger: novo FISBO detectado → feed de inteligencia
-- Referencia: Story 3.7
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_notify_new_fisbo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_fisbo = true AND (OLD IS NULL OR OLD.is_fisbo = false) THEN
    INSERT INTO intelligence_feed (
      consultant_id, tipo, titulo, descricao, prioridade,
      entity_type, entity_id, coordinates, is_read, is_push_sent
    )
    SELECT
      c.id,
      'novo_fisbo',
      'Novo FISBO detectado: ' || COALESCE(NEW.titulo, 'Sem titulo'),
      'Anuncio de proprietario em ' || COALESCE(NEW.endereco_raw, 'endereco desconhecido')
        || ' no ' || NEW.portal,
      'alta',
      'scraped_listing',
      NEW.id,
      NEW.coordinates,
      false,
      false
    FROM consultores c
    WHERE EXISTS (
      SELECT 1 FROM epicentros ep
      WHERE ep.consultant_id = c.id
        AND ep.is_active = true
        AND NEW.coordinates IS NOT NULL
        AND ST_DWithin(NEW.coordinates, ep.coordinates, ep.raio_ativo_m)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_new_fisbo
  AFTER INSERT OR UPDATE ON scraped_listings
  FOR EACH ROW EXECUTE FUNCTION fn_notify_new_fisbo();

-- ---------------------------------------------------------------------------
-- 6.4 Trigger: mudanca de preco → feed de inteligencia + historico
-- Referencia: Story 3.7
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_notify_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.preco IS NOT NULL AND NEW.preco IS NOT NULL
     AND OLD.preco != NEW.preco THEN
    -- Append ao historico de preco
    NEW.preco_historico = COALESCE(OLD.preco_historico, '[]'::jsonb) ||
      jsonb_build_object('preco', OLD.preco, 'data', now());

    -- Inserir alerta no feed para consultores no raio
    INSERT INTO intelligence_feed (
      consultant_id, tipo, titulo, descricao, prioridade,
      entity_type, entity_id, coordinates
    )
    SELECT
      c.id,
      'mudanca_preco',
      'Preco alterado: ' || COALESCE(NEW.titulo, 'Anuncio'),
      'De R$ ' || TRIM(to_char(OLD.preco, '999G999G999D00')) ||
        ' para R$ ' || TRIM(to_char(NEW.preco, '999G999G999D00')) ||
        ' (' || TRIM(to_char(((NEW.preco - OLD.preco) / OLD.preco * 100), '990D0')) || '%)',
      CASE WHEN NEW.preco < OLD.preco THEN 'alta' ELSE 'media' END,
      'scraped_listing',
      NEW.id,
      NEW.coordinates
    FROM consultores c
    WHERE NEW.coordinates IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM epicentros ep
        WHERE ep.consultant_id = c.id
          AND ep.is_active = true
          AND ST_DWithin(NEW.coordinates, ep.coordinates, 2000)
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_price_change
  BEFORE UPDATE ON scraped_listings
  FOR EACH ROW EXECUTE FUNCTION fn_notify_price_change();

-- ---------------------------------------------------------------------------
-- 6.5 Trigger: validar retrocesso no funil (justificativa obrigatoria)
-- Referencia: Story 2.2 — "Retrocesso com 3 guardrails: justificativa obrigatoria"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_funnel_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Se e retrocesso, justificativa e obrigatoria
  IF NEW.is_regression = true AND (NEW.justificativa IS NULL OR TRIM(NEW.justificativa) = '') THEN
    RAISE EXCEPTION 'Retrocesso no funil requer justificativa obrigatoria (Story 2.2)'
      USING HINT = 'Preencha o campo justificativa ao registrar um retrocesso.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_funnel_transition
  BEFORE INSERT ON funnel_transitions
  FOR EACH ROW EXECUTE FUNCTION fn_validate_funnel_transition();


-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- MVP: DESABILITADO (single-user). Preparado para Epic 4 (multi-tenant).
-- Policies criadas mas RLS ativado apenas com comentario.
-- Para habilitar: descomentar os ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- NOTA: No MVP (single-user, Luciana Borba), RLS fica DESABILITADO para simplicidade.
-- Ao habilitar multi-tenant (Epic 4), descomentar as linhas abaixo e garantir que
-- auth.uid() corresponde ao consultant_id em todas as tabelas.

-- ---------------------------------------------------------------------------
-- 7.1 Edificios — visiveis para todos os autenticados (futuramente publicos)
-- ---------------------------------------------------------------------------
-- ALTER TABLE edificios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edificios_select_authenticated"
  ON edificios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "edificios_insert_authenticated"
  ON edificios FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (created_by = auth.uid() OR origem = 'seed')
  );

CREATE POLICY "edificios_update_own"
  ON edificios FOR UPDATE
  USING (created_by = auth.uid() OR origem = 'seed');

-- ---------------------------------------------------------------------------
-- 7.2 Edificios_qualificacoes — privadas por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE edificios_qualificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edificios_qual_own"
  ON edificios_qualificacoes FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.3 Leads — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_own"
  ON leads FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.4 Funnel transitions — privadas por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE funnel_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "funnel_transitions_own"
  ON funnel_transitions FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.5 Agendamentos — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agendamentos_own"
  ON agendamentos FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.6 Informantes — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE informantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "informantes_own"
  ON informantes FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.7 Acoes de gentileza — privadas por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE acoes_gentileza ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acoes_gentileza_own"
  ON acoes_gentileza FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.8 Scripts — default visiveis para todos, custom por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scripts_select"
  ON scripts FOR SELECT
  USING (is_default = true OR consultant_id = auth.uid());

CREATE POLICY "scripts_modify_own"
  ON scripts FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.9 FROG contacts — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE frog_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frog_contacts_own"
  ON frog_contacts FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.10 Referrals — visiveis para o consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_own"
  ON referrals FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.11 Comissoes — privadas por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comissoes_own"
  ON comissoes FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.12 Scraped listings — visiveis para todos os autenticados (dados publicos)
-- ---------------------------------------------------------------------------
-- ALTER TABLE scraped_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scraped_listings_select_authenticated"
  ON scraped_listings FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 7.13 ACM comparaveis — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE acm_comparaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acm_comparaveis_own"
  ON acm_comparaveis FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.14 Safari events — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE safari_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safari_events_own"
  ON safari_events FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.15 Intelligence feed — privado por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE intelligence_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intelligence_feed_own"
  ON intelligence_feed FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.16 Marketing plans — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE marketing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_plans_own"
  ON marketing_plans FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.17 Dossies — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE dossies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dossies_own"
  ON dossies FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.18 Checklists — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE checklists_preparacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklists_own"
  ON checklists_preparacao FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.19 Consultant settings — privado por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE consultant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultant_settings_own"
  ON consultant_settings FOR ALL
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7.20 Epicentros — privados por consultor
-- ---------------------------------------------------------------------------
-- ALTER TABLE epicentros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epicentros_own"
  ON epicentros FOR ALL
  USING (consultant_id = auth.uid());


-- =============================================================================
-- 8. SEED DATA
-- Dados iniciais do sistema: scripts de objecao, clubes RE/MAX, etapas do funil
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 8.1 Scripts de Objecao Default (Metodologia RE/MAX)
-- Baseados nos PDFs de referencia: Alta Performance Imobiliaria,
-- Guia de Prospeccao, Guia de Procedimento V1/V2
-- ---------------------------------------------------------------------------
INSERT INTO scripts (consultant_id, titulo, categoria, etapa_funil, objecao, resposta, is_default) VALUES

-- Resistencia a trabalhar com corretor/imobiliaria
(NULL, 'Nao trabalho com imobiliarias',
 'resistencia_corretor', 'contato',
 'Nao trabalho com imobiliarias. Prefiro vender sozinho.',
 'Entendo perfeitamente. Na verdade, o consultor RE/MAX nao e uma imobiliaria tradicional — sou uma consultora independente que trabalha para VOCE, nao para a empresa. Meu papel e maximizar o valor do seu imovel e reduzir o tempo de venda. Posso te mostrar dados de mercado da sua regiao sem compromisso?',
 true),

(NULL, 'Ja tive experiencia ruim com corretor',
 'experiencia_negativa', 'contato',
 'Ja tive experiencia ruim com corretor. Nao confio.',
 'Sinto muito por isso. Infelizmente, experiencias ruins acontecem quando falta processo e transparencia. Na RE/MAX, trabalho com um metodo estruturado: voce tem visibilidade total do que esta acontecendo, relatorios semanais de atividade e um plano de marketing documentado. Que tal conhecer como funciona, sem compromisso?',
 true),

(NULL, 'A comissao e muito alta',
 'preco_comissao', 'v1',
 'A comissao de 6% e muito alta. Consigo vender sozinho.',
 'Entendo a preocupacao com custos. Porem, estatisticamente, imoveis vendidos por profissionais alcancam precos 10-15% superiores ao que proprietarios conseguem sozinhos. Alem disso, o tempo medio de venda cai de 12 para 4 meses. Ou seja, a comissao se paga com o preco maior e o tempo menor. Posso te mostrar os numeros da sua regiao?',
 true),

(NULL, 'Nao quero exclusividade',
 'exclusividade', 'v2',
 'Nao quero dar exclusividade. Quero varios corretores vendendo.',
 'E natural pensar que mais corretores = mais chances. Na pratica, e o contrario: sem exclusividade, nenhum corretor investe de verdade no seu imovel. Com exclusividade, eu invisto em fotos profissionais, tour virtual, anuncios pagos e um plano completo de marketing. O resultado: imoveis exclusivos vendem em media 45% mais rapido. Posso te mostrar o plano que preparei para o seu?',
 true),

-- Tecnica de Fechamento: Fecho de Duas Opcoes
(NULL, 'Fecho de Duas Opcoes — Agendamento V1',
 'tecnica_fechamento', 'contato',
 '[Tecnica de fechamento para agendar V1]',
 'Fico muito feliz com seu interesse! Para fazermos a avaliacao do seu imovel, o que funciona melhor para voce: terca-feira as 10h ou quinta-feira as 14h? [Oferece duas opcoes — nunca pergunta "quando voce pode"]',
 true),

(NULL, 'Fecho de Duas Opcoes — Agendamento V2',
 'tecnica_fechamento', 'v1',
 '[Tecnica de fechamento para agendar V2]',
 'Preparei o Dossie completo do seu imovel com a Analise Comparativa de Mercado e o Plano de Marketing. Para apresentar pessoalmente, fica melhor segunda as 15h ou quarta as 10h? [Duas opcoes, nunca pergunta aberta]',
 true),

-- Rapport e confianca
(NULL, 'Construindo rapport — Primeiro contato de campo',
 'rapport', 'contato',
 '[Como abordar proprietario em campo pela primeira vez]',
 'Bom dia! Sou Luciana Borba, consultora RE/MAX aqui na regiao de Moema. Estou fazendo um trabalho de mapeamento do bairro e gostaria de saber: voce conhece alguem aqui no edificio que esteja pensando em vender ou alugar? [Abordagem indireta — nao pressiona, coleta informacao]',
 true),

(NULL, 'Proprietario indeciso — criar senso de urgencia',
 'tecnica_fechamento', 'v2',
 'Preciso pensar mais. Nao estou com pressa.',
 'Compreendo que e uma decisao importante. Gostaria de compartilhar um dado: nesta regiao, imoveis similares ao seu estao sendo vendidos em media em X dias. O mercado esta [aquecido/estavel], e comecar agora nos da vantagem na janela de melhor demanda. Que tal fazermos o seguinte: assinamos a exclusividade por 90 dias — se nao estiver satisfeita, voce encerra sem custo?',
 true),

-- Tempo de mercado
(NULL, 'Meu imovel ja esta anunciado ha muito tempo',
 'tempo_mercado', 'contato',
 'Meu imovel ja esta anunciado ha meses e ninguem aparece.',
 'Isso e mais comum do que parece, e geralmente indica um de dois problemas: posicionamento de preco ou estrategia de divulgacao. Posso fazer uma Analise Comparativa de Mercado gratuita para identificar exatamente o que esta acontecendo. Muitas vezes, um ajuste simples na apresentacao e no preco destravam a venda rapidamente.',
 true),

-- Script extra de objecao
(NULL, 'Vou vender para parente/conhecido',
 'resistencia_corretor', 'contato',
 'Ja tenho comprador certo, e um conhecido/parente.',
 'Que otimo que voce ja tem interesse! Mesmo assim, ter um consultor protege ambas as partes: garanto documentacao correta, avaliacao justa e todo o suporte juridico. Muitas vendas entre conhecidos geram conflitos justamente por falta de um profissional neutro. Posso te ajudar a fechar com seguranca — e o custo-beneficio compensa pela tranquilidade.',
 true);

-- ---------------------------------------------------------------------------
-- 8.2 Thresholds dos Clubes RE/MAX
-- Inseridos como referencia na tabela consultant_settings via comentario.
-- Nao ha tabela dedicada — os thresholds sao constantes da aplicacao.
-- ---------------------------------------------------------------------------

-- REFERENCIA: Thresholds Clubes RE/MAX (valores anuais em VGV)
-- Estes valores devem ser configurados como constantes na aplicacao (env vars ou config),
-- pois podem variar por ano e por pais. Abaixo, os valores de referencia 2026 Brasil:
--
-- | Clube        | VGV Minimo Anual (R$) | Descricao                              |
-- |--------------|-----------------------|----------------------------------------|
-- | Executive    |          500.000,00   | Nivel de entrada                       |
-- | 100%         |        1.000.000,00   | Clube 100%                             |
-- | Platinum     |        2.500.000,00   | Alta performance                       |
-- | Chairman's   |        5.000.000,00   | Conselho do presidente                 |
-- | Titan        |       10.000.000,00   | Top performer                          |
-- | Diamond      |       20.000.000,00   | Elite                                  |
-- | Pinnacle     |       50.000.000,00   | Nivel maximo — referencia global RE/MAX |
--
-- Para uso programatico, use a tabela auxiliar abaixo:

CREATE TABLE IF NOT EXISTS clubes_remax_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clube clube_remax NOT NULL UNIQUE,
  vgv_minimo_anual NUMERIC(15, 2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE clubes_remax_thresholds IS
  'Thresholds dos Clubes RE/MAX — valores minimos anuais de VGV para cada nivel. '
  'Valores de referencia 2026 Brasil. Atualizaveis pela consultora/franquia.';

INSERT INTO clubes_remax_thresholds (clube, vgv_minimo_anual, descricao) VALUES
  ('executive',    500000.00,   'Nivel de entrada — primeiros passos em alta performance'),
  ('100_percent',  1000000.00,  'Clube 100% — meta basica de volume anual'),
  ('platinum',     2500000.00,  'Platinum — alta performance consistente'),
  ('chairmans',    5000000.00,  'Chairman''s Club — conselho do presidente'),
  ('titan',        10000000.00, 'Titan — top performer nacional'),
  ('diamond',      20000000.00, 'Diamond — elite da rede RE/MAX'),
  ('pinnacle',     50000000.00, 'Pinnacle — nivel maximo, referencia global RE/MAX');

-- ---------------------------------------------------------------------------
-- 8.3 Etapas do Funil — referencia (nao precisa de tabela, pois e enum)
-- ---------------------------------------------------------------------------
-- As etapas do funil sao definidas pelo enum etapa_funil:
-- contato → v1 → v2 → exclusividade → venda
--
-- Descricoes para referencia:
-- | Etapa         | Descricao                                                  |
-- |---------------|------------------------------------------------------------|
-- | contato       | Primeiro contato com proprietario (campo, digital, indicacao) |
-- | v1            | Primeira visita — avaliacao inicial, rapport, coleta dados   |
-- | v2            | Segunda visita — Dossie/Showcase, proposta de exclusividade  |
-- | exclusividade | Contrato de exclusividade assinado                          |
-- | venda         | Imovel vendido — comissao gerada                            |

-- ---------------------------------------------------------------------------
-- 8.4 Checklist padrao V1→V2 (template JSON para referencia)
-- ---------------------------------------------------------------------------
-- Template de checklist V1→V2 (Story 2.6b):
-- Usado como default ao criar checklists_preparacao com tipo='v1_para_v2'
--
-- [
--   {"nome": "ACM (Analise Comparativa de Mercado) atualizada", "concluido": false, "evidencia_url": null},
--   {"nome": "Dossie/Showcase preparado", "concluido": false, "evidencia_url": null},
--   {"nome": "Checklist de Home Staging enviado ao proprietario", "concluido": false, "evidencia_url": null},
--   {"nome": "Matricula do imovel verificada", "concluido": false, "evidencia_url": null},
--   {"nome": "Plano de Marketing rascunhado", "concluido": false, "evidencia_url": null}
-- ]


-- =============================================================================
-- 9. STORAGE BUCKETS (Supabase Storage)
-- Executar via Dashboard do Supabase ou Supabase CLI — nao e SQL puro.
-- Mantido aqui como referencia para setup automatizado.
-- =============================================================================

-- NOTA: Criar os seguintes buckets no Supabase Storage:
--
-- 1. fotos-v1     — Fotos tiradas durante visita V1 (privado por consultor)
-- 2. dossies      — PDFs de Dossie/Showcase gerados (privado por consultor)
-- 3. avatars      — Fotos de perfil dos consultores (publico)
--
-- Estrutura de pastas:
--   fotos-v1/{consultant_id}/{lead_id}/{filename}
--   dossies/{consultant_id}/{lead_id}/{filename}
--   avatars/{consultant_id}/{filename}
--
-- Policies de Storage (executar apos criar buckets):
--
-- CREATE POLICY "Fotos V1 privadas" ON storage.objects FOR ALL
--   USING (bucket_id = 'fotos-v1' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "Dossies privados" ON storage.objects FOR ALL
--   USING (bucket_id = 'dossies' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "Avatars publicos leitura" ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');
--
-- CREATE POLICY "Avatars upload proprio" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
-- Total de tabelas: 24 (20 principais + informantes_edificios + clubes_remax_thresholds
--                        + funnel_transitions + safari_event_rsvps)
-- Total de enums: 22
-- Total de funcoes PostGIS: 6
-- Total de triggers: 24 (20 updated_at + 1 etapa_timestamp + 2 feed + 1 validacao)
-- Total de policies RLS: 22 (DESABILITADAS para MVP)
-- Total de indexes: 28 (5 GIST + 14 B-tree + 5 compostos + 4 parciais)
-- Total de scripts seed: 10
-- Total de clubes seed: 7
--
-- Proximos passos:
-- 1. Executar este SQL no Supabase SQL Editor
-- 2. Criar buckets de Storage via Dashboard
-- 3. Configurar app.encryption_key para pgcrypto (via Supabase Vault ou env)
-- 4. Para multi-tenant (Epic 4): descomentar ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--
-- Autor: Dara (Data Engineer Agent — Synkra AIOX)
-- Data: 2026-03-18
-- =============================================================================
