'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Informante, AcaoGentileza } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const informanteKeys = {
  all: (consultantId: string) => ['informantes', consultantId] as const,
  byEdificio: (edificioId: string) =>
    ['informantes', 'edificio', edificioId] as const,
  detail: (id: string) => ['informantes', 'detail', id] as const,
}

export const gentilezaKeys = {
  byInformante: (informanteId: string) =>
    ['acoes_gentileza', informanteId] as const,
}

// ---------------------------------------------------------------------------
// Extended type: Informante with linked edificios
// ---------------------------------------------------------------------------

export interface InformanteWithEdificios extends Informante {
  informantes_edificios: Array<{
    edificio_id: string
    edificios: { id: string; nome: string; endereco: string }
  }>
}

// ---------------------------------------------------------------------------
// useInformantesByConsultant — fetch all informantes with their edificios
// ---------------------------------------------------------------------------

export function useInformantesByConsultant(consultantId: string | null) {
  const query = useQuery({
    queryKey: informanteKeys.all(consultantId ?? ''),
    queryFn: async (): Promise<InformanteWithEdificios[]> => {
      if (!consultantId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('informantes')
        .select(`
          *,
          informantes_edificios(
            edificio_id,
            edificios(id, nome, endereco)
          )
        `)
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch informantes: ${error.message}`)
      }

      return (data ?? []) as InformanteWithEdificios[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return {
    informantes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useInformantesByEdificio — fetch informantes linked to a building
// ---------------------------------------------------------------------------

export function useInformantesByEdificio(edificioId: string | null) {
  const query = useQuery({
    queryKey: informanteKeys.byEdificio(edificioId ?? ''),
    queryFn: async (): Promise<InformanteWithEdificios[]> => {
      if (!edificioId) return []

      const supabase = createClient()
      // Query via junction table: informantes_edificios -> informantes
      const { data, error } = await supabase
        .from('informantes_edificios')
        .select(`
          informantes(
            *,
            informantes_edificios(
              edificio_id,
              edificios(id, nome, endereco)
            )
          )
        `)
        .eq('edificio_id', edificioId)

      if (error) {
        throw new Error(`Failed to fetch informantes by edificio: ${error.message}`)
      }

      // Flatten: each row has { informantes: {...} }
      const informantes = (data ?? [])
        .map((row: Record<string, unknown>) => row.informantes)
        .filter(Boolean) as InformanteWithEdificios[]

      return informantes
    },
    enabled: !!edificioId,
    staleTime: 30 * 1000,
  })

  return {
    informantes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// ---------------------------------------------------------------------------
// useCreateInformante — mutation with optimistic update
// ---------------------------------------------------------------------------

export interface CreateInformanteInput {
  consultant_id: string
  nome: string
  funcao: Informante['funcao']
  telefone?: string
  qualidade_relacao: Informante['qualidade_relacao']
  notas?: string
  edificio_ids: string[] // N:M — link to 1+ buildings via informantes_edificios
}

export function useCreateInformante() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateInformanteInput): Promise<Informante> => {
      const supabase = createClient()

      // 1) Insert the informante
      const { data: informante, error: informanteError } = await supabase
        .from('informantes')
        .insert({
          consultant_id: input.consultant_id,
          nome: input.nome,
          funcao: input.funcao,
          telefone: input.telefone || null,
          qualidade_relacao: input.qualidade_relacao,
          notas: input.notas || null,
          total_investido_gentileza: 0,
          comissao_devida: 0,
          comissao_paga: 0,
        })
        .select()
        .single()

      if (informanteError) {
        throw new Error(`Failed to create informante: ${informanteError.message}`)
      }

      // 2) Insert junction rows for edificios
      if (input.edificio_ids.length > 0) {
        const junctionRows = input.edificio_ids.map((edificio_id) => ({
          informante_id: informante.id,
          edificio_id,
        }))

        const { error: junctionError } = await supabase
          .from('informantes_edificios')
          .insert(junctionRows)

        if (junctionError) {
          console.error('Error linking informante to edificios:', junctionError)
          // Non-fatal: informante was created, just linking failed
        }
      }

      return informante as Informante
    },

    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: informanteKeys.all(input.consultant_id),
      })

      // Snapshot previous data
      const previousInformantes = queryClient.getQueryData<Informante[]>(
        informanteKeys.all(input.consultant_id),
      )

      // Optimistic update
      const optimisticInformante: Informante = {
        id: `temp-${Date.now()}`,
        consultant_id: input.consultant_id,
        nome: input.nome,
        funcao: input.funcao,
        telefone: input.telefone || null,
        qualidade_relacao: input.qualidade_relacao,
        notas: input.notas || null,
        total_investido_gentileza: 0,
        comissao_devida: 0,
        comissao_paga: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Informante[]>(
        informanteKeys.all(input.consultant_id),
        (old) => [optimisticInformante, ...(old ?? [])],
      )

      return { previousInformantes }
    },

    onError: (_error, input, context) => {
      if (context?.previousInformantes) {
        queryClient.setQueryData(
          informanteKeys.all(input.consultant_id),
          context.previousInformantes,
        )
      }
    },

    onSettled: (_data, _error, input) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: informanteKeys.all(input.consultant_id),
      })
      // Invalidate per-edificio queries for each linked building
      for (const edificioId of input.edificio_ids) {
        queryClient.invalidateQueries({
          queryKey: informanteKeys.byEdificio(edificioId),
        })
      }
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateInformante — mutation to update informante
// ---------------------------------------------------------------------------

export interface UpdateInformanteInput {
  id: string
  consultant_id: string
  updates: Partial<
    Pick<
      Informante,
      | 'nome'
      | 'funcao'
      | 'qualidade_relacao'
      | 'notas'
      | 'comissao_devida'
      | 'comissao_paga'
      | 'total_investido_gentileza'
    >
  > & {
    telefone?: string
  }
}

export function useUpdateInformante() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateInformanteInput): Promise<Informante> => {
      const supabase = createClient()

      — encrypt telefone before update
      const updateData: Record<string, unknown> = { ...input.updates }
      if (input.updates.telefone !== undefined) {
        updateData.telefone = input.updates.telefone || null
        delete updateData.telefone
      }

      const { data, error } = await supabase
        .from('informantes')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update informante: ${error.message}`)
      }

      return data as Informante
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: informanteKeys.all(input.consultant_id),
      })
      queryClient.invalidateQueries({
        queryKey: informanteKeys.detail(input.id),
      })
      // Invalidate edificio-level queries broadly
      queryClient.invalidateQueries({
        queryKey: ['informantes', 'edificio'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useCreateAcaoGentileza — mutation to add a gentileza action
// ---------------------------------------------------------------------------

export interface CreateGentilezaInput {
  informante_id: string
  consultant_id: string
  tipo: AcaoGentileza['tipo']
  descricao?: string
  valor: number
  data_acao?: string // ISO date, defaults to today
}

export function useCreateAcaoGentileza() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateGentilezaInput): Promise<AcaoGentileza> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('acoes_gentileza')
        .insert({
          informante_id: input.informante_id,
          consultant_id: input.consultant_id,
          tipo: input.tipo,
          descricao: input.descricao || null,
          valor: input.valor,
          data_acao: input.data_acao || new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create acao gentileza: ${error.message}`)
      }

      // Update informante's total_investido_gentileza
      if (input.valor > 0) {
        const { error: updateError } = await supabase.rpc(
          'increment_gentileza_total',
          {
            p_informante_id: input.informante_id,
            p_valor: input.valor,
          },
        )

        // Fallback: manual update if RPC doesn't exist
        if (updateError) {
          console.warn('RPC increment_gentileza_total not found, using manual update')
          const { data: current } = await supabase
            .from('informantes')
            .select('total_investido_gentileza')
            .eq('id', input.informante_id)
            .single()

          if (current) {
            await supabase
              .from('informantes')
              .update({
                total_investido_gentileza:
                  (current.total_investido_gentileza || 0) + input.valor,
              })
              .eq('id', input.informante_id)
          }
        }
      }

      return data as AcaoGentileza
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: gentilezaKeys.byInformante(input.informante_id),
      })
      queryClient.invalidateQueries({
        queryKey: informanteKeys.all(input.consultant_id),
      })
      queryClient.invalidateQueries({
        queryKey: informanteKeys.detail(input.informante_id),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useAcoesGentileza — fetch gentileza history for an informante
// ---------------------------------------------------------------------------

export function useAcoesGentileza(informanteId: string | null) {
  const query = useQuery({
    queryKey: gentilezaKeys.byInformante(informanteId ?? ''),
    queryFn: async (): Promise<AcaoGentileza[]> => {
      if (!informanteId) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('acoes_gentileza')
        .select('*')
        .eq('informante_id', informanteId)
        .order('data_acao', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch acoes gentileza: ${error.message}`)
      }

      return (data ?? []) as AcaoGentileza[]
    },
    enabled: !!informanteId,
    staleTime: 30 * 1000,
  })

  return {
    acoes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
