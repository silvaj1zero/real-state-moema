// Seed data orchestrator
// Story 1.7: Strategy — OSM primary (16.595 verified), Google Places enrichment
// VETO PV #1: "Dados antes de ação" — mapa DEVE estar populado no dia 1

import { createClient } from '@/lib/supabase/client'
import { fetchBuildingsFromOverpass } from './overpass'

interface SeedResult {
  inserted: number
  skipped: number
  errors: number
  total: number
}

export async function seedBuildingsForEpicenter(
  lat: number,
  lng: number,
  radiusMeters: number = 2000
): Promise<SeedResult> {
  const supabase = createClient()
  const result: SeedResult = { inserted: 0, skipped: 0, errors: 0, total: 0 }

  // Fetch from Overpass API (primary source)
  const buildings = await fetchBuildingsFromOverpass(lat, lng, radiusMeters)
  result.total = buildings.length

  if (buildings.length === 0) {
    return result
  }

  // Process in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < buildings.length; i += BATCH_SIZE) {
    const batch = buildings.slice(i, i + BATCH_SIZE)

    for (const b of batch) {
      try {
        // Check deduplication: any existing building within 30m?
        const { data: nearby } = await supabase.rpc('fn_edificios_no_raio', {
          p_lat: b.lat,
          p_lng: b.lng,
          p_raio_metros: 30,
        })

        if (nearby && nearby.length > 0) {
          result.skipped++
          continue
        }

        // Generate name if missing
        const nome = b.name || b.address || `Edifício ${b.street || ''} ${b.housenumber || ''}`.trim() || `Edifício OSM-${b.id}`

        const { error } = await supabase.from('edificios').insert({
          nome,
          endereco: b.address || `${b.lat.toFixed(6)}, ${b.lng.toFixed(6)}`,
          coordinates: `SRID=4326;POINT(${b.lng} ${b.lat})`,
          bairro: b.suburb || 'Moema',
          cep: b.postcode || null,
          cidade: 'Sao Paulo',
          estado: 'SP',
          origem: 'seed',
          seed_source: 'osm_overpass',
          verificado: false,
          created_by: null,
        })

        if (error) {
          result.errors++
        } else {
          result.inserted++
        }
      } catch {
        result.errors++
      }
    }
  }

  return result
}
