import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SearchIdParamSchema } from '@/lib/schemas/search'

/**
 * GET /api/search/parametric/[searchId]
 *
 * Story 6.2, AC6 — Polling endpoint for search status and results.
 * Client polls every 5s while status is 'pending' or 'running'.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const raw = await params
  const parsed = SearchIdParamSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid searchId' }, { status: 400 })
  }
  const { searchId } = parsed.data
  const supabase = createAdminClient()

  // Fetch search record
  const { data: search, error } = await supabase
    .from('portal_searches')
    .select('*')
    .eq('id', searchId)
    .single()

  if (error || !search) {
    return NextResponse.json({ error: 'Search not found' }, { status: 404 })
  }

  const response: Record<string, unknown> = {
    id: search.id,
    status: search.status,
    results_count: search.results_count,
    new_listings_count: search.new_listings_count,
    fisbo_count: search.fisbo_count,
    apify_cost_usd: search.apify_cost_usd,
    error_message: search.error_message,
    started_at: search.started_at,
    completed_at: search.completed_at,
    search_params: search.search_params,
    portals: search.portals,
  }

  // If completed, include results (listings joined via portal_search_results)
  if (search.status === 'completed' || search.status === 'failed') {
    const { data: results } = await supabase
      .from('portal_search_results')
      .select(`
        is_new,
        scraped_listing_id,
        scraped_listings (
          id, portal, external_id, url, tipo_anunciante,
          endereco, endereco_normalizado, bairro,
          preco, area_m2, preco_m2, tipologia, quartos,
          descricao, is_fisbo, is_active,
          first_seen_at, last_seen_at, removed_at,
          preco_anterior, matched_edificio_id,
          match_method, match_distance_m,
          nome_anunciante, telefone_anunciante,
          email_anunciante, whatsapp_anunciante,
          creci_anunciante
        )
      `)
      .eq('search_id', searchId)
      .order('created_at', { ascending: false })

    response.results = (results || []).map((r) => ({
      ...r.scraped_listings,
      is_new: r.is_new,
    }))
  }

  return NextResponse.json(response)
}
