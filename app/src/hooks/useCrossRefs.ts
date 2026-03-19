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

      return {
        totalGroups: uniqueGroups,
        totalRefs: totalRes.count ?? 0,
        pendingReview: pendingRes.count ?? 0,
        transitions: transitionsRes.count ?? 0,
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
