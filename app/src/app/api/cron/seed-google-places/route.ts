import { NextResponse } from 'next/server'
import { createAdminClient, verifyCronSecret } from '@/lib/supabase/admin'

/**
 * POST /api/cron/seed-google-places
 *
 * Story 3.5, AC2 — Enrich buildings via Google Places API (type=apartment_building).
 * Searches for apartment buildings near epicenter coordinates.
 *
 * Query params:
 *   ?epicentro_id=uuid — specific epicenter to seed
 *   ?radius=2000       — search radius in meters (default: 2000)
 */

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'

interface PlaceResult {
  place_id: string
  name: string
  formatted_address?: string
  geometry: { location: { lat: number; lng: number } }
  rating?: number
  user_ratings_total?: number
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GOOGLE_API_KEY' }, { status: 500 })
  }

  const url = new URL(request.url)
  const epicentroId = url.searchParams.get('epicentro_id')
  const radius = parseInt(url.searchParams.get('radius') || '2000')

  const supabase = createAdminClient()

  // Get epicenter coordinates
  let epicentros
  if (epicentroId) {
    const { data } = await supabase
      .from('epicentros')
      .select('id, coordinates, raio_ativo_m')
      .eq('id', epicentroId)
      .eq('is_active', true)
    epicentros = data
  } else {
    const { data } = await supabase
      .from('epicentros')
      .select('id, coordinates, raio_ativo_m')
      .eq('is_active', true)
    epicentros = data
  }

  if (!epicentros || epicentros.length === 0) {
    return NextResponse.json({ success: true, message: 'No active epicenters', enriched: 0 })
  }

  let totalEnriched = 0
  let totalNew = 0
  const errors: string[] = []

  for (const epicentro of epicentros) {
    // Parse PostGIS coordinates
    const coordMatch = epicentro.coordinates?.match?.(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (!coordMatch) continue
    const [, lngStr, latStr] = coordMatch
    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)

    try {
      // Fetch all pages from Google Places
      let nextPageToken: string | null = null
      const allPlaces: PlaceResult[] = []

      do {
        const params = new URLSearchParams({
          location: `${lat},${lng}`,
          radius: String(Math.min(radius, epicentro.raio_ativo_m || radius)),
          type: 'apartment_building',
          key: apiKey,
        })
        if (nextPageToken) params.set('pagetoken', nextPageToken)

        const res = await fetch(`${PLACES_BASE}?${params}`)
        if (!res.ok) throw new Error(`Google Places API: ${res.status}`)

        const data = await res.json()
        allPlaces.push(...(data.results || []))
        nextPageToken = data.next_page_token || null

        // Google requires 2s delay before using next_page_token
        if (nextPageToken) await new Promise((r) => setTimeout(r, 2000))
      } while (nextPageToken)

      // Match/insert each place
      for (const place of allPlaces) {
        const pLat = place.geometry.location.lat
        const pLng = place.geometry.location.lng

        // Check if building exists within 30m
        const { data: nearby } = await supabase.rpc('fn_edificios_no_raio', {
          p_lat: pLat,
          p_lng: pLng,
          p_raio_metros: 30,
        })

        if (nearby && nearby.length > 0) {
          // Update existing building (COALESCE — only fill NULLs, AC5)
          const edificio = nearby[0]
          const { error: updateErr } = await supabase
            .from('edificios')
            .update({ seed_source_secondary: 'google_places' })
            .eq('id', edificio.id)
            .is('seed_source_secondary', null)

          if (!updateErr) totalEnriched++
        } else {
          // Insert new building
          const { error: insertErr } = await supabase.from('edificios').insert({
            nome: place.name,
            endereco: place.formatted_address || place.name,
            endereco_normalizado: place.formatted_address,
            origem: 'api',
            seed_source: 'google_places',
            seed_source_secondary: 'google_places',
            verificado: false,
            cidade: 'São Paulo',
            estado: 'SP',
          })

          if (insertErr) errors.push(`Insert ${place.name}: ${insertErr.message}`)
          else totalNew++
        }
      }
    } catch (err) {
      errors.push(`Epicentro ${epicentro.id}: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  // Log to feed
  await supabase.from('intelligence_feed').insert({
    consultant_id: '00000000-0000-0000-0000-000000000000',
    tipo: 'seed_completo',
    prioridade: 'baixa',
    titulo: 'Seed Google Places concluido',
    descricao: `Enriquecidos: ${totalEnriched} | Novos: ${totalNew}`,
    metadata: { fonte: 'google_places', edificios_enriquecidos: totalEnriched, novos_edificios: totalNew },
  })

  return NextResponse.json({ success: true, enriched: totalEnriched, new: totalNew, errors: errors.slice(0, 10) })
}
