'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSearchStore, type SearchFilters } from '@/store/search'
import { useAuthStore } from '@/store/auth'
import type { ScrapedListingParametric, PortalSearch } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const parametricKeys = {
  local: (lat: number, lng: number, radius: number, filters: SearchFilters) =>
    ['parametric-local', lat, lng, radius, ...Object.values(filters)] as const,
  status: (searchId: string) => ['parametric-status', searchId] as const,
  history: (consultantId: string) => ['parametric-history', consultantId] as const,
}

// ---------------------------------------------------------------------------
// useLocalSearch — query existing scraped_listings via Supabase RPC
// ---------------------------------------------------------------------------

export function useLocalSearch(
  lat: number | null,
  lng: number | null,
  radius: number,
  filters: SearchFilters
) {
  return useQuery({
    queryKey: lat != null && lng != null
      ? parametricKeys.local(lat, lng, radius, filters)
      : ['parametric-local', 'disabled'],
    queryFn: async (): Promise<ScrapedListingParametric[]> => {
      if (lat == null || lng == null) return []

      const supabase = createClient()

      const { data, error } = await supabase.rpc('fn_scraped_listings_parametric', {
        p_lat: lat,
        p_lng: lng,
        p_raio_metros: radius,
        p_quartos_min: filters.quartos_min,
        p_quartos_max: filters.quartos_max,
        p_area_min: filters.area_min,
        p_area_max: filters.area_max,
        p_preco_min: filters.preco_min,
        p_preco_max: filters.preco_max,
      })

      if (error) {
        console.error('Error in fn_scraped_listings_parametric:', error)
        return []
      }

      return (data ?? []) as ScrapedListingParametric[]
    },
    enabled: lat != null && lng != null,
    staleTime: 30 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useTriggerSearch — mutation to POST /api/search/parametric
// ---------------------------------------------------------------------------

export function useTriggerSearch() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const {
    center,
    radius,
    filters,
    tipo_transacao,
    selectedPortals,
    selectedEdificioIds,
    searchMode,
    startSearch,
    setSearchStatus,
  } = useSearchStore()

  return useMutation({
    mutationFn: async (): Promise<{ search_id: string; status: string }> => {
      if (!user?.id) throw new Error('Usuario nao autenticado')

      const portals = Array.from(selectedPortals)
      const edificioIds = searchMode === 'buildings' ? Array.from(selectedEdificioIds) : undefined

      const params = {
        ...filters,
        tipo_transacao,
        center_lat: center?.lat,
        center_lng: center?.lng,
        raio_metros: radius,
        edificio_ids: edificioIds,
        portais: portals,
      }

      const response = await fetch('/api/search/parametric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: user.id,
          portals,
          params,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      return response.json()
    },
    onSuccess: (data) => {
      startSearch(data.search_id)
    },
    onError: () => {
      setSearchStatus('failed')
    },
    onSettled: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: parametricKeys.history(user.id) })
      }
    },
  })
}

// ---------------------------------------------------------------------------
// useSearchStatus — polls search status while pending/running
// ---------------------------------------------------------------------------

interface SearchStatusResponse {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results_count: number
  new_listings_count: number
  fisbo_count: number
  apify_cost_usd: number | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  search_params: Record<string, unknown>
  portals: string[]
  results?: ScrapedListingParametric[]
}

export function useSearchStatus(searchId: string | null) {
  const setSearchStatus = useSearchStore((s) => s.setSearchStatus)

  return useQuery({
    queryKey: searchId ? parametricKeys.status(searchId) : ['parametric-status', 'none'],
    queryFn: async (): Promise<SearchStatusResponse | null> => {
      if (!searchId) return null

      const response = await fetch(`/api/search/parametric/${searchId}`)
      if (!response.ok) return null

      const data = (await response.json()) as SearchStatusResponse

      // Sync status back to store
      if (data.status === 'completed') setSearchStatus('completed')
      else if (data.status === 'failed') setSearchStatus('failed')
      else if (data.status === 'running') setSearchStatus('running')
      else if (data.status === 'pending') setSearchStatus('pending')

      return data
    },
    enabled: !!searchId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 5000
      if (data.status === 'pending' || data.status === 'running') return 5000
      return false
    },
  })
}

// ---------------------------------------------------------------------------
// useSearchHistory — list recent searches for a consultant
// ---------------------------------------------------------------------------

export function useSearchHistory(consultantId: string | null) {
  return useQuery({
    queryKey: consultantId ? parametricKeys.history(consultantId) : ['parametric-history', 'none'],
    queryFn: async (): Promise<PortalSearch[]> => {
      if (!consultantId) return []

      const supabase = createClient()

      const { data, error } = await supabase
        .from('portal_searches')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching search history:', error)
        return []
      }

      return (data ?? []) as PortalSearch[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })
}
