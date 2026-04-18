/**
 * Parametric search processing logic (Story 6.2)
 *
 * Handles async Apify search with user-defined filters,
 * post-filtering, and result insertion.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  runActor,
  waitForRun,
  getDatasetItems,
  normalizeListing,
  isInMoemaRegion,
  isWithinRadius,
  buildParametricSearchInput,
  ACTOR_IDS,
} from '@/lib/apify'
import type { NormalizedListing } from '@/lib/apify'
import type { PortalSearchParams } from '@/lib/supabase/types'

interface SearchProcessingResult {
  results_count: number
  new_listings_count: number
  fisbo_count: number
  apify_run_ids: Record<string, string>
  errors: string[]
}

/**
 * Process a parametric search: run Apify actors, normalize, filter, upsert.
 * Called asynchronously after the initial POST returns search_id.
 */
export async function processParametricSearch(
  searchId: string,
  consultantId: string,
  portals: string[],
  params: PortalSearchParams
): Promise<void> {
  const supabase = createAdminClient()

  // Mark search as running
  await supabase
    .from('portal_searches')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', searchId)

  const apifyRunIds: Record<string, string> = {}
  const errors: string[] = []
  let totalResults = 0
  let totalNew = 0
  let totalFisbo = 0

  for (const portal of portals as ('zap' | 'olx' | 'vivareal')[]) {
    const actorId = ACTOR_IDS[portal]
    if (!actorId) {
      errors.push(`No actor configured for ${portal}`)
      continue
    }

    try {
      // 1. Run Apify Actor with parametric input
      const run = await runActor(actorId, buildParametricSearchInput(portal, params))
      apifyRunIds[portal] = run.id

      // 2. Wait for completion (max 5 min)
      const completed = await waitForRun(run.id)

      // 3. Fetch raw results
      const rawItems = await getDatasetItems(completed.defaultDatasetId)

      // 4. Normalize and filter
      let listings = rawItems
        .filter((item) => isInMoemaRegion(item))
        .map((item) => normalizeListing(item, portal))
        .filter((l): l is NormalizedListing => l !== null)

      // 5. Post-filter: apply user params that Actor didn't support
      listings = applyPostFilters(listings, params)

      // 6. Upsert into scraped_listings and link to search results
      for (const listing of listings) {
        const { listingId, isNew } = await upsertListing(supabase, listing)
        if (!listingId) continue

        // Link to search results junction table
        await supabase.from('portal_search_results').upsert(
          { search_id: searchId, scraped_listing_id: listingId, is_new: isNew },
          { onConflict: 'search_id,scraped_listing_id' }
        )

        totalResults++
        if (isNew) totalNew++
        if (listing.is_fisbo) totalFisbo++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`${portal}: ${msg}`)
    }
  }

  // Update search record with final results
  const finalStatus = totalResults > 0 || errors.length === 0 ? 'completed' : 'failed'
  await supabase
    .from('portal_searches')
    .update({
      status: finalStatus,
      results_count: totalResults,
      new_listings_count: totalNew,
      fisbo_count: totalFisbo,
      apify_run_ids: apifyRunIds,
      apify_cost_usd: portals.length * 200 * 0.002, // Estimate: portals * maxItems * $0.002
      error_message: errors.length > 0 ? errors.join('; ') : null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', searchId)

  // Log to intelligence_feed (AC7)
  await supabase.from('intelligence_feed').insert({
    consultant_id: consultantId,
    tipo: 'busca_parametrica',
    prioridade: totalFisbo > 0 ? 'media' : 'baixa',
    titulo: `Busca parametrica concluida: ${totalResults} resultados`,
    descricao: `Novos: ${totalNew} | FISBO: ${totalFisbo} | Portais: ${portals.join(', ')}`,
    metadata: {
      search_id: searchId,
      params_summary: buildParamsSummary(params),
      results_count: totalResults,
      new_count: totalNew,
      fisbo_count: totalFisbo,
      errors,
    },
  })
}

/** Apply post-filters for params not natively supported by Apify actors */
function applyPostFilters(
  listings: NormalizedListing[],
  params: PortalSearchParams
): NormalizedListing[] {
  return listings.filter((l) => {
    if (params.quartos_min != null && (l.quartos == null || l.quartos < params.quartos_min)) return false
    if (params.quartos_max != null && (l.quartos == null || l.quartos > params.quartos_max)) return false
    if (params.area_min != null && (l.area_m2 == null || l.area_m2 < params.area_min)) return false
    if (params.area_max != null && (l.area_m2 == null || l.area_m2 > params.area_max)) return false
    if (params.preco_min != null && (l.preco == null || l.preco < params.preco_min)) return false
    if (params.preco_max != null && (l.preco == null || l.preco > params.preco_max)) return false

    // Geographic filter: if center + radius provided, filter by distance
    if (params.center_lat != null && params.center_lng != null && params.raio_metros && l.lat != null && l.lng != null) {
      if (!isWithinRadius(l.lat, l.lng, params.center_lat, params.center_lng, params.raio_metros)) {
        return false
      }
    }

    return true
  })
}

/** Upsert a listing into scraped_listings, return id and isNew flag */
async function upsertListing(
  supabase: ReturnType<typeof createAdminClient>,
  listing: NormalizedListing
): Promise<{ listingId: string | null; isNew: boolean }> {
  // Check if exists
  const { data: existing } = await supabase
    .from('scraped_listings')
    .select('id')
    .eq('portal', listing.portal)
    .eq('external_id', listing.external_id)
    .maybeSingle()

  if (existing) {
    // Update last_seen_at and contact data
    await supabase
      .from('scraped_listings')
      .update({
        last_seen_at: new Date().toISOString(),
        is_active: true,
        ...(listing.nome_anunciante && { nome_anunciante: listing.nome_anunciante }),
        ...(listing.telefone_anunciante && { telefone_anunciante: listing.telefone_anunciante }),
        ...(listing.email_anunciante && { email_anunciante: listing.email_anunciante }),
        ...(listing.whatsapp_anunciante && { whatsapp_anunciante: listing.whatsapp_anunciante }),
        ...(listing.nome_anunciante && { lgpd_consent_origin: 'portal_publico' }),
      })
      .eq('id', existing.id)

    return { listingId: existing.id, isNew: false }
  }

  // Insert new
  const insertData: Record<string, unknown> = {
    portal: listing.portal,
    external_id: listing.external_id,
    url: listing.url,
    tipo_anunciante: listing.tipo_anunciante,
    endereco: listing.endereco,
    bairro: listing.bairro,
    preco: listing.preco,
    area_m2: listing.area_m2,
    preco_m2: listing.preco_m2,
    tipologia: listing.tipologia,
    quartos: listing.quartos,
    descricao: listing.descricao,
    is_fisbo: listing.is_fisbo,
    is_active: true,
    geocoding_status: listing.lat ? 'success' : 'pending',
    nome_anunciante: listing.nome_anunciante,
    telefone_anunciante: listing.telefone_anunciante,
    email_anunciante: listing.email_anunciante,
    whatsapp_anunciante: listing.whatsapp_anunciante,
    lgpd_consent_origin: listing.nome_anunciante ? 'portal_publico' : null,
  }

  const { data, error } = await supabase
    .from('scraped_listings')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return { listingId: null, isNew: false }
  return { listingId: data.id, isNew: true }
}

/** Build human-readable summary of search params */
function buildParamsSummary(params: PortalSearchParams): string {
  const parts: string[] = []
  if (params.quartos_min != null) parts.push(`${params.quartos_min}q+`)
  if (params.area_min != null || params.area_max != null) {
    parts.push(`${params.area_min || '?'}-${params.area_max || '?'}m²`)
  }
  if (params.preco_min != null || params.preco_max != null) {
    const min = params.preco_min ? `R$${(params.preco_min / 1000).toFixed(0)}K` : '?'
    const max = params.preco_max ? `R$${(params.preco_max / 1000).toFixed(0)}K` : '?'
    parts.push(`${min}-${max}`)
  }
  if (params.bairros?.length) parts.push(params.bairros[0])
  if (params.raio_metros) parts.push(`raio ${params.raio_metros}m`)
  return parts.join(', ') || 'sem filtros'
}

/** Check rate limit: max 5 searches per hour per consultant */
export async function checkRateLimit(
  consultantId: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabase = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('portal_searches')
    .select('*', { count: 'exact', head: true })
    .eq('consultant_id', consultantId)
    .gte('created_at', oneHourAgo)
    .neq('status', 'cancelled')

  if ((count ?? 0) >= 5) {
    return { allowed: false, retryAfterSeconds: 3600 }
  }
  return { allowed: true }
}
