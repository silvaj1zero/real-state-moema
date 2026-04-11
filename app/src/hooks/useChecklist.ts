'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistPreparacao, TipoChecklist } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const checklistKeys = {
  all: ['checklist'] as const,
  byLead: (leadId: string) => ['checklist', leadId] as const,
}

// ---------------------------------------------------------------------------
// Checklist item keys (DB column names)
// ---------------------------------------------------------------------------

export type ChecklistItemKey =
  | 'acm_preparada'
  | 'dossie_montado'
  | 'home_staging_enviado'
  | 'matricula_verificada'
  | 'plano_marketing_rascunhado'

export const CHECKLIST_ITEMS: { key: ChecklistItemKey; label: string }[] = [
  { key: 'acm_preparada', label: 'ACM preparada' },
  { key: 'dossie_montado', label: 'Dossi\u00ea montado' },
  { key: 'home_staging_enviado', label: 'Home Staging enviado' },
  { key: 'matricula_verificada', label: 'Matr\u00edcula verificada' },
  { key: 'plano_marketing_rascunhado', label: 'Plano Marketing rascunhado' },
]

// ---------------------------------------------------------------------------
// Helper: count completed items
// ---------------------------------------------------------------------------

export function countCompleted(checklist: ChecklistPreparacao | null): number {
  if (!checklist) return 0
  let count = 0
  if (checklist.acm_preparada) count++
  if (checklist.dossie_montado) count++
  if (checklist.home_staging_enviado) count++
  if (checklist.matricula_verificada) count++
  if (checklist.plano_marketing_rascunhado) count++
  return count
}

// ---------------------------------------------------------------------------
// useChecklistByLead — fetch checklist_preparacao for a lead
// ---------------------------------------------------------------------------

export function useChecklistByLead(leadId: string | null) {
  const query = useQuery({
    queryKey: checklistKeys.byLead(leadId ?? ''),
    queryFn: async (): Promise<ChecklistPreparacao | null> => {
      if (!leadId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('checklist_preparacao')
        .select('*')
        .eq('lead_id', leadId)
        .eq('tipo', 'preparacao_v2')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to fetch checklist: ${error.message}`)
      }

      return (data as ChecklistPreparacao) ?? null
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
  })

  return {
    checklist: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useCreateChecklist — auto-create when V2 is scheduled
// ---------------------------------------------------------------------------

export interface CreateChecklistInput {
  lead_id: string
  consultant_id: string
  tipo?: TipoChecklist
  data_v2?: string // ISO 8601
}

export function useCreateChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateChecklistInput): Promise<ChecklistPreparacao> => {
      const supabase = createClient()

      // Check if checklist already exists for this lead
      const { data: existing } = await supabase
        .from('checklist_preparacao')
        .select('id')
        .eq('lead_id', input.lead_id)
        .eq('tipo', input.tipo ?? 'preparacao_v2')
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Return existing checklist instead of creating duplicate
        const { data } = await supabase
          .from('checklist_preparacao')
          .select('*')
          .eq('id', existing.id)
          .single()
        return data as ChecklistPreparacao
      }

      const insertData = {
        lead_id: input.lead_id,
        consultant_id: input.consultant_id,
        tipo: input.tipo ?? ('preparacao_v2' as TipoChecklist),
        acm_preparada: false,
        dossie_montado: false,
        home_staging_enviado: false,
        matricula_verificada: false,
        plano_marketing_rascunhado: false,
        data_v2: input.data_v2 ?? null,
      }

      const { data, error } = await supabase
        .from('checklist_preparacao')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create checklist: ${error.message}`)
      }

      return data as ChecklistPreparacao
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.byLead(input.lead_id),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateChecklistItem — toggle individual items
// ---------------------------------------------------------------------------

export interface UpdateChecklistItemInput {
  checklistId: string
  leadId: string
  field: ChecklistItemKey
  value: boolean
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateChecklistItemInput): Promise<ChecklistPreparacao> => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('checklist_preparacao')
        .update({ [input.field]: input.value })
        .eq('id', input.checklistId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update checklist item: ${error.message}`)
      }

      return data as ChecklistPreparacao
    },

    // Optimistic update for snappy UI
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: checklistKeys.byLead(input.leadId),
      })

      const previous = queryClient.getQueryData<ChecklistPreparacao | null>(
        checklistKeys.byLead(input.leadId)
      )

      if (previous) {
        queryClient.setQueryData<ChecklistPreparacao>(
          checklistKeys.byLead(input.leadId),
          { ...previous, [input.field]: input.value }
        )
      }

      return { previous }
    },

    onError: (_error, input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          checklistKeys.byLead(input.leadId),
          context.previous
        )
      }
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.byLead(input.leadId),
      })
    },
  })
}
