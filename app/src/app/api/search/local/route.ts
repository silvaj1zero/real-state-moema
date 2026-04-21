import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/search/local
 *
 * Busca imóveis em scraped_listings via RPC fn_scraped_listings_parametric.
 * Depende do PostgREST schema cache reconhecer a função — se cache estiver
 * obsoleto (PGRST202), rode: docs/UNBLOCK-POSTGREST.sql
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      p_lat,
      p_lng,
      p_raio_metros = 2000,
      p_quartos_min = null,
      p_quartos_max = null,
      p_area_min = null,
      p_area_max = null,
      p_preco_min = null,
      p_preco_max = null,
      p_bairros = null,
      p_fisbo_only = false,
      p_portal = null,
      p_limit = 100,
    } = body

    if (p_lat == null || p_lng == null) {
      return NextResponse.json({ error: 'p_lat and p_lng are required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('fn_scraped_listings_parametric', {
      p_lat,
      p_lng,
      p_raio_metros,
      p_quartos_min,
      p_quartos_max,
      p_area_min,
      p_area_max,
      p_preco_min,
      p_preco_max,
      p_bairros,
      p_fisbo_only,
      p_portal,
      p_limit,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, hint: error.hint ?? undefined },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
