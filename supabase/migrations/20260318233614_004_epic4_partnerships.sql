-- =============================================================================
-- MIGRATION 004: Epic 4 — Parcerias Ganha/Ganha & Escala
-- Epic: 5.1 — Schema Migration Base (Audit PV Finding F1)
-- Depends on: 003_epic3_intelligence.sql
-- =============================================================================

-- =============================================================================
-- referrals — Partner referral tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direcao direcao_referral NOT NULL,
  parceiro_nome TEXT NOT NULL,
  parceiro_franquia TEXT,
  parceiro_telefone TEXT,
  parceiro_email TEXT,
  parceiro_regiao TEXT,
  cliente_perfil TEXT,
  tipologia_desejada TEXT,
  faixa_preco_min NUMERIC(14,2),
  faixa_preco_max NUMERIC(14,2),
  regiao_desejada TEXT,
  prazo_validade DATE,
  status status_referral NOT NULL DEFAULT 'enviada',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK now that referrals table exists
ALTER TABLE leads ADD CONSTRAINT fk_leads_referral
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_consultant ON referrals(consultant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- =============================================================================
-- safari_events — Open house safari events
-- =============================================================================

CREATE TABLE IF NOT EXISTS safari_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  endereco TEXT,
  vagas INTEGER NOT NULL DEFAULT 10,
  status status_safari NOT NULL DEFAULT 'planejado',
  feedback TEXT,
  propostas_recebidas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- safari_event_rsvps — RSVP for safari events
-- =============================================================================

CREATE TABLE IF NOT EXISTS safari_event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  safari_event_id UUID NOT NULL REFERENCES safari_events(id) ON DELETE CASCADE,
  nome_convidado TEXT NOT NULL,
  franquia TEXT,
  telefone TEXT,
  status status_rsvp NOT NULL DEFAULT 'convidado',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- comissoes — Commission tracking with splits
-- =============================================================================

CREATE TABLE IF NOT EXISTS comissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  valor_imovel NUMERIC(14,2) NOT NULL,
  percentual_comissao NUMERIC(5,2) NOT NULL DEFAULT 6.0,
  valor_bruto NUMERIC(14,2) NOT NULL,
  split_consultora NUMERIC(14,2),
  split_franquia NUMERIC(14,2),
  split_informante NUMERIC(14,2),
  split_referral NUMERIC(14,2),
  tipo_split tipo_split NOT NULL DEFAULT 'padrao',
  percentual_clausula NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  informante_id UUID REFERENCES informantes(id) ON DELETE SET NULL,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  status_pagamento status_pagamento NOT NULL DEFAULT 'pendente',
  data_recebimento TIMESTAMPTZ,
  data_pagamento_informante TIMESTAMPTZ,
  data_pagamento_referral TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_consultant ON comissoes(consultant_id);

-- =============================================================================
-- marketing_plans — Marketing plan per lead
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publicar_zap BOOLEAN NOT NULL DEFAULT false,
  publicar_zap_data TIMESTAMPTZ,
  publicar_zap_url TEXT,
  publicar_olx BOOLEAN NOT NULL DEFAULT false,
  publicar_olx_data TIMESTAMPTZ,
  publicar_olx_url TEXT,
  publicar_vivareal BOOLEAN NOT NULL DEFAULT false,
  publicar_vivareal_data TIMESTAMPTZ,
  postar_instagram BOOLEAN NOT NULL DEFAULT false,
  postar_instagram_data TIMESTAMPTZ,
  postar_facebook BOOLEAN NOT NULL DEFAULT false,
  postar_facebook_data TIMESTAMPTZ,
  fotos_profissionais BOOLEAN NOT NULL DEFAULT false,
  fotos_profissionais_data TIMESTAMPTZ,
  tour_virtual BOOLEAN NOT NULL DEFAULT false,
  tour_virtual_url TEXT,
  placa_fisica BOOLEAN NOT NULL DEFAULT false,
  safari_planejado BOOLEAN NOT NULL DEFAULT false,
  safari_event_id UUID REFERENCES safari_events(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- clubes_remax_thresholds — RE/MAX Club progression thresholds
-- =============================================================================

CREATE TABLE IF NOT EXISTS clubes_remax_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  vgv_minimo NUMERIC(14,2) NOT NULL,
  cor TEXT,
  icone TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default RE/MAX club thresholds
INSERT INTO clubes_remax_thresholds (nome, vgv_minimo, cor, descricao) VALUES
  ('Executivo', 0, '#9CA3AF', 'Nível inicial'),
  ('100% Club', 1000000, '#3B82F6', 'VGV >= R$ 1M'),
  ('Platinum', 3000000, '#8B5CF6', 'VGV >= R$ 3M'),
  ('Chairman', 6000000, '#F59E0B', 'VGV >= R$ 6M'),
  ('Diamond', 10000000, '#EF4444', 'VGV >= R$ 10M'),
  ('Titan', 20000000, '#1F2937', 'VGV >= R$ 20M')
ON CONFLICT DO NOTHING;
