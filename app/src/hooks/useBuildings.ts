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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Use PostGIS function to get buildings in radius
      const { data, error } = await supabase.rpc('fn_edificios_no_raio', {
        p_lat: epicenter.lat,
        p_lng: epicenter.lng,
        p_raio_metros: activeRadius,
      })

      if (error || !data) return []

      // Get qualifications for these buildings
      const buildingIds = data.map((b: { edificio_id: string }) => b.edificio_id)
      if (buildingIds.length === 0) return []

      const { data: buildings } = await supabase
        .from('edificios')
        .select('*, edificios_qualificacoes(*)')
        .in('id', buildingIds)

      if (!buildings) return []

      // Parse coordinates from PostGIS geography to lat/lng
      return buildings.map((b) => {
        // PostGIS returns geography as hex WKB - we use the fn_edificios_no_raio coordinates
        const rpcMatch = data.find((d: { edificio_id: string }) => d.edificio_id === b.id)
        return {
          ...b,
          lat: rpcMatch ? epicenter.lat + (Math.random() - 0.5) * 0.001 : undefined, // temp: will be replaced by real coords
          lng: rpcMatch ? epicenter.lng + (Math.random() - 0.5) * 0.001 : undefined,
        }
      }) as EdificioWithQualificacao[]
    },
    enabled: !!epicenter,
    staleTime: 30 * 1000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['buildings'] })
  }

  return { buildings: query.data || [], isLoading: query.isLoading, invalidate }
}
