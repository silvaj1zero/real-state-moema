import { NextResponse } from 'next/server'
import { createAdminClient, verifyCronSecret } from '@/lib/supabase/admin'
import { geocodeAddress } from '@/lib/geocoding'

/**
 * POST /api/cron/geocode-listings
 *
 * Story 3.4, AC4 — Geocode pending listings via Mapbox.
 * Processes listings with geocoding_status='pending' and an address.
 * Rate limited: 100ms between requests (Mapbox free tier 600 req/min).
 *
 * Query params:
 *   ?limit=50   — max listings to process (default: 50)
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const supabase = createAdminClient()

  // Fetch pending listings with address
  const { data: pending, error: fetchErr } = await supabase
    .from('scraped_listings')
    .select('id, endereco')
    .eq('geocoding_status', 'pending')
    .not('endereco', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No pending listings' })
  }

  let geocoded = 0
  let failed = 0
  const errors: string[] = []

  for (const listing of pending) {
    if (!listing.endereco) continue

    try {
      const result = await geocodeAddress(listing.endereco)

      if (result) {
        // Update with coordinates using raw SQL for PostGIS geography
        const { error: updateErr } = await supabase.rpc('fn_set_listing_coordinates', {
          p_listing_id: listing.id,
          p_lat: result.lat,
          p_lng: result.lng,
          p_endereco_normalizado: result.placeName,
        })

        if (updateErr) {
          // Fallback: update without geography (just status)
          await supabase
            .from('scraped_listings')
            .update({
              geocoding_status: 'success' as const,
              endereco_normalizado: result.placeName,
            })
            .eq('id', listing.id)
        }

        geocoded++
      } else {
        await supabase
          .from('scraped_listings')
          .update({ geocoding_status: 'failed' as const })
          .eq('id', listing.id)
        failed++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      errors.push(`${listing.id}: ${msg}`)
      failed++
    }

    // Rate limit: 100ms between requests
    await new Promise((r) => setTimeout(r, 100))
  }

  return NextResponse.json({
    success: true,
    processed: pending.length,
    geocoded,
    failed,
    errors: errors.slice(0, 10),
  })
}
