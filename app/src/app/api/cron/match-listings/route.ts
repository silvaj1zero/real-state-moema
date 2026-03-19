import { NextResponse } from 'next/server'
import { createAdminClient, verifyCronSecret } from '@/lib/supabase/admin'

/**
 * POST /api/cron/match-listings
 *
 * Story 3.4, AC3 — Match scraped listings to buildings via PostGIS ST_DWithin(50m).
 * Uses fn_match_listing_edificio RPC.
 *
 * Query params:
 *   ?limit=100  — max listings to process (default: 100)
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '100')

  const supabase = createAdminClient()

  // Fetch listings with coordinates but no match yet
  const { data: unmatched, error: fetchErr } = await supabase
    .from('scraped_listings')
    .select('id')
    .eq('match_method', 'unmatched')
    .not('coordinates', 'is', null)
    .neq('geocoding_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!unmatched || unmatched.length === 0) {
    return NextResponse.json({ success: true, processed: 0, matched: 0, message: 'No unmatched listings' })
  }

  let matched = 0
  let noMatch = 0
  const errors: string[] = []

  for (const listing of unmatched) {
    try {
      // Call RPC function
      const { data: matchResult, error: rpcErr } = await supabase.rpc('fn_match_listing_edificio', {
        p_listing_id: listing.id,
      })

      if (rpcErr) {
        errors.push(`${listing.id}: ${rpcErr.message}`)
        continue
      }

      if (matchResult && matchResult.length > 0) {
        const best = matchResult[0]
        const { error: updateErr } = await supabase
          .from('scraped_listings')
          .update({
            matched_edificio_id: best.edificio_id,
            match_method: best.metodo,
            match_distance_m: best.distancia_m,
          })
          .eq('id', listing.id)

        if (updateErr) errors.push(`Update ${listing.id}: ${updateErr.message}`)
        else matched++
      } else {
        noMatch++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      errors.push(`${listing.id}: ${msg}`)
    }
  }

  return NextResponse.json({
    success: true,
    processed: unmatched.length,
    matched,
    noMatch,
    errors: errors.slice(0, 10),
  })
}
