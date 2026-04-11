-- =============================================================================
-- MIGRATION 002: Epic 2 — Leads, Funil de Vendas & Metodologia RE/MAX
-- Epic: 5.1 — Schema Migration Base (Audit PV Finding F1)
-- Depends on: 001_base_foundation.sql
-- =============================================================================

-- =============================================================================
-- leads — Lead tracking per consultant
-- =============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  informante_id UUID,
  nome TEXT NOT NULL,
  unidade TEXT,
  telefone TEXT,
  email TEXT,
  origem origem_lead NOT NULL,
  fonte_frog fonte_frog,
  etapa_funil etapa_funil NOT NULL DEFAULT 'contato',
  etapa_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivacao_venda TEXT,
  prazo_urgencia prazo_urgencia,
  fotos_v1 TEXT[],
  perfil_psicografico TEXT CHECK (perfil_psicografico IN ('investidor', 'herdeiro', 'mudanca_cidade', 'upgrade_downgrade')),
  valoriza TEXT CHECK (valoriza IN ('preco', 'rapidez', 'discricao', 'seguranca')),
  notas TEXT,
  is_fisbo BOOLEAN NOT NULL DEFAULT false,
  referral_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_consultant ON leads(consultant_id);
CREATE INDEX IF NOT EXISTS idx_leads_edificio ON leads(edificio_id);
CREATE INDEX IF NOT EXISTS idx_leads_etapa ON leads(etapa_funil);

-- =============================================================================
-- informantes — Informant network (zeladores, porteiros, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS informantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  funcao funcao_informante NOT NULL,
  telefone TEXT,
  qualidade_relacao TEXT NOT NULL DEFAULT 'frio' CHECK (qualidade_relacao IN ('frio', 'morno', 'quente')),
  notas TEXT,
  total_investido_gentileza NUMERIC(10,2) NOT NULL DEFAULT 0,
  comissao_devida NUMERIC(10,2) NOT NULL DEFAULT 0,
  comissao_paga NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK now that informantes table exists
ALTER TABLE leads ADD CONSTRAINT fk_leads_informante
  FOREIGN KEY (informante_id) REFERENCES informantes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_informantes_consultant ON informantes(consultant_id);

-- =============================================================================
-- informantes_edificios — M:N informant-building relationship
-- =============================================================================

CREATE TABLE IF NOT EXISTS informantes_edificios (
  informante_id UUID NOT NULL REFERENCES informantes(id) ON DELETE CASCADE,
  edificio_id UUID NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (informante_id, edificio_id)
);

-- =============================================================================
-- acoes_gentileza — Kindness actions for informants
-- =============================================================================

CREATE TABLE IF NOT EXISTS acoes_gentileza (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  informante_id UUID NOT NULL REFERENCES informantes(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cafe', 'brinde', 'agradecimento_escrito', 'presente', 'outro')),
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_acao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- funnel_transitions — Funnel stage change history
-- =============================================================================

CREATE TABLE IF NOT EXISTS funnel_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_etapa etapa_funil,
  to_etapa etapa_funil NOT NULL,
  is_retrocesso BOOLEAN NOT NULL DEFAULT false,
  justificativa TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transitions_lead ON funnel_transitions(lead_id);

-- =============================================================================
-- agendamentos — Scheduling (V1, V2, follow-ups)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo tipo_agendamento NOT NULL,
  status status_agendamento NOT NULL DEFAULT 'agendado',
  data_hora TIMESTAMPTZ NOT NULL,
  opcao_alternativa TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_consultant ON agendamentos(consultant_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_hora);

-- =============================================================================
-- scripts — Objection handling scripts
-- =============================================================================

CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria categoria_script NOT NULL,
  etapa_funil etapa_funil,
  objecao TEXT NOT NULL,
  resposta TEXT NOT NULL,
  tecnica TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- frog_contacts — FROG network contacts
-- =============================================================================

CREATE TABLE IF NOT EXISTS frog_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria fonte_frog NOT NULL,
  telefone TEXT,
  email TEXT,
  notas TEXT,
  leads_gerados INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- checklist_preparacao — V2 preparation checklists
-- =============================================================================

CREATE TABLE IF NOT EXISTS checklist_preparacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo tipo_checklist NOT NULL DEFAULT 'preparacao_v2',
  acm_preparada BOOLEAN NOT NULL DEFAULT false,
  dossie_montado BOOLEAN NOT NULL DEFAULT false,
  home_staging_enviado BOOLEAN NOT NULL DEFAULT false,
  matricula_verificada BOOLEAN NOT NULL DEFAULT false,
  plano_marketing_rascunhado BOOLEAN NOT NULL DEFAULT false,
  data_v2 TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alias view for plural naming used in some hooks
CREATE OR REPLACE VIEW checklists_preparacao AS SELECT * FROM checklist_preparacao;

-- =============================================================================
-- dossies — Property dossier documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS dossies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT,
  acm_snapshot JSONB,
  conteudo JSONB,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
