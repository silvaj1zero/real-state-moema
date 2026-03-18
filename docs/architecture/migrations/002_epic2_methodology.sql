-- =============================================================================
-- MIGRATION 002: Epic 2 — Leads, Funil de Vendas & Metodologia RE/MAX
-- =============================================================================
-- Stories: 2.1-2.10, 2.6b
-- Depende de: 001_epic1_foundation.sql
-- Tabelas: informantes, informantes_edificios, acoes_gentileza, leads,
--          funnel_transitions, agendamentos, scripts, frog_contacts,
--          checklists_preparacao
-- Referencia: docs/architecture/schema.sql
-- =============================================================================

-- Enums Epic 2
CREATE TYPE etapa_funil AS ENUM (
  'contato', 'v1_agendada', 'v1_realizada', 'v2_agendada', 'v2_realizada',
  'representacao', 'venda', 'perdido'
);
CREATE TYPE origem_lead AS ENUM (
  'digital', 'placa', 'zelador', 'indicacao', 'fisbo_scraping', 'referral', 'captei'
);
CREATE TYPE prazo_urgencia AS ENUM ('imediato', 'tres_meses', 'seis_meses', 'sem_pressa');
CREATE TYPE fonte_frog AS ENUM ('familia', 'relacionamentos', 'organizacoes', 'geografia');
CREATE TYPE tipo_agendamento AS ENUM ('v1', 'v2', 'follow_up', 'safari', 'outro');
CREATE TYPE status_agendamento AS ENUM ('agendado', 'confirmado', 'realizado', 'cancelado', 'reagendado');
CREATE TYPE funcao_informante AS ENUM ('zelador', 'porteiro', 'gerente_predial', 'comerciante', 'sindico', 'outro');
CREATE TYPE categoria_script AS ENUM (
  'objecao_imobiliaria', 'objecao_experiencia', 'objecao_exclusividade',
  'objecao_comissao', 'objecao_preco', 'abordagem_inicial', 'fechamento', 'follow_up'
);
CREATE TYPE tipo_checklist AS ENUM ('preparacao_v2', 'home_staging', 'pre_safari');

-- Tabela: informantes (zeladores, porteiros — Story 2.3)
CREATE TABLE informantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  funcao funcao_informante NOT NULL DEFAULT 'zelador',
  telefone_encrypted BYTEA,
  qualidade_relacao TEXT DEFAULT 'frio' CHECK (qualidade_relacao IN ('frio','morno','quente')),
  notas TEXT,
  total_investido_gentileza NUMERIC(10,2) DEFAULT 0,
  comissao_devida NUMERIC(10,2) DEFAULT 0,
  comissao_paga NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela associativa: informantes <-> edificios (N:M)
CREATE TABLE informantes_edificios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informante_id UUID NOT NULL REFERENCES informantes(id) ON DELETE CASCADE,
  edificio_id UUID NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(informante_id, edificio_id)
);

