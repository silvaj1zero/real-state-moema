'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const agentKeys = {
  status: ['agent-status'] as const,
  cronLogs: ['agent-cron-logs'] as const,
  geocodingPending: ['agent-geocoding-pending'] as const,
  unmatchedCount: ['agent-unmatched'] as const,
}

// ---------------------------------------------------------------------------
// useAgentStatus — fetch latest cron run logs from intelligence_feed
// ---------------------------------------------------------------------------

export interface CronRunLog {
  id: string
  tipo: string
  titulo: string
  descricao: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export function useAgentCronLogs() {
  return useQuery({
    queryKey: agentKeys.cronLogs,
    queryFn: async (): Promise<CronRunLog[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('intelligence_feed')
        .select('id, tipo, titulo, descricao, metadata, created_at')
        .in('tipo', ['sync_completo', 'seed_completo'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) return []
      return (data ?? []) as CronRunLog[]
    },
    staleTime: 30 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useGeocodingPending — count of listings awaiting geocoding
// ---------------------------------------------------------------------------

export function useGeocodingPending() {
  return useQuery({
    queryKey: agentKeys.geocodingPending,
    queryFn: async (): Promise<number> => {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('scraped_listings')
        .select('*', { count: 'exact', head: true })
        .eq('geocoding_status', 'pending')
        .not('endereco', 'is', null)

      if (error) return 0
      return count ?? 0
    },
    staleTime: 30 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useUnmatchedCount — count of listings not matched to buildings
// ---------------------------------------------------------------------------

export function useUnmatchedCount() {
  return useQuery({
    queryKey: agentKeys.unmatchedCount,
    queryFn: async (): Promise<number> => {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('scraped_listings')
        .select('*', { count: 'exact', head: true })
        .eq('match_method', 'unmatched')
        .not('coordinates', 'is', null)
        .neq('geocoding_status', 'pending')

      if (error) return 0
      return count ?? 0
    },
    staleTime: 30 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useRunScraper — trigger manual scrape via API route
// ---------------------------------------------------------------------------

export function useRunScraper() {
  const queryClient = useQueryClient()

  return useMutation<Record<string, unknown>, Error, 'zap' | 'olx' | 'vivareal' | undefined>({
    mutationFn: async (portal) => {
      const params = portal ? `?portal=${portal}` : ''
      const res = await fetch(`/api/cron/scrape-portals${params}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Scrape failed: ${res.status}`)
      return res.json()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-listings'] })
      queryClient.invalidateQueries({ queryKey: agentKeys.cronLogs })
    },
  })
}

// ---------------------------------------------------------------------------
// useRunGeocode — trigger manual geocoding via API route
// ---------------------------------------------------------------------------

export function useRunGeocode() {
  const queryClient = useQueryClient()

  return useMutation<Record<string, unknown>, Error, number>({
    mutationFn: async (limit) => {
      const res = await fetch(`/api/cron/geocode-listings?limit=${limit}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Geocode failed: ${res.status}`)
      return res.json()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.geocodingPending })
      queryClient.invalidateQueries({ queryKey: ['scraped-listings'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useRunMatch — trigger manual matching via API route
// ---------------------------------------------------------------------------

export function useRunMatch() {
  const queryClient = useQueryClient()

  return useMutation<Record<string, unknown>, Error, number>({
    mutationFn: async (limit) => {
      const res = await fetch(`/api/cron/match-listings?limit=${limit}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Match failed: ${res.status}`)
      return res.json()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.unmatchedCount })
      queryClient.invalidateQueries({ queryKey: ['scraped-listings'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useRunCrossRef — trigger cross-referencing via API route
// ---------------------------------------------------------------------------

export function useRunCrossRef() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<Record<string, unknown>> => {
      const res = await fetch('/api/cron/cross-reference', { method: 'POST' })
      if (!res.ok) throw new Error(`CrossRef failed: ${res.status}`)
      return res.json()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-listings'] })
      queryClient.invalidateQueries({ queryKey: agentKeys.cronLogs })
    },
  })
}
