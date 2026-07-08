-- =============================================================================
-- MIGRATION 024: Story 6.7 — UI "Quem e o dono?" (helpers do dossie)
-- Depends on: 023_owner_lookups.sql, 003_epic3_intelligence.sql (scraped_listings)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- owner_lookups: contadores de cache hit (AC7 — dashboard "Cache hits/misses")
-- Cache hit NAO insere linha nova (AC6 da 6.6); o contador na propria linha
-- servida e a forma barata de medir hits sem tabela de telemetria nova.
-- -----------------------------------------------------------------------------
ALTER TABLE owner_lookups
  ADD COLUMN IF NOT EXISTS cache_hit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cache_hit_at TIMESTAMPTZ;

COMMENT ON COLUMN owner_lookups.cache_hit_count IS
  'Story 6.7 (AC7): quantas vezes esta linha foi servida do cache de 90d.';

-- -----------------------------------------------------------------------------
-- RPC: fn_enriched_contacts_by_edificio (AC3b)
--   Contatos enriquecidos (Epic 6) dos anuncios vinculados ao edificio,
--   deduplicados por telefone (mantem o mais recente). SECURITY INVOKER:
--   scraped_listings e SELECT para authenticated (RLS 5.1).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_enriched_contacts_by_edificio(p_edificio_id UUID)
RETURNS TABLE (
  listing_id UUID,
  nome TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  portal TEXT,
  enriched_at TIMESTAMPTZ
) AS $$
  SELECT DISTINCT ON (COALESCE(sl.telefone_anunciante, sl.whatsapp_anunciante, sl.id::text))
    sl.id,
    sl.nome_anunciante,
    sl.telefone_anunciante,
    sl.whatsapp_anunciante,
    sl.email_anunciante,
    sl.portal::text,
    sl.contact_enriched_at
  FROM scraped_listings sl
  WHERE sl.matched_edificio_id = p_edificio_id
    AND (
      sl.telefone_anunciante IS NOT NULL
      OR sl.whatsapp_anunciante IS NOT NULL
      OR sl.email_anunciante IS NOT NULL
      OR sl.nome_anunciante IS NOT NULL
    )
  ORDER BY
    COALESCE(sl.telefone_anunciante, sl.whatsapp_anunciante, sl.id::text),
    sl.contact_enriched_at DESC NULLS LAST,
    sl.last_seen_at DESC;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION fn_enriched_contacts_by_edificio(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: fn_owner_lookup_stats (AC7)
--   Agregados do consultor: mes corrente (consultas, custo, por status) +
--   cache hits acumulados. SECURITY INVOKER — RLS ja restringe as linhas.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_owner_lookup_stats(p_consultant_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'consultas_mes', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())),
    'custo_mes', COALESCE(SUM(custo_brl) FILTER (WHERE created_at >= date_trunc('month', now())), 0),
    'sucessos_mes', COUNT(*) FILTER (WHERE status = 'success' AND created_at >= date_trunc('month', now())),
    'nao_encontrados_mes', COUNT(*) FILTER (WHERE status = 'not_found' AND created_at >= date_trunc('month', now())),
    'falhas_mes', COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= date_trunc('month', now())),
    'consultas_total', COUNT(*),
    'cache_hits_total', COALESCE(SUM(cache_hit_count), 0)
  )
  FROM owner_lookups
  WHERE consultant_id = p_consultant_id;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION fn_owner_lookup_stats(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- intelligence_feed: evento de abertura do dossie (AC8)
-- -----------------------------------------------------------------------------
ALTER TYPE tipo_feed ADD VALUE IF NOT EXISTS 'owner_lookup_aberto';
