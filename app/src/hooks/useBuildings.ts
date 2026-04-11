'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/store/map'
import type { EdificioWithQualificacao } from '@/lib/supabase/types'

export function useBuildings() {
  const epicenter = useMapStore((s) => s.epicenter)
  const activeRadius = useMapStore((s) => s.activeRadius)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['buildings', epicenter?.lat, epicenter?.lng, activeRadius],
    queryFn: async (): Promise<EdificioWithQualificacao[]> => {
      if (!epicenter) return []

      const supabase = createClient()

      // Fetch all buildings (seed data has no auth requirement)
      const { data, error } = await supabase
        .from('edificios')
        .select('*, edificios_qualificacoes(*)')
        .limit(2000)

      if (error) {
        throw new Error(`Failed to fetch buildings: ${error.message}`)
      }

      if (!data || data.length === 0) return []

      // Parse WKB hex coordinates and filter by radius client-side
      const results: EdificioWithQualificacao[] = []

      for (const b of data) {
        const lat = parseWKBCoord(b.coordinates, 'lat')
        const lng = parseWKBCoord(b.coordinates, 'lng')
        if (lat === undefined || lng === undefined) continue

        // Client-side radius filter (approximate using Haversine)
        const dist = haversineDistance(epicenter.lat, epicenter.lng, lat, lng)
        if (dist <= activeRadius) {
          results.push({ ...b, lat, lng } as EdificioWithQualificacao)
        }
      }

      return results
    },
    enabled: !!epicenter,
    staleTime: 30 * 1000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['buildings'] })
  }

  return { buildings: query.data || [], isLoading: query.isLoading, error: query.error, refetch: query.refetch, invalidate }
}

// Parse WKB hex → lat or lng
// PostGIS geography WKB: 0101000020E6100000 (header 18 chars) + 16 chars lng + 16 chars lat
function parseWKBCoord(coords: string | null, which: 'lat' | 'lng'): number | undefined {
  if (!coords) return undefined

  // EWKT format: SRID=4326;POINT(-46.675 -23.605)
  const ewkt = coords.match(/POINT\(([^ ]+) ([^ ]+)\)/)
  if (ewkt) return which === 'lng' ? parseFloat(ewkt[1]) : parseFloat(ewkt[2])

  // WKB hex format
  try {
    const clean = coords.replace(/^0101000020[A-Fa-f0-9]{8}/, '')
    if (clean.length < 32) return undefined
    const offset = which === 'lng' ? 0 : 16
    const hex = clean.substring(offset, offset + 16)
    const bytes = new Uint8Array(8)
    for (let i = 0; i < 8; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
    }
    return new DataView(bytes.buffer).getFloat64(0, true)
  } catch {
    return undefined
  }
}

// Haversine distance in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
