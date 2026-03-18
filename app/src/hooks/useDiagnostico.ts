'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EtapaFunil, FunnelTransition, CategoriaScript } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const diagnosticoKeys = {
  all: ['diagnostico'] as const,
  funnel: (consultantId: string, period?: DiagnosticoPeriod) =>
    ['diagnostico', 'funnel', consultantId, period ?? 'all'] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiagnosticoPeriod =
  | 'ultima_semana'
  | 'ultimo_mes'
  | 'ultimos_3_meses'
  | 'custom'

export interface StageTransitionRate {
  from: EtapaFunil
  to: EtapaFunil
  label: string
  count: number
  total: number
  rate: number // 0-100
}

export interface RetrocessoStats {
  count: number
  total: number
  rate: number // 0-100
}

export interface StageDuration {
  etapa: EtapaFunil
  avgDays: number
}

export interface FunnelDiagnosticoData {
  transitionRates: StageTransitionRate[]
  retrocesso: RetrocessoStats
  stageDurations: StageDuration[]
  totalTransitions: number
}

export interface DiagnosticoItem {
  transition: string
  symptom: string
  diagnosis: string
  action: string
  scriptCategory: CategoriaScript
  rate: number
  severity: 'green' | 'yellow' | 'red'
}

// ---------------------------------------------------------------------------
// Constants: funnel stage flow
// ---------------------------------------------------------------------------

const FUNNEL_FLOW: { from: EtapaFunil; to: EtapaFunil; label: string }[] = [
  { from: 'contato', to: 'v1_agendada', label: 'Contato \u2192 V1' },
  { from: 'v1_agendada', to: 'v1_realizada', label: 'V1 Agendada \u2192 V1 Realizada' },
  { from: 'v1_realizada', to: 'v2_agendada', label: 'V1 \u2192 V2' },
  { from: 'v2_agendada', to: 'v2_realizada', label: 'V2 Agendada \u2192 V2 Realizada' },
  { from: 'v2_realizada', to: 'representacao', label: 'V2 \u2192 Exclusividade' },
  { from: 'representacao', to: 'venda', label: 'Exclusividade \u2192 Venda' },
]

// ---------------------------------------------------------------------------
// Helper: get date range from period
// ---------------------------------------------------------------------------

function getDateRange(period?: DiagnosticoPeriod, customRange?: { from: string; to: string }) {
  if (!period || period === 'custom') {
    if (customRange) return customRange
    return undefined // all time
  }

  const now = new Date()
  const to = now.toISOString()

  switch (period) {
    case 'ultima_semana': {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to }
    }
    case 'ultimo_mes': {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to }
    }
    case 'ultimos_3_meses': {
      const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { from: from.toISOString(), to }
    }
    default:
      return undefined
  }
}

// ---------------------------------------------------------------------------
// useFunnelDiagnostico — conversion rates, retrocesso, avg days per stage
// ---------------------------------------------------------------------------

