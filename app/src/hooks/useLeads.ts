'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadWithEdificio, OrigemLead, FonteFrog, PrazoUrgencia } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const leadKeys = {
  all: ['leads'] as const,
  byEdificio: (edificioId: string) => ['leads', 'edificio', edificioId] as const,
  byFunnel: (consultantId: string, etapa?: string) =>
    etapa
      ? ['leads', 'funnel', consultantId, etapa] as const
      : ['leads', 'funnel', consultantId] as const,
}

// ---------------------------------------------------------------------------
// useLeadsByEdificio — fetch leads for a building
// ---------------------------------------------------------------------------

export function useLeadsByEdificio(edificioId: string | null) {
  const query = useQuery({
    queryKey: leadKeys.byEdificio(edificioId ?? ''),
    queryFn: async (): Promise<Lead[]> => {
      if (!edificioId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('edificio_id', edificioId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching leads by edificio:', error)
        return []
      }

      return (data ?? []) as Lead[]
    },
    enabled: !!edificioId,
    staleTime: 30 * 1000,
  })

  return {
    leads: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useLeadsByFunnel — fetch leads by funnel stage for a consultant
// ---------------------------------------------------------------------------

export function useLeadsByFunnel(consultantId: string | null, etapa?: string) {
  const query = useQuery({
    queryKey: leadKeys.byFunnel(consultantId ?? '', etapa),
    queryFn: async (): Promise<LeadWithEdificio[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      let q = supabase
        .from('leads')
        .select('*, edificios(id, nome, endereco)')
        .eq('consultant_id', consultantId)
        .order('etapa_changed_at', { ascending: false })

      if (etapa) {
        q = q.eq('etapa_funil', etapa)
      }

      const { data, error } = await q

      if (error) {
        console.error('Error fetching leads by funnel:', error)
        return []
      }

      return (data ?? []) as LeadWithEdificio[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    leads: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useCreateLead — mutation to create lead with optimistic update
// ---------------------------------------------------------------------------

export interface CreateLeadInput {
  consultant_id: string
  edificio_id: string
  nome: string
  unidade?: string
  telefone?: string
  email?: string
  origem: OrigemLead
  fonte_frog?: FonteFrog
  informante_id?: string
  motivacao_venda?: string
  prazo_urgencia?: PrazoUrgencia
  fotos_v1?: string[]
  perfil_psicografico?: Lead['perfil_psicografico']
  valoriza?: Lead['valoriza']
  notas?: string
  is_fisbo?: boolean
}

export function useCreateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLeadInput): Promise<Lead> => {
      const supabase = createClient()

      const insertData = {
        consultant_id: input.consultant_id,
        edificio_id: input.edificio_id,
        nome: input.nome,
        unidade: input.unidade || null,
        telefone: input.telefone || null,
        email: input.email || null,
        origem: input.origem,
        fonte_frog: input.fonte_frog || null,
        informante_id: input.informante_id || null,
        etapa_funil: 'contato' as const,
        motivacao_venda: input.motivacao_venda || null,
        prazo_urgencia: input.prazo_urgencia || null,
        fotos_v1: input.fotos_v1 || null,
        perfil_psicografico: input.perfil_psicografico || null,
        valoriza: input.valoriza || null,
        notas: input.notas || null,
        is_fisbo: input.is_fisbo ?? false,
      }

      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create lead: ${error.message}`)
      }

      return data as Lead
    },

    onMutate: async (input) => {
      // Cancel outgoing refetches for this building
      await queryClient.cancelQueries({
        queryKey: leadKeys.byEdificio(input.edificio_id),
      })

      // Snapshot previous data
      const previousLeads = queryClient.getQueryData<Lead[]>(
        leadKeys.byEdificio(input.edificio_id)
      )

      // Optimistic update — add temporary lead to cache
      const optimisticLead: Lead = {
        id: `temp-${Date.now()}`,
        consultant_id: input.consultant_id,
        edificio_id: input.edificio_id,
        informante_id: input.informante_id || null,
        nome: input.nome,
        unidade: input.unidade || null,
        telefone: input.telefone || null,
        email: input.email || null,
        origem: input.origem,
        fonte_frog: input.fonte_frog || null,
        etapa_funil: 'contato',
        etapa_changed_at: new Date().toISOString(),
        motivacao_venda: input.motivacao_venda || null,
        prazo_urgencia: input.prazo_urgencia || null,
        fotos_v1: input.fotos_v1 || null,
        perfil_psicografico: input.perfil_psicografico || null,
        valoriza: input.valoriza || null,
        notas: input.notas || null,
        is_fisbo: input.is_fisbo ?? false,
        referral_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Lead[]>(
        leadKeys.byEdificio(input.edificio_id),
        (old) => [optimisticLead, ...(old ?? [])],
      )

      return { previousLeads }
    },

    onError: (_error, input, context) => {
      // Rollback optimistic update on error
      if (context?.previousLeads) {
        queryClient.setQueryData(
          leadKeys.byEdificio(input.edificio_id),
          context.previousLeads,
        )
      }
    },

    onSettled: (_data, _error, input) => {
      // Invalidate affected queries to refetch from server
      queryClient.invalidateQueries({
        queryKey: leadKeys.byEdificio(input.edificio_id),
      })
      queryClient.invalidateQueries({
        queryKey: ['leads', 'funnel'],
      })
      // Also invalidate buildings to update lead counts
      queryClient.invalidateQueries({
        queryKey: ['buildings'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateLead — mutation to update lead
// ---------------------------------------------------------------------------

export interface UpdateLeadInput {
  id: string
  edificio_id?: string
  updates: Partial<
    Pick<
      Lead,
      | 'nome'
      | 'unidade'
      | 'origem'
      | 'fonte_frog'
      | 'etapa_funil'
      | 'motivacao_venda'
      | 'prazo_urgencia'
      | 'fotos_v1'
      | 'perfil_psicografico'
      | 'valoriza'
      | 'notas'
      | 'is_fisbo'
      | 'informante_id'
    >
  > & {
    telefone?: string
    email?: string
  }
}

export function useUpdateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateLeadInput): Promise<Lead> => {
      const supabase = createClient()

      const updateData: Record<string, unknown> = { ...input.updates }
      if (input.updates.telefone !== undefined) {
        updateData.telefone = input.updates.telefone || null
      }
      if (input.updates.email !== undefined) {
        updateData.email = input.updates.email || null
      }

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update lead: ${error.message}`)
      }

      return data as Lead
    },

    onSettled: (_data, _error, input) => {
      // Invalidate all lead queries — the lead could appear in multiple views
      if (input.edificio_id) {
        queryClient.invalidateQueries({
          queryKey: leadKeys.byEdificio(input.edificio_id),
        })
      }
      queryClient.invalidateQueries({
        queryKey: ['leads', 'funnel'],
      })
    },
  })
}
