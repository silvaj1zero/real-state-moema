'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MarketingPlan } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const marketingPlanKeys = {
  all: ['marketing_plan'] as const,
  byLead: (leadId: string) => ['marketing_plan', leadId] as const,
}

// ---------------------------------------------------------------------------
// Marketing plan items definition
// ---------------------------------------------------------------------------

export interface MarketingItem {
  key: string
  boolField: keyof MarketingPlan
  dateField: (keyof MarketingPlan) | null
  urlField: (keyof MarketingPlan) | null
  label: string
  section: 'portais' | 'redes' | 'producao' | 'presencial'
}

export const MARKETING_ITEMS: MarketingItem[] = [
  { key: 'zap', boolField: 'publicar_zap', dateField: 'publicar_zap_data', urlField: 'publicar_zap_url', label: 'ZAP Imóveis', section: 'portais' },
  { key: 'olx', boolField: 'publicar_olx', dateField: 'publicar_olx_data', urlField: 'publicar_olx_url', label: 'OLX', section: 'portais' },
  { key: 'vivareal', boolField: 'publicar_vivareal', dateField: 'publicar_vivareal_data', urlField: null, label: 'VivaReal', section: 'portais' },
  { key: 'instagram', boolField: 'postar_instagram', dateField: 'postar_instagram_data', urlField: null, label: 'Instagram', section: 'redes' },
  { key: 'facebook', boolField: 'postar_facebook', dateField: 'postar_facebook_data', urlField: null, label: 'Facebook', section: 'redes' },
  { key: 'fotos', boolField: 'fotos_profissionais', dateField: 'fotos_profissionais_data', urlField: null, label: 'Fotos profissionais', section: 'producao' },
  { key: 'tour', boolField: 'tour_virtual', dateField: null, urlField: 'tour_virtual_url', label: 'Tour virtual', section: 'producao' },
  { key: 'placa', boolField: 'placa_fisica', dateField: null, urlField: null, label: 'Placa física', section: 'presencial' },
  { key: 'safari', boolField: 'safari_planejado', dateField: null, urlField: null, label: 'Safari/Open House', section: 'presencial' },
]

export const SECTION_LABELS: Record<string, string> = {
  portais: 'Portais',
  redes: 'Redes Sociais',
  producao: 'Produção',
  presencial: 'Presencial',
}

// ---------------------------------------------------------------------------
// useMarketingPlan — fetch plan for a lead
// ---------------------------------------------------------------------------

export function useMarketingPlan(leadId: string | null) {
  const query = useQuery({
    queryKey: marketingPlanKeys.byLead(leadId ?? ''),
    queryFn: async (): Promise<MarketingPlan | null> => {
      if (!leadId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('marketing_plans')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching marketing plan:', error)
        return null
      }

      return data as MarketingPlan | null
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
  })

  return {
    plan: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useCreateMarketingPlan — auto-create on exclusividade
// ---------------------------------------------------------------------------

export function useCreateMarketingPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { lead_id: string; consultant_id: string }): Promise<MarketingPlan> => {
      const supabase = createClient()

      // Check if plan already exists
      const { data: existing } = await supabase
        .from('marketing_plans')
        .select('id')
        .eq('lead_id', input.lead_id)
        .maybeSingle()

      if (existing) {
        // Return existing plan
        const { data } = await supabase
          .from('marketing_plans')
          .select('*')
          .eq('id', existing.id)
          .single()
        return data as MarketingPlan
      }

      const { data, error } = await supabase
        .from('marketing_plans')
        .insert({
          lead_id: input.lead_id,
          consultant_id: input.consultant_id,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create marketing plan: ${error.message}`)
      return data as MarketingPlan
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: marketingPlanKeys.byLead(input.lead_id),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateMarketingPlan — update individual fields
// ---------------------------------------------------------------------------

export function useUpdateMarketingPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      lead_id: string
      updates: Partial<MarketingPlan>
    }): Promise<MarketingPlan> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('marketing_plans')
        .update(input.updates)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update marketing plan: ${error.message}`)
      return data as MarketingPlan
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: marketingPlanKeys.byLead(input.lead_id),
      })

      const previous = queryClient.getQueryData<MarketingPlan>(
        marketingPlanKeys.byLead(input.lead_id),
      )

      if (previous) {
        queryClient.setQueryData<MarketingPlan>(
          marketingPlanKeys.byLead(input.lead_id),
          { ...previous, ...input.updates },
        )
      }

      return { previous }
    },

    onError: (_error, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          marketingPlanKeys.byLead(input.lead_id),
          context.previous,
        )
      }
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: marketingPlanKeys.byLead(input.lead_id),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Progress calculation
// ---------------------------------------------------------------------------

export function calculateProgress(plan: MarketingPlan): {
  completed: number
  total: number
  percent: number
  bySection: Record<string, { completed: number; total: number }>
} {
  const bySection: Record<string, { completed: number; total: number }> = {
    portais: { completed: 0, total: 0 },
    redes: { completed: 0, total: 0 },
    producao: { completed: 0, total: 0 },
    presencial: { completed: 0, total: 0 },
  }

  let completed = 0
  const total = MARKETING_ITEMS.length

  for (const item of MARKETING_ITEMS) {
    bySection[item.section].total++
    if (plan[item.boolField] as boolean) {
      completed++
      bySection[item.section].completed++
    }
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return { completed, total, percent, bySection }
}
