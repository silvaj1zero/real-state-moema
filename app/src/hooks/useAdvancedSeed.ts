'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const seedKeys = {
  progress: ['seed-progress'] as const,
  breakdown: ['seed-breakdown'] as const,
}

// ---------------------------------------------------------------------------
// useSeedProgress — Story 3.5, AC6
// ---------------------------------------------------------------------------

export interface SeedProgress {
  total: number
  enrichedCount: number
  percentage: number
  bySource: {
    google_places: number
    osm_overpass: number
    geosampa_iptu: number
    manual: number
  }
  byField: {
    total_units: { filled: number; total: number; pct: number }
    ano_construcao: { filled: number; total: number; pct: number }
    padrao_iptu: { filled: number; total: number; pct: number }
    num_pavimentos: { filled: number; total: number; pct: number }
  }
}

export function useSeedProgress() {
  return useQuery({
    queryKey: seedKeys.progress,
    queryFn: async (): Promise<SeedProgress> => {
      const supabase = createClient()

      const [totalRes, enrichedRes, googleRes, osmRes, geosampaRes, unitsRes, anoRes, padraoRes, pavRes] =
        await Promise.all([
          supabase.from('edificios').select('*', { count: 'exact', head: true }),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).not('seed_source_secondary', 'is', null),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).eq('seed_source_secondary', 'google_places'),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).eq('seed_source_secondary', 'osm_overpass'),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).eq('seed_source_secondary', 'geosampa_iptu'),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).not('total_units', 'is', null),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).not('ano_construcao', 'is', null),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).not('padrao_iptu', 'is', null),
          supabase.from('edificios').select('*', { count: 'exact', head: true }).not('num_pavimentos', 'is', null),
        ])

      const total = totalRes.count ?? 0
      const enrichedCount = enrichedRes.count ?? 0

      return {
        total,
        enrichedCount,
        percentage: total > 0 ? Math.round((enrichedCount / total) * 100) : 0,
        bySource: {
          google_places: googleRes.count ?? 0,
          osm_overpass: osmRes.count ?? 0,
          geosampa_iptu: geosampaRes.count ?? 0,
          manual: total - enrichedCount,
        },
        byField: {
          total_units: { filled: unitsRes.count ?? 0, total, pct: total > 0 ? Math.round(((unitsRes.count ?? 0) / total) * 100) : 0 },
          ano_construcao: { filled: anoRes.count ?? 0, total, pct: total > 0 ? Math.round(((anoRes.count ?? 0) / total) * 100) : 0 },
          padrao_iptu: { filled: padraoRes.count ?? 0, total, pct: total > 0 ? Math.round(((padraoRes.count ?? 0) / total) * 100) : 0 },
          num_pavimentos: { filled: pavRes.count ?? 0, total, pct: total > 0 ? Math.round(((pavRes.count ?? 0) / total) * 100) : 0 },
        },
      }
    },
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useRunSeed — trigger manual seed via API route
// ---------------------------------------------------------------------------

export function useRunSeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (source: 'google-places' | 'osm-advanced' | 'all'): Promise<Record<string, unknown>> => {
      const results: Record<string, unknown> = {}

      if (source === 'google-places' || source === 'all') {
        const res = await fetch('/api/cron/seed-google-places', { method: 'POST' })
        results.googlePlaces = res.ok ? await res.json() : { error: res.status }
      }
      if (source === 'osm-advanced' || source === 'all') {
        const res = await fetch('/api/cron/seed-osm-advanced', { method: 'POST' })
        results.osmAdvanced = res.ok ? await res.json() : { error: res.status }
      }

      return results
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: seedKeys.progress })
    },
  })
}
