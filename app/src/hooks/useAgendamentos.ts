'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Agendamento,
  TipoAgendamento,
  StatusAgendamento,
} from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const agendamentoKeys = {
  all: ['agendamentos'] as const,
  byLead: (leadId: string) => ['agendamentos', 'lead', leadId] as const,
  byConsultant: (consultantId: string, dateRange?: { from: string; to: string }) =>
    dateRange
      ? ['agendamentos', 'consultant', consultantId, dateRange.from, dateRange.to] as const
      : ['agendamentos', 'consultant', consultantId] as const,
  upcoming: (consultantId: string) =>
    ['agendamentos', 'upcoming', consultantId] as const,
}

// ---------------------------------------------------------------------------
// useAgendamentosByLead — fetch appointments for a specific lead
// ---------------------------------------------------------------------------

export function useAgendamentosByLead(leadId: string | null) {
  const query = useQuery({
    queryKey: agendamentoKeys.byLead(leadId ?? ''),
    queryFn: async (): Promise<Agendamento[]> => {
      if (!leadId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('lead_id', leadId)
        .order('data_hora', { ascending: true })

      if (error) {
        console.error('Error fetching agendamentos by lead:', error)
        return []
      }

      return (data ?? []) as Agendamento[]
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
  })

  return {
    agendamentos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useAgendamentosByConsultant — fetch all appointments for a consultant
// ---------------------------------------------------------------------------

export function useAgendamentosByConsultant(
  consultantId: string | null,
  dateRange?: { from: string; to: string }
) {
  const query = useQuery({
    queryKey: agendamentoKeys.byConsultant(consultantId ?? '', dateRange),
    queryFn: async (): Promise<Agendamento[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      let q = supabase
        .from('agendamentos')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('data_hora', { ascending: true })

      if (dateRange) {
        q = q.gte('data_hora', dateRange.from).lte('data_hora', dateRange.to)
      }

      const { data, error } = await q

      if (error) {
        console.error('Error fetching agendamentos by consultant:', error)
        return []
      }

      return (data ?? []) as Agendamento[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    agendamentos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useUpcomingAgendamentos — next appointments (for widget)
// ---------------------------------------------------------------------------

export function useUpcomingAgendamentos(
  consultantId: string | null,
  limit: number = 3
) {
  const query = useQuery({
    queryKey: agendamentoKeys.upcoming(consultantId ?? ''),
    queryFn: async (): Promise<(Agendamento & { lead_nome?: string })[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, leads(nome)')
        .eq('consultant_id', consultantId)
        .gte('data_hora', now)
        .in('status', ['agendado', 'confirmado'])
        .order('data_hora', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error fetching upcoming agendamentos:', error)
        return []
      }

      // Flatten leads.nome into the result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any) => {
        const leadNome = row.leads?.nome ?? undefined
        const { leads: _leads, ...rest } = row
        return { ...rest, lead_nome: leadNome } as Agendamento & { lead_nome?: string }
      })
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    agendamentos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useCreateAgendamento — mutation with optimistic update
// ---------------------------------------------------------------------------

export interface CreateAgendamentoInput {
  lead_id: string
  consultant_id: string
  tipo: TipoAgendamento
  data_hora: string // ISO 8601
  opcao_alternativa?: string // ISO 8601, Técnica de Duas Opções
  notas?: string
}

export function useCreateAgendamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAgendamentoInput): Promise<Agendamento> => {
      const supabase = createClient()

      const insertData = {
        lead_id: input.lead_id,
        consultant_id: input.consultant_id,
        tipo: input.tipo,
        status: 'agendado' as const,
        data_hora: input.data_hora,
        opcao_alternativa: input.opcao_alternativa || null,
        notas: input.notas || null,
      }

      const { data, error } = await supabase
        .from('agendamentos')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create agendamento: ${error.message}`)
      }

      return data as Agendamento
    },

    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: agendamentoKeys.byLead(input.lead_id),
      })

      // Snapshot previous data
      const previousAgendamentos = queryClient.getQueryData<Agendamento[]>(
        agendamentoKeys.byLead(input.lead_id)
      )

      // Optimistic update — add temporary agendamento
      const optimistic: Agendamento = {
        id: `temp-${Date.now()}`,
        lead_id: input.lead_id,
        consultant_id: input.consultant_id,
        tipo: input.tipo,
        status: 'agendado',
        data_hora: input.data_hora,
        opcao_alternativa: input.opcao_alternativa || null,
        notas: input.notas || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Agendamento[]>(
        agendamentoKeys.byLead(input.lead_id),
        (old) => [...(old ?? []), optimistic].sort(
          (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
        ),
      )

      return { previousAgendamentos }
    },

    onError: (_error, input, context) => {
      if (context?.previousAgendamentos) {
        queryClient.setQueryData(
          agendamentoKeys.byLead(input.lead_id),
          context.previousAgendamentos,
        )
      }
    },

    onSettled: (_data, _error, input) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: agendamentoKeys.byLead(input.lead_id),
      })
      queryClient.invalidateQueries({
        queryKey: ['agendamentos', 'consultant'],
      })
      queryClient.invalidateQueries({
        queryKey: ['agendamentos', 'upcoming'],
      })
      // Invalidate funnel — scheduling may change lead stage
      queryClient.invalidateQueries({
        queryKey: ['leads', 'funnel'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateAgendamento — mutation (reschedule, cancel, mark done)
// ---------------------------------------------------------------------------

export interface UpdateAgendamentoInput {
  id: string
  lead_id: string // needed for cache invalidation
  updates: Partial<Pick<Agendamento, 'status' | 'data_hora' | 'opcao_alternativa' | 'notas'>>
}

export function useUpdateAgendamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateAgendamentoInput): Promise<Agendamento> => {
      const supabase = createClient()

      // If rescheduling, also reset status to 'reagendado'
      const updateData: Record<string, unknown> = { ...input.updates }
      if (input.updates.data_hora && !input.updates.status) {
        updateData.status = 'reagendado' as StatusAgendamento
      }

      const { data, error } = await supabase
        .from('agendamentos')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update agendamento: ${error.message}`)
      }

      return data as Agendamento
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: agendamentoKeys.byLead(input.lead_id),
      })
      queryClient.invalidateQueries({
        queryKey: ['agendamentos', 'consultant'],
      })
      queryClient.invalidateQueries({
        queryKey: ['agendamentos', 'upcoming'],
      })
      queryClient.invalidateQueries({
        queryKey: ['leads', 'funnel'],
      })
    },
  })
}
