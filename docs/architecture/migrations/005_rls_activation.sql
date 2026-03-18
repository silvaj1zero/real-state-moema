-- =============================================================================
-- MIGRATION 005: RLS Activation — Multi-Tenant Preparation (Story 4.6)
-- =============================================================================
-- ATENÇÃO: Executar em horário de baixo uso
-- Rollback: ALTER TABLE [table] DISABLE ROW LEVEL SECURITY;
-- =============================================================================

-- Adicionar coluna role em consultores (AC5 schema)
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'consultant'
  CHECK (role IN ('consultant', 'admin'));

-- =============================================================================
-- RLS ACTIVATION — 11 tabelas com consultant_id
-- =============================================================================

-- 1. edificios_qualificacoes
ALTER TABLE edificios_qualificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qualificacoes_own" ON edificios_qualificacoes
  FOR ALL USING (consultant_id = auth.uid());

-- 2. leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_own" ON leads
  FOR ALL USING (consultant_id = auth.uid());

-- 3. funnel_transitions
ALTER TABLE funnel_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transitions_own" ON funnel_transitions
  FOR ALL USING (consultant_id = auth.uid());

-- 4. informantes
ALTER TABLE informantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "informantes_own" ON informantes
  FOR ALL USING (consultant_id = auth.uid());

-- 5. acoes_gentileza
ALTER TABLE acoes_gentileza ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gentileza_own" ON acoes_gentileza
  FOR ALL USING (consultant_id = auth.uid());

-- 6. referrals (AC3: unilateral — consultant_id only)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_own" ON referrals
  FOR ALL USING (consultant_id = auth.uid());

-- 7. comissoes
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comissoes_own" ON comissoes
  FOR ALL USING (consultant_id = auth.uid());

-- 8. consultant_settings
ALTER TABLE consultant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_own" ON consultant_settings
  FOR ALL USING (consultant_id = auth.uid());

-- 9. safari_events
ALTER TABLE safari_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safari_own" ON safari_events
  FOR ALL USING (consultant_id = auth.uid());

-- 10. marketing_plans
ALTER TABLE marketing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_own" ON marketing_plans
  FOR ALL USING (consultant_id = auth.uid());

-- 11. safari_event_rsvps — public INSERT for landing page, consultant reads own events' RSVPs
ALTER TABLE safari_event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvps_public_insert" ON safari_event_rsvps
  FOR INSERT WITH CHECK (true);
CREATE POLICY "rsvps_consultant_read" ON safari_event_rsvps
  FOR SELECT USING (
    safari_event_id IN (
      SELECT id FROM safari_events WHERE consultant_id = auth.uid()
    )
  );

-- =============================================================================
-- EXCEÇÃO CRÍTICA: edificios NÃO tem RLS — dados públicos compartilhados
-- =============================================================================
-- ALTER TABLE edificios ENABLE ROW LEVEL SECURITY; -- NÃO FAZER

-- =============================================================================
-- VERIFICAÇÃO DE INTEGRIDADE (AC9) — Executar após ativação
-- =============================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('edificios_qualificacoes','leads','funnel_transitions',
--     'informantes','acoes_gentileza','referrals','comissoes',
--     'consultant_settings','safari_events','marketing_plans','safari_event_rsvps')
-- ORDER BY tablename;
--
-- Resultado esperado: rowsecurity = true para todas
-- Verificar edificios: rowsecurity = false

-- =============================================================================
-- FIM: Migration 005 — RLS Activation
-- =============================================================================
