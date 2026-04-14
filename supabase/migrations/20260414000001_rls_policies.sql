-- =============================================================================
-- MIGRATION: Row Level Security (RLS) Policies
-- Story: 5.2 AC7 — Close zero-RLS gap across all 24 tables
-- Depends on: All prior migrations (000–004)
-- =============================================================================
--
-- DESIGN DECISIONS:
--   1. Every user-facing table gets RLS enabled.
--   2. Tables with consultant_id use auth.uid() = consultant_id for isolation.
--   3. The service_role key (used by API routes / cron) bypasses RLS by default
--      in Supabase, so no explicit bypass policies are needed.
--   4. Junction tables and child tables use EXISTS sub-queries against the
--      parent table's consultant_id.
--   5. Reference/seed tables are public-read, admin-write-only.
--   6. The PostGIS system table spatial_ref_sys is skipped.
--   7. edificios (shared building registry) is readable by any authenticated
--      user, writable by the creator or service_role.
--   8. scraped_listings and listing_cross_refs are system data populated by
--      cron/service_role — authenticated users get read-only access.
-- =============================================================================

-- #############################################################################
-- SECTION 1: ENABLE RLS ON ALL USER-FACING TABLES
-- #############################################################################

ALTER TABLE consultant_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE epicentros              ENABLE ROW LEVEL SECURITY;
ALTER TABLE edificios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE edificios_qualificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE informantes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE informantes_edificios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE acoes_gentileza         ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_transitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE frog_contacts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_preparacao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossies                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE acm_comparaveis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_cross_refs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_feed       ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE safari_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE safari_event_rsvps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubes_remax_thresholds ENABLE ROW LEVEL SECURITY;


-- #############################################################################
-- SECTION 2: TENANT-ISOLATED TABLES (consultant_id = auth.uid())
-- Each consultant can only CRUD their own rows.
-- #############################################################################

-- ---------------------------------------------------------------------------
-- 2.1  consultant_settings
-- ---------------------------------------------------------------------------
CREATE POLICY "consultant_settings_select_own"
  ON consultant_settings FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "consultant_settings_insert_own"
  ON consultant_settings FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "consultant_settings_update_own"
  ON consultant_settings FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "consultant_settings_delete_own"
  ON consultant_settings FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.2  epicentros
-- ---------------------------------------------------------------------------
CREATE POLICY "epicentros_select_own"
  ON epicentros FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "epicentros_insert_own"
  ON epicentros FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "epicentros_update_own"
  ON epicentros FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "epicentros_delete_own"
  ON epicentros FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.3  edificios_qualificacoes
-- ---------------------------------------------------------------------------
CREATE POLICY "edificios_qualificacoes_select_own"
  ON edificios_qualificacoes FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "edificios_qualificacoes_insert_own"
  ON edificios_qualificacoes FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "edificios_qualificacoes_update_own"
  ON edificios_qualificacoes FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "edificios_qualificacoes_delete_own"
  ON edificios_qualificacoes FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.4  leads
-- ---------------------------------------------------------------------------
CREATE POLICY "leads_select_own"
  ON leads FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "leads_insert_own"
  ON leads FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "leads_update_own"
  ON leads FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "leads_delete_own"
  ON leads FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.5  informantes
-- ---------------------------------------------------------------------------
CREATE POLICY "informantes_select_own"
  ON informantes FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "informantes_insert_own"
  ON informantes FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "informantes_update_own"
  ON informantes FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "informantes_delete_own"
  ON informantes FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.6  acoes_gentileza
-- ---------------------------------------------------------------------------
CREATE POLICY "acoes_gentileza_select_own"
  ON acoes_gentileza FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "acoes_gentileza_insert_own"
  ON acoes_gentileza FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "acoes_gentileza_update_own"
  ON acoes_gentileza FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "acoes_gentileza_delete_own"
  ON acoes_gentileza FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.7  funnel_transitions
-- ---------------------------------------------------------------------------
CREATE POLICY "funnel_transitions_select_own"
  ON funnel_transitions FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "funnel_transitions_insert_own"
  ON funnel_transitions FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

-- Transitions are append-only (no update/delete by user)
-- service_role can still modify via admin client

