-- =============================================================================
-- MIGRATION 000: Extensions & ENUM Types
-- Epic: 5.1 — Schema Migration Base (Audit PV Finding F1)
-- Depends on: nothing (first migration)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- Epic 1 ENUMs — Foundation
-- =============================================================================

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

-- =============================================================================
-- Epic 2 ENUMs — Leads & Methodology
-- =============================================================================

CREATE TYPE etapa_funil AS ENUM (
  'contato', 'v1_agendada', 'v1_realizada', 'v2_agendada', 'v2_realizada',
  'representacao', 'venda', 'perdido'
);

CREATE TYPE origem_lead AS ENUM (
  'digital', 'placa', 'zelador', 'indicacao', 'fisbo_scraping', 'referral', 'captei'
);

CREATE TYPE prazo_urgencia AS ENUM (
  'imediato', 'tres_meses', 'seis_meses', 'sem_pressa'
);

CREATE TYPE fonte_frog AS ENUM (
  'familia', 'relacionamentos', 'organizacoes', 'geografia'
);

CREATE TYPE tipo_agendamento AS ENUM (
  'v1', 'v2', 'follow_up', 'safari', 'outro'
);

CREATE TYPE status_agendamento AS ENUM (
  'agendado', 'confirmado', 'realizado', 'cancelado', 'reagendado'
);

CREATE TYPE funcao_informante AS ENUM (
  'zelador', 'porteiro', 'gerente_predial', 'comerciante', 'sindico', 'outro'
);

CREATE TYPE categoria_script AS ENUM (
  'objecao_imobiliaria', 'objecao_experiencia', 'objecao_exclusividade',
  'objecao_comissao', 'objecao_preco', 'abordagem_inicial', 'fechamento', 'follow_up'
);

CREATE TYPE tipo_checklist AS ENUM (
  'preparacao_v2', 'home_staging', 'pre_safari'
);

-- =============================================================================
-- Epic 3 ENUMs — Intelligence
-- =============================================================================

CREATE TYPE fonte_comparavel AS ENUM (
  'manual', 'scraping', 'captei', 'cartorio'
);

CREATE TYPE portal_scraping AS ENUM (
  'zap', 'olx', 'vivareal', 'quintoandar', 'outro'
);

CREATE TYPE tipo_anunciante AS ENUM (
  'proprietario', 'corretor', 'imobiliaria', 'desconhecido'
);

CREATE TYPE geocoding_status AS ENUM (
  'pending', 'success', 'failed', 'manual'
);

CREATE TYPE match_method AS ENUM (
  'postgis_50m', 'geocoding', 'manual', 'unmatched'
);

CREATE TYPE tipo_feed AS ENUM (
  'novo_fisbo', 'reducao_preco', 'ex_imobiliaria_fisbo', 'novo_raio_desbloqueado',
  'lead_parado', 'agendamento_proximo', 'seed_completo', 'sync_completo'
);

CREATE TYPE prioridade_feed AS ENUM (
  'alta', 'media', 'baixa'
);

-- =============================================================================
-- Epic 4 ENUMs — Partnerships
-- =============================================================================

CREATE TYPE status_referral AS ENUM (
  'enviada', 'aceita', 'recusada', 'em_andamento', 'convertida', 'comissao_paga', 'expirada'
);

CREATE TYPE direcao_referral AS ENUM (
  'enviado', 'recebido'
);

CREATE TYPE status_safari AS ENUM (
  'planejado', 'confirmado', 'realizado', 'cancelado'
);

CREATE TYPE status_rsvp AS ENUM (
  'convidado', 'confirmado', 'recusado', 'pendente'
);

CREATE TYPE status_pagamento AS ENUM (
  'pendente', 'recebido', 'pago_informante', 'pago_parceiro', 'completo'
);

CREATE TYPE tipo_split AS ENUM (
  'padrao', 'referral', 'informante', 'clausula_relacionamento'
);
