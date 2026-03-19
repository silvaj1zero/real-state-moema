import { NextResponse } from 'next/server'
import { createAdminClient, verifyCronSecret } from '@/lib/supabase/admin'

/**
 * POST /api/cron/seed-osm-advanced
 *
 * Story 3.5, AC3 — Enrich buildings via OSM Overpass API.
 * Fetches building:levels and other advanced tags from OSM.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

interface OsmElement {
  type: 'way' | 'node' | 'relation'
  id: number
  center?: { lat: number; lon: number }
  lat?: number
  lon?: number
  tags?: Record<string, string>
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const epicentroId = url.searchParams.get('epicentro_id')
  const radius = parseInt(url.searchParams.get('radius') || '2000')

  const supabase = createAdminClient()

  // Get epicenter coordinates
  const query = epicentroId
    ? supabase.from('epicentros').select('id, coordinates, raio_ativo_m').eq('id', epicentroId).eq('is_active', true)
    : supabase.from('epicentros').select('id, coordinates, raio_ativo_m').eq('is_active', true)

  const { data: epicentros } = await query

  if (!epicentros || epicentros.length === 0) {
    return NextResponse.json({ success: true, message: 'No active epicenters', enriched: 0 })
  }

  let totalEnriched = 0
  const errors: string[] = []

  for (const epicentro of epicentros) {
    const coordMatch = epicentro.coordinates?.match?.(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (!coordMatch) continue
    const [, lngStr, latStr] = coordMatch
    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)
    const r = Math.min(radius, epicentro.raio_ativo_m || radius)

    try {
      // Overpass query: apartments with advanced tags
      const overpassQuery = `[out:json][timeout:180];(way["building"="apartments"](around:${r},${lat},${lng});way["building"="residential"](around:${r},${lat},${lng}););out center tags;`

      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      })

      if (!res.ok) throw new Error(`Overpass API: ${res.status}`)

      const data = await res.json()
      const elements: OsmElement[] = data.elements || []

      for (const el of elements) {
        const elLat = el.center?.lat ?? el.lat
        const elLng = el.center?.lon ?? el.lon
        if (!elLat || !elLng) continue

        const tags = el.tags || {}
        const levels = tags['building:levels'] ? parseInt(tags['building:levels']) : null

        // Only process if we have useful advanced data
        if (!levels && !tags.name) continue

        // Match with existing building within 20m
        const { data: nearby } = await supabase.rpc('fn_edificios_no_raio', {
          p_lat: elLat,
          p_lng: elLng,
          p_raio_metros: 20,
        })

        if (nearby && nearby.length > 0) {
          const edificio = nearby[0]
          const updateData: Record<string, unknown> = {}

          // Only fill NULL fields (AC5: COALESCE logic)
          if (levels) updateData.num_pavimentos = levels

          if (Object.keys(updateData).length > 0) {
            updateData.seed_source_secondary = 'osm_overpass'
            const { error } = await supabase
              .from('edificios')
              .update(updateData)
              .eq('id', edificio.id)
              .is('num_pavimentos', null)

            if (!error) totalEnriched++
          }
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
    titulo: 'Seed OSM Overpass concluido',
    descricao: `Edificios enriquecidos: ${totalEnriched}`,
    metadata: { fonte: 'osm_overpass', edificios_enriquecidos: totalEnriched },
  })

  return NextResponse.json({ success: true, enriched: totalEnriched, errors: errors.slice(0, 10) })
}
