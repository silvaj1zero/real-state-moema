'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useComissoes } from './useComissoes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClubeThreshold {
  clube: string
  vgv_minimo_anual: number
  descricao: string | null
}

export const CLUBE_ORDER = [
  'sem_clube',
  'executive',
  'cem_porcento',
  'platinum',
  'chairmans',
  'titan',
  'diamond',
  'pinnacle',
] as const

export const CLUBE_LABELS: Record<string, string> = {
  sem_clube: 'Sem Clube',
  executive: 'Executive',
  cem_porcento: '100%',
  platinum: 'Platinum',
  chairmans: "Chairman's",
  titan: 'Titan',
  diamond: 'Diamond',
  pinnacle: 'Pinnacle',
}

export const CLUBE_COLORS: Record<string, string> = {
  sem_clube: '#9E9E9E',
  executive: '#003DA5',
  cem_porcento: '#1565C0',
  platinum: '#757575',
  chairmans: '#D97706',
  titan: '#7C3AED',
  diamond: '#0891B2',
  pinnacle: '#FFD700',
}

// ---------------------------------------------------------------------------
// useClubeThresholds
// ---------------------------------------------------------------------------

export function useClubeThresholds() {
  return useQuery({
    queryKey: ['clubes_thresholds'],
    queryFn: async (): Promise<ClubeThreshold[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clubes_remax_thresholds')
        .select('*')
        .order('vgv_minimo_anual', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch clube thresholds: ${error.message}`)
      }
      return (data ?? []) as ClubeThreshold[]
    },
    staleTime: Infinity, // Static data
  })
}

// ---------------------------------------------------------------------------
// Club determination (pure functions)
// ---------------------------------------------------------------------------

export function determineClube(vgv: number, thresholds: ClubeThreshold[]): string {
  let current = 'sem_clube'
  for (const t of thresholds) {
    if (vgv >= t.vgv_minimo_anual) current = t.clube
    else break
  }
  return current
}

export function getNextClube(current: string, thresholds: ClubeThreshold[]): ClubeThreshold | null {
  const idx = CLUBE_ORDER.indexOf(current as (typeof CLUBE_ORDER)[number])
  if (idx < 0) return thresholds[0] ?? null
  // Find next threshold after current
  for (const t of thresholds) {
    if (CLUBE_ORDER.indexOf(t.clube as (typeof CLUBE_ORDER)[number]) > idx) return t
  }
  return null
}

export function calculateProgress(vgv: number, current: string, thresholds: ClubeThreshold[]): number {
  const currentThreshold = thresholds.find((t) => t.clube === current)
  const next = getNextClube(current, thresholds)
  if (!next) return 100

  const base = currentThreshold?.vgv_minimo_anual ?? 0
  const range = next.vgv_minimo_anual - base
  if (range <= 0) return 100

  return Math.min(Math.round(((vgv - base) / range) * 100), 100)
}

export function projectMonths(vgv: number, next: ClubeThreshold | null, avgMonthly3: number): number | null {
  if (!next || avgMonthly3 <= 0) return null
  const remaining = next.vgv_minimo_anual - vgv
  if (remaining <= 0) return 0
  return Math.ceil(remaining / avgMonthly3)
}

// ---------------------------------------------------------------------------
// useVgvMonthly — monthly VGV from comissoes
// ---------------------------------------------------------------------------

export function useVgvMonthly(consultantId: string | null) {
  const { comissoes, isLoading } = useComissoes(consultantId)

  const vgvAcumulado = comissoes
    .filter((c) => ['recebido', 'pago_informante', 'pago_parceiro', 'completo'].includes(c.status_pagamento))
    .reduce((sum, c) => sum + c.valor_bruto, 0)

  // Monthly breakdown (last 12 months)
  const now = new Date()
  const monthly: { month: string; valor: number; cumulative: number }[] = []
  let cumulative = 0

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.getMonth()
    const y = d.getFullYear()
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    const valor = comissoes
      .filter((c) => {
        if (!c.data_recebimento) return false
        const cd = new Date(c.data_recebimento)
        return cd.getMonth() === m && cd.getFullYear() === y
      })
      .reduce((sum, c) => sum + c.valor_bruto, 0)
    cumulative += valor
    monthly.push({ month: label, valor, cumulative })
  }

  // Average of last 3 months
  const last3 = monthly.slice(-3)
  const avg3 = last3.reduce((sum, m) => sum + m.valor, 0) / 3

  return { vgvAcumulado, monthly, avg3Months: avg3, isLoading }
}

// ---------------------------------------------------------------------------
// useUpdateMeta — save meta_vgv_anual
// ---------------------------------------------------------------------------

export function useUpdateMeta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { consultantId: string; meta: number }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('consultant_settings')
        .update({ meta_vgv_anual: input.meta })
        .eq('consultant_id', input.consultantId)

      if (error) throw new Error(`Failed to update meta: ${error.message}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant_settings'] })
    },
  })
}