-- ---------------------------------------------------------------------------
-- 2.8  agendamentos
-- ---------------------------------------------------------------------------
CREATE POLICY "agendamentos_select_own"
  ON agendamentos FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "agendamentos_insert_own"
  ON agendamentos FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "agendamentos_update_own"
  ON agendamentos FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "agendamentos_delete_own"
  ON agendamentos FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.9  frog_contacts
-- ---------------------------------------------------------------------------
CREATE POLICY "frog_contacts_select_own"
  ON frog_contacts FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "frog_contacts_insert_own"
  ON frog_contacts FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "frog_contacts_update_own"
  ON frog_contacts FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "frog_contacts_delete_own"
  ON frog_contacts FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.10  checklist_preparacao
-- ---------------------------------------------------------------------------
CREATE POLICY "checklist_preparacao_select_own"
  ON checklist_preparacao FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "checklist_preparacao_insert_own"
  ON checklist_preparacao FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "checklist_preparacao_update_own"
  ON checklist_preparacao FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "checklist_preparacao_delete_own"
  ON checklist_preparacao FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.11  dossies
-- ---------------------------------------------------------------------------
CREATE POLICY "dossies_select_own"
  ON dossies FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "dossies_insert_own"
  ON dossies FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "dossies_update_own"
  ON dossies FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "dossies_delete_own"
  ON dossies FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.12  acm_comparaveis
-- ---------------------------------------------------------------------------
CREATE POLICY "acm_comparaveis_select_own"
  ON acm_comparaveis FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "acm_comparaveis_insert_own"
  ON acm_comparaveis FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "acm_comparaveis_update_own"
  ON acm_comparaveis FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "acm_comparaveis_delete_own"
  ON acm_comparaveis FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.13  intelligence_feed
-- ---------------------------------------------------------------------------
CREATE POLICY "intelligence_feed_select_own"
  ON intelligence_feed FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "intelligence_feed_insert_own"
  ON intelligence_feed FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "intelligence_feed_update_own"
  ON intelligence_feed FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

-- Feed events are not deletable by users (mark as read instead)
-- service_role can still delete via admin client

-- ---------------------------------------------------------------------------
-- 2.14  referrals
-- ---------------------------------------------------------------------------
CREATE POLICY "referrals_select_own"
  ON referrals FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "referrals_insert_own"
  ON referrals FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "referrals_update_own"
  ON referrals FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "referrals_delete_own"
  ON referrals FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.15  safari_events
-- ---------------------------------------------------------------------------
CREATE POLICY "safari_events_select_own"
  ON safari_events FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "safari_events_insert_own"
  ON safari_events FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "safari_events_update_own"
  ON safari_events FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "safari_events_delete_own"
  ON safari_events FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.16  comissoes
-- ---------------------------------------------------------------------------
CREATE POLICY "comissoes_select_own"
  ON comissoes FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "comissoes_insert_own"
  ON comissoes FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "comissoes_update_own"
  ON comissoes FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "comissoes_delete_own"
  ON comissoes FOR DELETE
  USING (consultant_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2.17  marketing_plans
-- ---------------------------------------------------------------------------
CREATE POLICY "marketing_plans_select_own"
  ON marketing_plans FOR SELECT
  USING (consultant_id = auth.uid());

CREATE POLICY "marketing_plans_insert_own"
  ON marketing_plans FOR INSERT
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "marketing_plans_update_own"
  ON marketing_plans FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "marketing_plans_delete_own"
  ON marketing_plans FOR DELETE
  USING (consultant_id = auth.uid());


-- #############################################################################
-- SECTION 3: SCRIPTS — HYBRID (default scripts are public-read)
-- consultant_id is nullable: NULL = system default, non-NULL = user custom
-- #############################################################################

CREATE POLICY "scripts_select_own_or_default"
  ON scripts FOR SELECT
  USING (
    is_default = true
    OR consultant_id = auth.uid()
  );

CREATE POLICY "scripts_insert_own"
  ON scripts FOR INSERT
  WITH CHECK (
    consultant_id = auth.uid()
    AND is_default = false
  );

CREATE POLICY "scripts_update_own"
  ON scripts FOR UPDATE
  USING (
    consultant_id = auth.uid()
    AND is_default = false
  )
  WITH CHECK (
    consultant_id = auth.uid()
    AND is_default = false
  );

CREATE POLICY "scripts_delete_own"
  ON scripts FOR DELETE
  USING (
    consultant_id = auth.uid()
    AND is_default = false
  );


-- #############################################################################
-- SECTION 4: SHARED BUILDING REGISTRY (edificios)
-- Readable by all authenticated users. Writable by creator or service_role.
-- The created_by column is nullable (seed data has no creator).
-- #############################################################################

CREATE POLICY "edificios_select_authenticated"
  ON edificios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "edificios_insert_authenticated"
  ON edificios FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "edificios_update_creator"
  ON edificios FOR UPDATE
  USING (
    created_by = auth.uid()
    OR created_by IS NULL
  )
  WITH CHECK (auth.role() = 'authenticated');

-- No user-initiated delete; managed by service_role only


-- #############################################################################
-- SECTION 5: SYSTEM/CRON TABLES — READ-ONLY FOR AUTHENTICATED USERS
-- Written exclusively by service_role (cron jobs / API routes).
-- #############################################################################

-- ---------------------------------------------------------------------------
-- 5.1  scraped_listings
-- ---------------------------------------------------------------------------
CREATE POLICY "scraped_listings_select_authenticated"
  ON scraped_listings FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: service_role only (no policies = denied for anon/authenticated)

-- ---------------------------------------------------------------------------
-- 5.2  listing_cross_refs
-- ---------------------------------------------------------------------------
CREATE POLICY "listing_cross_refs_select_authenticated"
  ON listing_cross_refs FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: service_role only


-- #############################################################################
-- SECTION 6: JUNCTION TABLE — informantes_edificios
-- Access scoped through parent informantes.consultant_id
-- #############################################################################

CREATE POLICY "informantes_edificios_select_own"
  ON informantes_edificios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM informantes i
      WHERE i.id = informantes_edificios.informante_id
        AND i.consultant_id = auth.uid()
    )
  );

