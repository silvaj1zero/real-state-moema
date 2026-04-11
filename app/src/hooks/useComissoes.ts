'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Comissao, StatusPagamento, TipoSplit } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const comissaoKeys = {
  all: ['comissoes'] as const,
  byConsultant: (consultantId: string) => ['comissoes', consultantId] as const,
  dashboard: (consultantId: string) => ['comissoes', 'dashboard', consultantId] as const,
}

// ---------------------------------------------------------------------------
// Split calculation (pure functions)
// ---------------------------------------------------------------------------

export interface SplitInput {
  valorImovel: number
  percentualComissao: number
  percentualConsultora: number // default 50
  percentualFranquia: number // default 50
  hasInformante: boolean
  percentualInformante: number // default 5
  hasReferral: boolean
  percentualReferral: number // default 0
  clausulaRelacionamento: boolean
  percentualClausula: number // default 3
}

export interface SplitResult {
  valorBruto: number
  clausulaValor: number
  splitConsultora: number
  splitFranquia: number
  splitInformante: number
  splitReferral: number
}

export function calculateSplits(input: SplitInput): SplitResult {
  const valorBruto = (input.valorImovel * input.percentualComissao) / 100

  // Clausula deducted first
  const clausulaValor = input.clausulaRelacionamento
    ? (valorBruto * input.percentualClausula) / 100
    : 0

  const base = valorBruto - clausulaValor

  const splitConsultora = (base * input.percentualConsultora) / 100
  const splitFranquia = (base * input.percentualFranquia) / 100

  const splitInformante = input.hasInformante
    ? (valorBruto * input.percentualInformante) / 100
    : 0

  const splitReferral = input.hasReferral
    ? (valorBruto * input.percentualReferral) / 100
    : 0

  return {
    valorBruto,
    clausulaValor,
    splitConsultora,
    splitFranquia,
    splitInformante,
    splitReferral,
  }
}

// ---------------------------------------------------------------------------
// useComissoes — all commissions for a consultant
// ---------------------------------------------------------------------------

export function useComissoes(consultantId: string | null) {
  const query = useQuery({
    queryKey: comissaoKeys.byConsultant(consultantId ?? ''),
    queryFn: async (): Promise<Comissao[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('comissoes')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch comissoes: ${error.message}`)
      }

      return (data ?? []) as Comissao[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    comissoes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useDashboardStats — aggregated stats for dashboard
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalBruto: number
  totalLiquidoConsultora: number
  pendentesCount: number
  recebidasMes: number
  monthlyData: { month: string; valor: number }[]
}

export function useDashboardStats(consultantId: string | null) {
  const { comissoes, isLoading } = useComissoes(consultantId)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const totalBruto = comissoes.reduce((sum, c) => sum + c.valor_bruto, 0)
  const totalLiquidoConsultora = comissoes.reduce((sum, c) => sum + (c.split_consultora ?? 0), 0)
  const pendentesCount = comissoes.filter((c) => c.status_pagamento === 'pendente').length
  const recebidasMes = comissoes
    .filter((c) => {
      if (!c.data_recebimento) return false
      const d = new Date(c.data_recebimento)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    .reduce((sum, c) => sum + c.valor_bruto, 0)

  // Monthly data (last 6 months)
  const monthlyData: { month: string; valor: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1)
    const m = d.getMonth()
    const y = d.getFullYear()
    const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' })
    const valor = comissoes
      .filter((c) => {
        const cd = new Date(c.created_at)
        return cd.getMonth() === m && cd.getFullYear() === y
      })
      .reduce((sum, c) => sum + c.valor_bruto, 0)
    monthlyData.push({ month: monthLabel, valor })
  }

  return {
    stats: { totalBruto, totalLiquidoConsultora, pendentesCount, recebidasMes, monthlyData } as DashboardStats,
    isLoading,
  }
}

// ---------------------------------------------------------------------------
// useCreateComissao — mutation
// ---------------------------------------------------------------------------

export interface CreateComissaoInput {
  consultant_id: string
  lead_id: string | null
  valor_imovel: number
  percentual_comissao: number
  valor_bruto: number
  split_consultora: number
  split_franquia: number
  split_informante: number | null
  split_referral: number | null
  tipo_split: TipoSplit
  percentual_clausula: number
  informante_id: string | null
  referral_id: string | null
  notas?: string
}

export function useCreateComissao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateComissaoInput): Promise<Comissao> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('comissoes')
        .insert({
          ...input,
          status_pagamento: 'pendente' as const,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create comissao: ${error.message}`)
      return data as Comissao
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.byConsultant(input.consultant_id),
      })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateComissaoStatus — status transition
// ---------------------------------------------------------------------------

export function useUpdateComissaoStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      consultant_id: string
      status: StatusPagamento
    }): Promise<Comissao> => {
      const supabase = createClient()

      const updates: Record<string, unknown> = { status_pagamento: input.status }

      if (input.status === 'recebido') updates.data_recebimento = new Date().toISOString().split('T')[0]
      if (input.status === 'pago_informante') updates.data_pagamento_informante = new Date().toISOString().split('T')[0]
      if (input.status === 'pago_parceiro') updates.data_pagamento_referral = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('comissoes')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update comissao status: ${error.message}`)
      return data as Comissao
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.byConsultant(input.consultant_id),
      })
    },
  })
}