-- Tabela: acoes de gentileza (Marketing de Gentileza — Story 2.3)
CREATE TABLE acoes_gentileza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  informante_id UUID NOT NULL REFERENCES informantes(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cafe','brinde','agradecimento_escrito','presente','outro')),
  descricao TEXT,
  valor NUMERIC(10,2) DEFAULT 0,
  data_acao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: leads / proprietarios (Story 2.1)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  edificio_id UUID REFERENCES edificios(id) ON DELETE SET NULL,
  informante_id UUID REFERENCES informantes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  unidade TEXT,
  telefone_encrypted BYTEA,
  email_encrypted BYTEA,
  origem origem_lead NOT NULL DEFAULT 'digital',
  fonte_frog fonte_frog,
  etapa_funil etapa_funil NOT NULL DEFAULT 'contato',
  etapa_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Campos V1 estruturados (Gap PV resolvido)
  motivacao_venda TEXT,
  prazo_urgencia prazo_urgencia,
  fotos_v1 TEXT[],
  -- Perfil
  perfil_psicografico TEXT CHECK (perfil_psicografico IN ('investidor','herdeiro','mudanca_cidade','upgrade_downgrade')),
  valoriza TEXT CHECK (valoriza IN ('preco','rapidez','discricao','seguranca')),
  notas TEXT,
  is_fisbo BOOLEAN DEFAULT false,
  referral_id UUID,  -- FK adicionada no Epic 4
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: transicoes do funil (historico — Story 2.2)
CREATE TABLE funnel_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  from_etapa etapa_funil,
  to_etapa etapa_funil NOT NULL,
  is_retrocesso BOOLEAN NOT NULL DEFAULT false,  -- Guardrail PV: retrocesso rastreado
  justificativa TEXT,  -- Obrigatoria se retrocesso (validado na app)
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: agendamentos V1/V2 (Story 2.6)
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipo tipo_agendamento NOT NULL,
  status status_agendamento NOT NULL DEFAULT 'agendado',
  data_hora TIMESTAMPTZ NOT NULL,
  opcao_alternativa TIMESTAMPTZ,  -- Tecnica "Duas Opcoes"
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: scripts de objecao (Story 2.5)
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES consultores(id) ON DELETE CASCADE,  -- NULL = script global
  titulo TEXT NOT NULL,
  categoria categoria_script NOT NULL,
  etapa_funil etapa_funil,
  objecao TEXT NOT NULL,
  resposta TEXT NOT NULL,
  tecnica TEXT,  -- Ex: "Fecho de Duas Opcoes"
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: contatos FROG (Story 2.4)
CREATE TABLE frog_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria fonte_frog NOT NULL,
  telefone_encrypted BYTEA,
  email TEXT,
  notas TEXT,
  leads_gerados INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: checklist preparacao V1->V2 (Story 2.6b — VETO PV #2)
CREATE TABLE checklists_preparacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultores(id) ON DELETE CASCADE,
  tipo tipo_checklist NOT NULL DEFAULT 'preparacao_v2',
  acm_preparada BOOLEAN DEFAULT false,
  dossie_montado BOOLEAN DEFAULT false,
  home_staging_enviado BOOLEAN DEFAULT false,
  matricula_verificada BOOLEAN DEFAULT false,
  plano_marketing_rascunhado BOOLEAN DEFAULT false,
  data_v2 TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE checklists_preparacao IS
  'Checklist V1→V2 — VETO PV #2: impossibilitar V2 sem preparacao. '
  'Notificacao 24h antes da V2 se itens pendentes.';

-- Indexes
CREATE INDEX idx_leads_consultant ON leads(consultant_id);
CREATE INDEX idx_leads_edificio ON leads(edificio_id);
CREATE INDEX idx_leads_etapa ON leads(etapa_funil) WHERE etapa_funil NOT IN ('venda','perdido');
CREATE INDEX idx_funnel_transitions_lead ON funnel_transitions(lead_id);
CREATE INDEX idx_informantes_consultant ON informantes(consultant_id);
CREATE INDEX idx_frog_contacts_consultant ON frog_contacts(consultant_id);
CREATE INDEX idx_agendamentos_lead ON agendamentos(lead_id);
CREATE INDEX idx_agendamentos_consultant_data ON agendamentos(consultant_id, data_hora);
CREATE INDEX idx_checklists_lead ON checklists_preparacao(lead_id);

-- Triggers updated_at
CREATE TRIGGER trg_informantes_updated_at BEFORE UPDATE ON informantes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_agendamentos_updated_at BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_scripts_updated_at BEFORE UPDATE ON scripts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_frog_contacts_updated_at BEFORE UPDATE ON frog_contacts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_checklists_updated_at BEFORE UPDATE ON checklists_preparacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Trigger: atualizar etapa_changed_at quando etapa_funil muda
CREATE OR REPLACE FUNCTION fn_update_lead_etapa_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.etapa_funil IS DISTINCT FROM OLD.etapa_funil THEN
    NEW.etapa_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_etapa_timestamp BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION fn_update_lead_etapa_timestamp();

-- Trigger: validar retrocesso no funil (Guardrail PV)
CREATE OR REPLACE FUNCTION fn_validate_funnel_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_retrocesso = true AND (NEW.justificativa IS NULL OR NEW.justificativa = '') THEN
    RAISE EXCEPTION 'Retrocesso no funil requer justificativa obrigatoria (Guardrail PV)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_funnel_transition BEFORE INSERT ON funnel_transitions
  FOR EACH ROW EXECUTE FUNCTION fn_validate_funnel_transition();

-- =============================================================================
-- SEED DATA: Scripts de objecao RE/MAX (pré-carregados)
-- =============================================================================
INSERT INTO scripts (consultant_id, titulo, categoria, etapa_funil, objecao, resposta, tecnica, is_default) VALUES
(NULL, 'Nao trabalho com imobiliarias', 'objecao_imobiliaria', 'contato',
 'Proprietario diz que nao trabalha com imobiliarias',
 'Compreendo perfeitamente, Sr. Proprietario. Meu objetivo hoje nao e pedir o agenciamento do seu imovel, mas sim conhece-lo para o caso de algum dos meus clientes compradores ter exatamente o perfil da sua propriedade. Podemos agendar 15 minutos amanha?',
 'Reframe — foco no comprador, nao no agenciamento', true),

(NULL, 'Experiencia ruim com corretores', 'objecao_experiencia', 'contato',
 'Proprietario ja teve experiencia negativa com corretores',
 'Lamento muito por isso. Infelizmente, os metodos de trabalho variam muito no mercado. Justamente por isso, gostaria de lhe mostrar como meu modelo e focado em dados e resultados, e nao apenas em pendurar uma placa. Qual horario fica melhor para uma breve conversa?',
 'Diferenciacao — metodo vs mercado', true),

(NULL, 'Fecho de Duas Opcoes — Agendamento', 'abordagem_inicial', 'contato',
 'Proprietario hesita em agendar horario',
 'Sr. Joao, prefere que eu passe ai amanha as 10h ou na quarta as 16h?',
 'Tecnica Neurologica — Fecho de Duas Opcoes: desloca decisao de sim/nao para opcao A/B', true),

(NULL, 'Ja tenho comprador interessado', 'objecao_exclusividade', 'v1_realizada',
 'Proprietario diz que vizinho/conhecido ja quer comprar',
 'Excelente! Isso e otimo. Posso ajuda-lo inclusive nessa negociacao com a Clausula de Relacionamento — se o interessado fechar, minha comissao e reduzida para cobrir apenas a gestao documental e juridica, protegendo ambas as partes.',
 'Clausula de Relacionamento — comissao reduzida para comprador conhecido', true),

(NULL, 'Central Hub — Defesa da Exclusividade', 'objecao_exclusividade', 'v2_realizada',
 'Proprietario teme que exclusividade limite alcance da venda',
 'Sr. Proprietario, eu serei seu ponto central. Ao assinar comigo, voce nao esta fechando portas, mas abrindo todas de forma organizada. Eu gerencio todos os outros corretores e filtro curiosos, garantindo que apenas propostas qualificadas cheguem ao senhor.',
 'Central Hub — exclusividade como organizacao, nao limitacao', true);

-- =============================================================================
-- FIM: Migration 002 — Epic 2 Methodology
-- =============================================================================