CREATE POLICY "informantes_edificios_insert_own"
  ON informantes_edificios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM informantes i
      WHERE i.id = informantes_edificios.informante_id
        AND i.consultant_id = auth.uid()
    )
  );

CREATE POLICY "informantes_edificios_delete_own"
  ON informantes_edificios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM informantes i
      WHERE i.id = informantes_edificios.informante_id
        AND i.consultant_id = auth.uid()
    )
  );


-- #############################################################################
-- SECTION 7: CHILD TABLE — safari_event_rsvps
-- Access scoped through parent safari_events.consultant_id
-- #############################################################################

CREATE POLICY "safari_event_rsvps_select_own"
  ON safari_event_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM safari_events se
      WHERE se.id = safari_event_rsvps.safari_event_id
        AND se.consultant_id = auth.uid()
    )
  );

CREATE POLICY "safari_event_rsvps_insert_own"
  ON safari_event_rsvps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM safari_events se
      WHERE se.id = safari_event_rsvps.safari_event_id
        AND se.consultant_id = auth.uid()
    )
  );

CREATE POLICY "safari_event_rsvps_update_own"
  ON safari_event_rsvps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM safari_events se
      WHERE se.id = safari_event_rsvps.safari_event_id
        AND se.consultant_id = auth.uid()
    )
  );

CREATE POLICY "safari_event_rsvps_delete_own"
  ON safari_event_rsvps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM safari_events se
      WHERE se.id = safari_event_rsvps.safari_event_id
        AND se.consultant_id = auth.uid()
    )
  );


-- #############################################################################
-- SECTION 8: REFERENCE TABLE — clubes_remax_thresholds
-- Public-read for all authenticated users. Write restricted to service_role.
-- #############################################################################

CREATE POLICY "clubes_remax_thresholds_select_authenticated"
  ON clubes_remax_thresholds FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: service_role only (no policies = denied for anon/authenticated)


-- =============================================================================
-- NOTES:
--   - service_role key (used by createAdminClient in app/src/lib/supabase/admin.ts)
--     bypasses RLS entirely by default in Supabase. No explicit bypass policies needed.
--   - The view checklists_preparacao (alias for checklist_preparacao) inherits RLS
--     from the underlying table automatically.
--   - spatial_ref_sys (PostGIS system table) is not touched — it is a system catalog.
--   - All RPC functions (fn_edificios_no_raio, fn_cobertura_raio, fn_comparaveis_no_raio,
--     fn_match_listing_edificio, fn_set_listing_coordinates,
--     fn_insert_scraped_listing_with_coords) execute with SECURITY INVOKER by default,
--     meaning they respect the calling user's RLS policies.
-- =============================================================================
