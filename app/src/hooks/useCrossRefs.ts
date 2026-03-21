'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const crossRefKeys = {
  all: ['cross-refs'] as const,
  pending: ['cross-refs', 'pending'] as const,
  stats: ['cross-refs', 'stats'] as const,
  transitions: ['cross-refs', 'transitions'] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossRef {
  id: string
  listing_a_id: string
  listing_b_id: string
  match_score: number
  match_method: string | null
  is_confirmed: boolean
  merged_at: string | null
  reviewed_by: string | null
  created_at: string
  // Joined listing data
  listing_a?: {
    portal: string
    endereco: string | null
    preco: number | null
    area_m2: number | null
  }
  listing_b?: {
    portal: string
    endereco: string | null
    preco: number | null
    area_m2: number | null
  }
}

export interface CrossRefStats {
  totalGroups: number
  totalRefs: number
  pendingReview: number
  transitions: number
  avgTimeOnMarket: number | null
}

// ---------------------------------------------------------------------------
// useCrossRefsPending — Story 3.6, AC7: suggestions for review (score 60-79)
// ---------------------------------------------------------------------------

export function useCrossRefsPending() {
  return useQuery({
    queryKey: crossRefKeys.pending,
    queryFn: async (): Promise<CrossRef[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('listing_cross_refs')
        .select(`
          *,
          listing_a:scraped_listings!listing_a_id(portal, endereco, preco, area_m2),
          listing_b:scraped_listings!listing_b_id(portal, endereco, preco, area_m2)
        `)
        .eq('is_confirmed', false)
        .is('merged_at', null)
        .gte('match_score', 60)
        .order('match_score', { ascending: false })
        .limit(50)

      if (error) return []
      return (data ?? []) as CrossRef[]
    },
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useCrossRefStats
// ---------------------------------------------------------------------------

export function useCrossRefStats() {
  return useQuery({
    queryKey: crossRefKeys.stats,
    queryFn: async (): Promise<CrossRefStats> => {
      const supabase = createClient()

      const [totalRes, pendingRes, transitionsRes] = await Promise.all([
        supabase.from('listing_cross_refs').select('*', { count: 'exact', head: true }),
        supabase.from('listing_cross_refs').select('*', { count: 'exact', head: true }).eq('is_confirmed', false).gte('match_score', 60),
        supabase.from('intelligence_feed').select('*', { count: 'exact', head: true }).eq('tipo', 'ex_imobiliaria_fisbo'),
      ])

      // Count unique merged groups
      const { data: groups } = await supabase
        .from('scraped_listings')
        .select('merged_group_id')
        .not('merged_group_id', 'is', null)

      const uniqueGroups = new Set((groups ?? []).map((g) => g.merged_group_id)).size

      // AC3: Average time on market for active listings
      const { data: activeListings } = await supabase
        .from('scraped_listings')
        .select('first_seen_at')
        .eq('is_active', true)

      let avgTimeOnMarket: number | null = null
      if (activeListings && activeListings.length > 0) {
        const now = Date.now()
        const totalDays = activeListings.reduce((sum, l) =>
          sum + Math.floor((now - new Date(l.first_seen_at).getTime()) / 86400000), 0)
        avgTimeOnMarket = Math.round(totalDays / activeListings.length)
      }

      return {
        totalGroups: uniqueGroups,
        totalRefs: totalRes.count ?? 0,
        pendingReview: pendingRes.count ?? 0,
        transitions: transitionsRes.count ?? 0,
        avgTimeOnMarket,
      }
    },
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useTransitionAlerts — Story 3.6, AC2: ex-imobiliaria -> FISBO events
// ---------------------------------------------------------------------------

export interface TransitionAlert {
  id: string
  titulo: string
  descricao: string | null
  metadata: { listing_antigo_id?: string; listing_novo_id?: string; dias_entre?: number } | null
  created_at: string
}

export function useTransitionAlerts() {
  return useQuery({
    queryKey: crossRefKeys.transitions,
    queryFn: async (): Promise<TransitionAlert[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('intelligence_feed')
        .select('id, titulo, descricao, metadata, created_at')
        .eq('tipo', 'ex_imobiliaria_fisbo')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) return []
      return (data ?? []) as TransitionAlert[]
    },
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useMergedGroupPriceHistory — Story 3.6, AC4: price timeline for merged group
// ---------------------------------------------------------------------------

export interface PriceHistoryEntry {
  date: string
  portal: string
  preco: number
  isReduction: boolean
  reductionPct?: number
}

export function useMergedGroupPriceHistory(groupId: string | null) {
  return useQuery({
    queryKey: ['cross-refs', 'price-history', groupId],
    queryFn: async (): Promise<PriceHistoryEntry[]> => {
      if (!groupId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('scraped_listings')
        .select('portal, preco, preco_anterior, preco_changed_at, first_seen_at')
        .eq('merged_group_id', groupId)
        .order('first_seen_at', { ascending: true })

      if (error || !data) return []

      const entries: PriceHistoryEntry[] = []
      for (const l of data) {
        if (!l.preco) continue
        // Initial price at first_seen
        if (l.preco_anterior && l.preco_changed_at) {
          entries.push({
            date: l.first_seen_at,
            portal: l.portal,
            preco: l.preco_anterior,
            isReduction: false,
          })
          const pct = Math.round((1 - l.preco / l.preco_anterior) * 100)
          entries.push({
            date: l.preco_changed_at,
            portal: l.portal,
            preco: l.preco,
            isReduction: pct > 0,
            reductionPct: pct > 0 ? pct : undefined,
          })
        } else {
          entries.push({
            date: l.first_seen_at,
            portal: l.portal,
            preco: l.preco,
            isReduction: false,
          })
        }
      }

      return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    },
    enabled: !!groupId,
    staleTime: 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// useImportToAcm — Story 3.6, AC5: feed consolidated data to acm_comparaveis
// ---------------------------------------------------------------------------

export function useImportToAcm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groupId, acmId }: { groupId: string; acmId: string }) => {
      const supabase = createClient()

      // Get primary listing from merged group (most recent, active)
      const { data: listings } = await supabase
        .from('scraped_listings')
        .select('id, portal, endereco, preco, area_m2, quartos, first_seen_at')
        .eq('merged_group_id', groupId)
        .eq('is_active', true)
        .order('last_seen_at', { ascending: false })
        .limit(1)

      const primary = listings?.[0]
      if (!primary) throw new Error('No active listing in group')

      // Get group time on market
      const { data: oldest } = await supabase
        .from('scraped_listings')
        .select('first_seen_at')
        .eq('merged_group_id', groupId)
        .order('first_seen_at', { ascending: true })
        .limit(1)

      const firstSeen = oldest?.[0]?.first_seen_at
      const tempoMercado = firstSeen
        ? Math.floor((Date.now() - new Date(firstSeen).getTime()) / 86400000)
        : null

      // Upsert into acm_comparaveis
      const { error } = await supabase.from('acm_comparaveis').upsert({
        acm_id: acmId,
        scraped_listing_id: primary.id,
        endereco: primary.endereco,
        preco: primary.preco,
        area_m2: primary.area_m2,
        quartos: primary.quartos,
        fonte: 'scraping',
        metadata: {
          merged_group_id: groupId,
          portal: primary.portal,
          tempo_mercado_dias: tempoMercado,
          fonte_label: 'Scraping (consolidado)',
        },
      }, { onConflict: 'acm_id,scraped_listing_id' })

      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: crossRefKeys.stats })
    },
  })
}

// ---------------------------------------------------------------------------
// useConfirmCrossRef — confirm or reject a cross-ref suggestion
// ---------------------------------------------------------------------------

export function useConfirmCrossRef() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, confirm }: { id: string; confirm: boolean }) => {
      const supabase = createClient()

      if (confirm) {
        // Get the two listings
        const { data: ref } = await supabase
          .from('listing_cross_refs')
          .select('listing_a_id, listing_b_id')
          .eq('id', id)
          .single()

        if (ref) {
          // Assign merged group
          const groupId = crypto.randomUUID()
          await supabase
            .from('scraped_listings')
            .update({ merged_group_id: groupId })
            .in('id', [ref.listing_a_id, ref.listing_b_id])
        }

        await supabase
          .from('listing_cross_refs')
          .update({ is_confirmed: true, merged_at: new Date().toISOString() })
          .eq('id', id)
      } else {
        // Reject: delete the cross-ref
        await supabase.from('listing_cross_refs').delete().eq('id', id)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: crossRefKeys.pending })
      queryClient.invalidateQueries({ queryKey: crossRefKeys.stats })
    },
  })
}
