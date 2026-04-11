'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Referral, StatusReferral, DirecaoReferral } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const referralKeys = {
  all: ['referrals'] as const,
  byConsultant: (consultantId: string) => ['referrals', consultantId] as const,
  metrics: (consultantId: string) => ['referrals', 'metrics', consultantId] as const,
  partners: (consultantId: string) => ['referrals', 'partners', consultantId] as const,
}

// ---------------------------------------------------------------------------
// Partner type (aggregated from referrals)
// ---------------------------------------------------------------------------

export interface Partner {
  parceiro_nome: string
  parceiro_franquia: string | null
  parceiro_email: string | null
  parceiro_regiao: string | null
  parceiro_telefone: string | null
  enviados: number
  recebidos: number
}

export interface ReciprocityMetrics {
  totalEnviados: number
  totalRecebidos: number
  totalConvertidos: number
  taxaConversao: number
}

// ---------------------------------------------------------------------------
// useReferrals — all referrals for a consultant
// ---------------------------------------------------------------------------

export function useReferrals(consultantId: string | null) {
  const query = useQuery({
    queryKey: referralKeys.byConsultant(consultantId ?? ''),
    queryFn: async (): Promise<Referral[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch referrals: ${error.message}`)
      }

      return (data ?? []) as Referral[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    referrals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// usePartners — aggregated partner list from referrals
// ---------------------------------------------------------------------------

export function usePartners(consultantId: string | null) {
  const { referrals, isLoading, error } = useReferrals(consultantId)

  const partners: Partner[] = []
  const partnerMap = new Map<string, Partner>()

  for (const r of referrals) {
    const key = `${r.parceiro_nome}||${r.parceiro_franquia ?? ''}`
    let p = partnerMap.get(key)
    if (!p) {
      p = {
        parceiro_nome: r.parceiro_nome,
        parceiro_franquia: r.parceiro_franquia,
        parceiro_email: r.parceiro_email,
        parceiro_regiao: r.parceiro_regiao,
        parceiro_telefone: r.parceiro_telefone,
        enviados: 0,
        recebidos: 0,
      }
      partnerMap.set(key, p)
    }
    // Update latest contact info
    if (r.parceiro_email) p.parceiro_email = r.parceiro_email
    if (r.parceiro_regiao) p.parceiro_regiao = r.parceiro_regiao
    if (r.parceiro_telefone) p.parceiro_telefone = r.parceiro_telefone

    if (r.direcao === 'enviado') p.enviados++
    else p.recebidos++
  }

  partnerMap.forEach((p) => partners.push(p))
  partners.sort((a, b) => (b.enviados + b.recebidos) - (a.enviados + a.recebidos))

  return { partners, isLoading, error }
}

// ---------------------------------------------------------------------------
// useReciprocityMetrics — overall metrics
// ---------------------------------------------------------------------------

export function useReciprocityMetrics(consultantId: string | null) {
  const { referrals, isLoading } = useReferrals(consultantId)

  const active = referrals.filter((r) => r.status !== 'expirada' && r.status !== 'recusada')

  const totalEnviados = active.filter((r) => r.direcao === 'enviado').length
  const totalRecebidos = active.filter((r) => r.direcao === 'recebido').length
  const totalConvertidos = active.filter((r) => r.status === 'convertida' || r.status === 'comissao_paga').length
  const total = totalEnviados + totalRecebidos
  const taxaConversao = total > 0 ? Math.round((totalConvertidos / total) * 100) : 0

  return {
    metrics: { totalEnviados, totalRecebidos, totalConvertidos, taxaConversao } as ReciprocityMetrics,
    isLoading,
  }
}

// ---------------------------------------------------------------------------
// useCreateReferral — mutation
// ---------------------------------------------------------------------------

export interface CreateReferralInput {
  consultant_id: string
  direcao: DirecaoReferral
  parceiro_nome: string
  parceiro_franquia?: string
  parceiro_telefone?: string // stored encrypted
  parceiro_email?: string
  parceiro_regiao?: string
  cliente_perfil?: string
  tipologia_desejada?: string
  faixa_preco_min?: number
  faixa_preco_max?: number
  regiao_desejada?: string
  prazo_validade?: string
  notas?: string
}

export function useCreateReferral() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateReferralInput): Promise<Referral> => {
      const supabase = createClient()

      const insertData = {
        consultant_id: input.consultant_id,
        direcao: input.direcao,
        parceiro_nome: input.parceiro_nome,
        parceiro_franquia: input.parceiro_franquia || null,
        parceiro_telefone: input.parceiro_telefone || null,
        parceiro_email: input.parceiro_email || null,
        parceiro_regiao: input.parceiro_regiao || null,
        cliente_perfil: input.cliente_perfil || null,
        tipologia_desejada: input.tipologia_desejada || null,
        faixa_preco_min: input.faixa_preco_min || null,
        faixa_preco_max: input.faixa_preco_max || null,
        regiao_desejada: input.regiao_desejada || null,
        prazo_validade: input.prazo_validade || null,
        status: 'enviada' as const,
        notas: input.notas || null,
      }

      const { data, error } = await supabase
        .from('referrals')
        .insert(insertData)
        .select()
        .single()

      if (error) throw new Error(`Failed to create referral: ${error.message}`)
      return data as Referral
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: referralKeys.byConsultant(input.consultant_id),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateReferralStatus — status transition mutation
// ---------------------------------------------------------------------------

export interface UpdateReferralStatusInput {
  id: string
  consultant_id: string
  status: StatusReferral
}

export function useUpdateReferralStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateReferralStatusInput): Promise<Referral> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('referrals')
        .update({ status: input.status })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update referral status: ${error.message}`)
      return data as Referral
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: referralKeys.byConsultant(input.consultant_id),
      })
      queryClient.invalidateQueries({
        queryKey: ['leads'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useLinkReferralToLead — after creating lead from referral
// ---------------------------------------------------------------------------

export function useLinkReferralToLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { referralId: string; leadId: string; consultantId: string }) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('referrals')
        .update({ lead_id: input.leadId, status: 'aceita' as const })
        .eq('id', input.referralId)

      if (error) throw new Error(`Failed to link referral to lead: ${error.message}`)
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: referralKeys.byConsultant(input.consultantId),
      })
      queryClient.invalidateQueries({
        queryKey: ['leads'],
      })
    },
  })
}
