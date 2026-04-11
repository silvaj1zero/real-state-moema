'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { EtapaFunil, FunnelTransition } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Etapa order for retrocesso detection
// ---------------------------------------------------------------------------

const ETAPA_ORDER: Record<EtapaFunil, number> = {
  contato: 0,
  v1_agendada: 1,
  v1_realizada: 2,
  v2_agendada: 3,
  v2_realizada: 4,
  representacao: 5,
  venda: 6,
  perdido: -1,
}

export function isRetrocesso(from: EtapaFunil, to: EtapaFunil): boolean {
  return ETAPA_ORDER[to] < ETAPA_ORDER[from]
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const funnelKeys = {
  all: ['funnel'] as const,
  stats: (consultantId: string) => ['funnel', 'stats', consultantId] as const,
  transitions: (leadId: string) => ['funnel', 'transitions', leadId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FunnelStageStats {
  etapa: EtapaFunil
  count: number
}

export interface FunnelStats {
  stages: FunnelStageStats[]
  total: number
  conversionRates: Record<string, number>
}

export interface TransitionInput {
  lead_id: string
  consultant_id: string
  from_etapa: EtapaFunil
  to_etapa: EtapaFunil
  observacao: string
  justificativa?: string
}

// ---------------------------------------------------------------------------
// useFunnelStats — count per stage, conversion rates
// ---------------------------------------------------------------------------

export function useFunnelStats(consultantId: string | null) {
  const query = useQuery({
    queryKey: funnelKeys.stats(consultantId ?? ''),
    queryFn: async (): Promise<FunnelStats> => {
      if (!consultantId) {
        return { stages: [], total: 0, conversionRates: {} }
      }

      const supabase = createClient()

      // Count leads per funnel stage
      const { data, error } = await supabase
        .from('leads')
        .select('etapa_funil')
        .eq('consultant_id', consultantId)
        .not('etapa_funil', 'eq', 'perdido')

      if (error) {
        throw new Error(`Failed to fetch funnel stats: ${error.message}`)
      }

      // Aggregate counts
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const etapa = row.etapa_funil as string
        counts[etapa] = (counts[etapa] || 0) + 1
      }

      const activeEtapas: EtapaFunil[] = [
        'contato',
        'v1_agendada',
        'v1_realizada',
        'v2_agendada',
        'v2_realizada',
        'representacao',
        'venda',
      ]

      const stages: FunnelStageStats[] = activeEtapas.map((etapa) => ({
        etapa,
        count: counts[etapa] || 0,
      }))

      const total = stages.reduce((sum, s) => sum + s.count, 0)

      // Conversion rates: percentage of leads that moved past each stage
      const conversionRates: Record<string, number> = {}
      for (let i = 0; i < activeEtapas.length - 1; i++) {
        const currentCount = counts[activeEtapas[i]] || 0
        const nextCount = counts[activeEtapas[i + 1]] || 0
        if (currentCount + nextCount > 0) {
          conversionRates[activeEtapas[i]] =
            Math.round((nextCount / (currentCount + nextCount)) * 100)
        } else {
          conversionRates[activeEtapas[i]] = 0
        }
      }

      return { stages, total, conversionRates }
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    stats: query.data ?? { stages: [], total: 0, conversionRates: {} },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useTransitionLead — mutation: INSERT funnel_transitions + UPDATE leads
// ---------------------------------------------------------------------------

export function useTransitionLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TransitionInput): Promise<FunnelTransition> => {
      const retrocesso = isRetrocesso(input.from_etapa, input.to_etapa)

      // PV Guardrail: retrocesso MUST have justificativa
      if (retrocesso && (!input.justificativa || input.justificativa.trim().length < 10)) {
        throw new Error(
          'Retrocesso detectado — justificativa obrigatória (mínimo 10 caracteres).'
        )
      }

      const supabase = createClient()

      // 1. INSERT funnel_transitions
      const { data: transition, error: transitionError } = await supabase
        .from('funnel_transitions')
        .insert({
          lead_id: input.lead_id,
          consultant_id: input.consultant_id,
          from_etapa: input.from_etapa,
          to_etapa: input.to_etapa,
          is_retrocesso: retrocesso,
          justificativa: retrocesso ? input.justificativa! : null,
          observacao: input.observacao,
        })
        .select()
        .single()

      if (transitionError) {
        throw new Error(`Failed to create transition: ${transitionError.message}`)
      }

      // 2. UPDATE leads.etapa_funil
      const { error: updateError } = await supabase
        .from('leads')
        .update({ etapa_funil: input.to_etapa })
        .eq('id', input.lead_id)

      if (updateError) {
        throw new Error(`Failed to update lead stage: ${updateError.message}`)
      }

      // 3. Auto-create marketing plan when entering exclusividade (Story 4.8 AC1)
      if (input.to_etapa === 'representacao') {
        const { data: existingPlan } = await supabase
          .from('marketing_plans')
          .select('id')
          .eq('lead_id', input.lead_id)
          .maybeSingle()

        if (!existingPlan) {
          await supabase.from('marketing_plans').insert({
            lead_id: input.lead_id,
            consultant_id: input.consultant_id,
          })

          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { message: 'Plano de Marketing criado automaticamente!', type: 'success' },
            }),
          )
        }
      }

      return transition as FunnelTransition
    },

    onSettled: (_data, _error, input) => {
      // Invalidate funnel-related queries
      queryClient.invalidateQueries({ queryKey: funnelKeys.all })
      queryClient.invalidateQueries({ queryKey: ['leads', 'funnel'] })
      queryClient.invalidateQueries({
        queryKey: funnelKeys.transitions(input.lead_id),
      })
      // Invalidate marketing plan query (auto-created on exclusividade)
      queryClient.invalidateQueries({
        queryKey: ['marketing_plan', input.lead_id],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useLeadTransitions — fetch transition history for a lead
// ---------------------------------------------------------------------------

export function useLeadTransitions(leadId: string | null) {
  const query = useQuery({
    queryKey: funnelKeys.transitions(leadId ?? ''),
    queryFn: async (): Promise<FunnelTransition[]> => {
      if (!leadId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('funnel_transitions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching lead transitions:', error)
        return []
      }

      return (data ?? []) as FunnelTransition[]
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
  })

  return {
    transitions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
