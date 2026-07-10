'use client'

/**
 * useOwnerLookupStats — Story 6.7 (AC7).
 *
 * Dashboard de consumo do consultor via fn_owner_lookup_stats (migration 024):
 * consultas/custo do mes + cache hits acumulados.
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OwnerLookupStats } from '@/lib/supabase/types'

export function useOwnerLookupStats(consultantId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['owner-lookup', 'stats', consultantId],
    enabled: Boolean(consultantId),
    queryFn: async (): Promise<OwnerLookupStats> => {
      const { data, error } = await supabase.rpc('fn_owner_lookup_stats', {
        p_consultant_id: consultantId,
      })
      if (error) throw new Error(error.message)
      return {
        consultas_mes: 0,
        custo_mes: 0,
        sucessos_mes: 0,
        nao_encontrados_mes: 0,
        falhas_mes: 0,
        consultas_total: 0,
        cache_hits_total: 0,
        ...((data ?? {}) as Partial<OwnerLookupStats>),
      }
    },
  })
}
