-- =============================================================================
-- MIGRATION 004: Epic 4 — Parcerias Ganha/Ganha & Escala
-- =============================================================================
-- Stories: 4.1-4.8
-- Depende de: 001 + 002 + 003
-- Tabelas: referrals, comissoes, safari_events, safari_event_rsvps,
--          marketing_plans, clubes_remax_thresholds
-- Inclui: ativacao de RLS para multi-tenant + seed data clubes
-- =============================================================================

-- Enums Epic 4
CREATE TYPE status_referral AS ENUM (
  'enviada', 'aceita', 'recusada', 'em_andamento', 'convertida', 'comissao_paga', 'expirada'
);
CREATE TYPE direcao_referral AS ENUM ('enviado', 'recebido');
CREATE TYPE clube_remax AS ENUM (
  'sem_clube', 'executive', 'cem_porcento', 'platinum',
  'chairmans', 'titan', 'diamond', 'pinnacle'
);
CREATE TYPE status_safari AS ENUM ('planejado', 'confirmado', 'realizado', 'cancelado');
CREATE TYPE status_rsvp AS ENUM ('convidado', 'confirmado', 'recusado', 'pendente');

-- Tabela: referrals entre consultores (Story 4.1)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  direcao direcao_referral NOT NULL,
  parceiro_nome TEXT NOT NULL,
  parceiro_franquia TEXT,
  parceiro_telefone_encrypted BYTEA,
  parceiro_email TEXT,
  parceiro_regiao TEXT,
  -- Perfil do cliente indicado
  cliente_perfil TEXT,
  tipologia_desejada TEXT,
  faixa_preco_min NUMERIC(12,2),
  faixa_preco_max NUMERIC(12,2),
  regiao_desejada TEXT,
  prazo_validade DATE,
  status status_referral NOT NULL DEFAULT 'enviada',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Lead criado ao aceitar
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: comissoes (Story 4.2)
CREATE TABLE comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  valor_imovel NUMERIC(14,2) NOT NULL,
  percentual_comissao NUMERIC(5,2) NOT NULL,
  valor_bruto NUMERIC(12,2) NOT NULL,
  -- Splits (sugeridos pelo sistema, confirmados manualmente — principio PV)
  split_consultora NUMERIC(12,2),
  split_franquia NUMERIC(12,2),
  split_informante NUMERIC(12,2),
  split_referral NUMERIC(12,2),
  -- Clausula de Relacionamento (Gap PV resolvido)
  tipo_split TEXT DEFAULT 'padrao' CHECK (tipo_split IN ('padrao','referral','informante','clausula_relacionamento')),
  percentual_clausula NUMERIC(5,2) DEFAULT 3.0,  -- 3-4% configuravel
  -- Pagamentos
  informante_id UUID REFERENCES informantes(id) ON DELETE SET NULL,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente','recebido','pago_informante','pago_parceiro','completo')),
  data_recebimento DATE,
  data_pagamento_informante DATE,
  data_pagamento_referral DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE comissoes IS
  'Comissoes por venda. Splits sugeridos pelo sistema, CONFIRMADOS manualmente. '
  'Principio PV: automacao sugere, humano decide. NUNCA auto-pagar.';

-- Tabela: safari events (Story 4.7)
CREATE TABLE safari_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  endereco TEXT,
  vagas INTEGER DEFAULT 10,
  status status_safari NOT NULL DEFAULT 'planejado',
  feedback TEXT,
  propostas_recebidas INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: RSVPs do safari
CREATE TABLE safari_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safari_event_id UUID NOT NULL REFERENCES safari_events(id) ON DELETE CASCADE,
  nome_convidado TEXT NOT NULL,
  franquia TEXT,
  telefone TEXT,
  status status_rsvp NOT NULL DEFAULT 'convidado',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: marketing plans por imovel (Story 4.8)