export function useFunnelDiagnostico(
  consultantId: string | null,
  period?: DiagnosticoPeriod,
  customRange?: { from: string; to: string }
) {
  const query = useQuery({
    queryKey: diagnosticoKeys.funnel(consultantId ?? '', period),
    queryFn: async (): Promise<FunnelDiagnosticoData> => {
      if (!consultantId) {
        return {
          transitionRates: [],
          retrocesso: { count: 0, total: 0, rate: 0 },
          stageDurations: [],
          totalTransitions: 0,
        }
      }

      const supabase = createClient()
      const dateRange = getDateRange(period, customRange)

      let q = supabase
        .from('funnel_transitions')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: true })

      if (dateRange) {
        q = q.gte('created_at', dateRange.from).lte('created_at', dateRange.to)
      }

      const { data, error } = await q

      if (error) {
        console.error('Error fetching funnel transitions:', error)
        return {
          transitionRates: [],
          retrocesso: { count: 0, total: 0, rate: 0 },
          stageDurations: [],
          totalTransitions: 0,
        }
      }

      const transitions = (data ?? []) as FunnelTransition[]
      const totalTransitions = transitions.length

      // --- Conversion rates between stages ---
      // Count forward transitions from each stage
      const fromCounts: Record<string, number> = {}
      const forwardCounts: Record<string, number> = {}

      for (const t of transitions) {
        if (!t.from_etapa) continue
        const key = t.from_etapa
        fromCounts[key] = (fromCounts[key] || 0) + 1

        // Check if this transition matches our flow
        const flowMatch = FUNNEL_FLOW.find(
          (f) => f.from === t.from_etapa && f.to === t.to_etapa
        )
        if (flowMatch) {
          const fwdKey = `${flowMatch.from}_${flowMatch.to}`
          forwardCounts[fwdKey] = (forwardCounts[fwdKey] || 0) + 1
        }
      }

      const transitionRates: StageTransitionRate[] = FUNNEL_FLOW.map((flow) => {
        const total = fromCounts[flow.from] || 0
        const fwdKey = `${flow.from}_${flow.to}`
        const count = forwardCounts[fwdKey] || 0
        const rate = total > 0 ? Math.round((count / total) * 100) : 0

        return {
          from: flow.from,
          to: flow.to,
          label: flow.label,
          count,
          total,
          rate,
        }
      })

      // --- Retrocesso stats ---
      const retrocessoCount = transitions.filter((t) => t.is_retrocesso).length
      const retrocesso: RetrocessoStats = {
        count: retrocessoCount,
        total: totalTransitions,
        rate: totalTransitions > 0
          ? Math.round((retrocessoCount / totalTransitions) * 100)
          : 0,
      }

      // --- Average days per stage ---
      // Group transitions by lead, compute stage durations
      const leadTransitions: Record<string, FunnelTransition[]> = {}
      for (const t of transitions) {
        if (!leadTransitions[t.lead_id]) {
          leadTransitions[t.lead_id] = []
        }
        leadTransitions[t.lead_id].push(t)
      }

      const stageDays: Record<string, number[]> = {}

      for (const leadTxns of Object.values(leadTransitions)) {
        // Sort by created_at
        const sorted = [...leadTxns].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        for (let i = 0; i < sorted.length - 1; i++) {
          const current = sorted[i]
          const next = sorted[i + 1]
          const etapa = current.to_etapa
          const days =
            (new Date(next.created_at).getTime() - new Date(current.created_at).getTime()) /
            (1000 * 60 * 60 * 24)

          if (!stageDays[etapa]) stageDays[etapa] = []
          stageDays[etapa].push(days)
        }
      }

      const stageDurations: StageDuration[] = Object.entries(stageDays).map(
        ([etapa, days]) => ({
          etapa: etapa as EtapaFunil,
          avgDays: days.length > 0
            ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
            : 0,
        })
      )

      return { transitionRates, retrocesso, stageDurations, totalTransitions }
    },
    enabled: !!consultantId,
    staleTime: 60 * 1000, // 1 minute
  })

  return {
    diagnostico: query.data ?? {
      transitionRates: [],
      retrocesso: { count: 0, total: 0, rate: 0 },
      stageDurations: [],
      totalTransitions: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useDiagnosticoMatrix — applies RE/MAX diagnostic matrix to rates
// ---------------------------------------------------------------------------

const PROBLEM_THRESHOLD = 40 // <40% = problem

export function useDiagnosticoMatrix(
  transitionRates: StageTransitionRate[]
): DiagnosticoItem[] {
  return useMemo(() => {
    const items: DiagnosticoItem[] = []

    for (const rate of transitionRates) {
      const severity: 'green' | 'yellow' | 'red' =
        rate.rate >= 50 ? 'green' : rate.rate >= 30 ? 'yellow' : 'red'

      // Only generate diagnostic items for problematic transitions
      if (rate.rate >= PROBLEM_THRESHOLD && rate.total > 0) continue
      if (rate.total === 0) continue

      const mapping = getDiagnosticMapping(rate.from, rate.to)

      items.push({
        transition: rate.label,
        symptom: mapping.symptom,
        diagnosis: mapping.diagnosis,
        action: mapping.action,
        scriptCategory: mapping.scriptCategory,
        rate: rate.rate,
        severity,
      })
    }

    return items
  }, [transitionRates])
}

// ---------------------------------------------------------------------------
// Diagnostic mapping: stage pair -> symptom/diagnosis/script
// ---------------------------------------------------------------------------

interface DiagnosticMapping {
  symptom: string
  diagnosis: string
  action: string
  scriptCategory: CategoriaScript
}

function getDiagnosticMapping(from: EtapaFunil, to: EtapaFunil): DiagnosticMapping {
  // Contato -> V1: script failure
  if (from === 'contato' && to === 'v1_agendada') {
    return {
      symptom: 'Muitos contatos, poucas V1s agendadas',
      diagnosis: 'Falha no script de abordagem inicial',
      action: 'Revisar scripts de abordagem e t\u00e9cnicas de abertura',
      scriptCategory: 'abordagem_inicial',
    }
  }

  // V1 Agendada -> V1 Realizada: no-show
  if (from === 'v1_agendada' && to === 'v1_realizada') {
    return {
      symptom: 'Muitas V1s agendadas, poucas realizadas',
      diagnosis: 'Alto \u00edndice de no-show ou cancelamentos',
      action: 'Implementar confirma\u00e7\u00e3o 24h antes e follow-up',
      scriptCategory: 'follow_up',
    }
  }

  // V1 -> V2: rapport failure
  if (from === 'v1_realizada' && to === 'v2_agendada') {
    return {
      symptom: 'Muitas V1s realizadas, poucas V2s',
      diagnosis: 'Falha de rapport ou obje\u00e7\u00e3o de experi\u00eancia',
      action: 'Trabalhar obje\u00e7\u00f5es de experi\u00eancia e demonstrar valor',
      scriptCategory: 'objecao_experiencia',
    }
  }

  // V2 Agendada -> V2 Realizada: preparation failure
  if (from === 'v2_agendada' && to === 'v2_realizada') {
    return {
      symptom: 'V2s agendadas n\u00e3o se concretizam',
      diagnosis: 'Prepara\u00e7\u00e3o insuficiente ou desist\u00eancia',
      action: 'Usar checklist de prepara\u00e7\u00e3o V2 e confirmar agenda',
      scriptCategory: 'follow_up',
    }
  }

  // V2 -> Representacao: closing failure
  if (from === 'v2_realizada' && to === 'representacao') {
    return {
      symptom: 'Muitas V2s realizadas, poucas representa\u00e7\u00f5es',
      diagnosis: 'Falha de fechamento ou obje\u00e7\u00e3o de exclusividade',
      action: 'Revisar scripts de exclusividade e t\u00e9cnicas de fechamento',
      scriptCategory: 'objecao_exclusividade',
    }
  }

  // Representacao -> Venda: pipeline stall
  if (from === 'representacao' && to === 'venda') {
    return {
      symptom: 'Exclusividades que n\u00e3o convertem em vendas',
      diagnosis: 'Estagna\u00e7\u00e3o no pipeline ou pricing inadequado',
      action: 'Revisar pre\u00e7o com ACM e intensificar marketing',
      scriptCategory: 'objecao_preco',
    }
  }

  // Fallback
  return {
    symptom: `Baixa convers\u00e3o ${from} \u2192 ${to}`,
    diagnosis: 'An\u00e1lise detalhada necess\u00e1ria',
    action: 'Revisar processo e scripts relacionados',
    scriptCategory: 'abordagem_inicial',
  }
}