CREATE TABLE marketing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  publicar_zap BOOLEAN DEFAULT false,
  publicar_zap_data DATE,
  publicar_zap_url TEXT,
  publicar_olx BOOLEAN DEFAULT false,
  publicar_olx_data DATE,
  publicar_olx_url TEXT,
  publicar_vivareal BOOLEAN DEFAULT false,
  publicar_vivareal_data DATE,
  postar_instagram BOOLEAN DEFAULT false,
  postar_instagram_data DATE,
  postar_facebook BOOLEAN DEFAULT false,
  postar_facebook_data DATE,
  fotos_profissionais BOOLEAN DEFAULT false,
  fotos_profissionais_data DATE,
  tour_virtual BOOLEAN DEFAULT false,
  tour_virtual_url TEXT,
  placa_fisica BOOLEAN DEFAULT false,
  safari_planejado BOOLEAN DEFAULT false,
  safari_event_id UUID REFERENCES safari_events(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: thresholds dos clubes RE/MAX (Story 4.3)
CREATE TABLE clubes_remax_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clube clube_remax NOT NULL UNIQUE,
  vgv_minimo_anual NUMERIC(14,2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_referrals_consultant ON referrals(consultant_id);
CREATE INDEX idx_referrals_status ON referrals(status) WHERE status NOT IN ('expirada','recusada');
CREATE INDEX idx_comissoes_consultant ON comissoes(consultant_id);
CREATE INDEX idx_marketing_plans_lead ON marketing_plans(lead_id);
CREATE INDEX idx_safari_events_consultant ON safari_events(consultant_id);
CREATE INDEX idx_safari_rsvps_event ON safari_event_rsvps(safari_event_id);

-- Triggers
CREATE TRIGGER trg_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_comissoes_updated_at BEFORE UPDATE ON comissoes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_safari_events_updated_at BEFORE UPDATE ON safari_events
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_marketing_plans_updated_at BEFORE UPDATE ON marketing_plans
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Adicionar FK referral_id na tabela leads (criada no Epic 2)
ALTER TABLE leads ADD CONSTRAINT fk_leads_referral
  FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL;

-- =============================================================================
-- SEED DATA: Thresholds dos Clubes RE/MAX
-- =============================================================================
INSERT INTO clubes_remax_thresholds (clube, vgv_minimo_anual, descricao) VALUES
  ('executive',     167224.00, 'Executive Club — entrada na carreira RE/MAX'),
  ('cem_porcento',  334448.00, '100% Club — primeiro marco de consistencia'),
  ('platinum',      836120.00, 'Platinum Club — alta performance'),
  ('chairmans',    1672241.00, 'Chairmans Club — elite do mercado'),
  ('titan',        2508361.00, 'Titan Club — top performers'),
  ('diamond',      3344482.00, 'Diamond Club — excelencia comprovada'),
  ('pinnacle',     6688963.00, 'Pinnacle Club — o auge da carreira RE/MAX');

-- =============================================================================
-- ROW LEVEL SECURITY — Ativacao Multi-Tenant
-- Descomentar as linhas abaixo quando onboarding do segundo consultor
-- =============================================================================

-- Para ativar RLS, descomentar TODAS as linhas abaixo:

-- ALTER TABLE edificios_qualificacoes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve apenas suas qualificacoes" ON edificios_qualificacoes
--   FOR ALL USING (consultant_id = auth.uid());

-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve apenas seus leads" ON leads
--   FOR ALL USING (consultant_id = auth.uid());

-- ALTER TABLE funnel_transitions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve apenas suas transicoes" ON funnel_transitions
--   FOR ALL USING (consultant_id = auth.uid());

-- ALTER TABLE informantes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve apenas seus informantes" ON informantes
--   FOR ALL USING (consultant_id = auth.uid());

-- ALTER TABLE acoes_gentileza ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve apenas suas acoes" ON acoes_gentileza
--   FOR ALL USING (consultant_id = auth.uid());

-- ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve referrals onde participa" ON referrals
--   FOR ALL USING (consultant_id = auth.uid());

-- ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve apenas suas comissoes" ON comissoes
--   FOR ALL USING (consultant_id = auth.uid());

-- ALTER TABLE intelligence_feed ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Consultor ve apenas seu feed" ON intelligence_feed
--   FOR ALL USING (consultant_id = auth.uid());

-- NOTA: edificios (base) NAO tem RLS — sao publicos/compartilhados.
-- Apenas edificios_qualificacoes sao privadas por consultor.

-- =============================================================================
-- FIM: Migration 004 — Epic 4 Partnerships & Scale
-- Schema completo do sistema. Todas as 24 tabelas criadas.
-- =============================================================================
