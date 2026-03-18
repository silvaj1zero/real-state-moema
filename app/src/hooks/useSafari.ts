'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SafariEvent, SafariEventRsvp, StatusSafari, StatusRsvp } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const safariKeys = {
  all: ['safari_events'] as const,
  byConsultant: (consultantId: string) => ['safari_events', consultantId] as const,
  rsvps: (eventId: string) => ['safari_rsvps', eventId] as const,
  public: (eventId: string) => ['safari_public', eventId] as const,
}

// ---------------------------------------------------------------------------
// useSafariEvents
// ---------------------------------------------------------------------------

export function useSafariEvents(consultantId: string | null) {
  const query = useQuery({
    queryKey: safariKeys.byConsultant(consultantId ?? ''),
    queryFn: async (): Promise<SafariEvent[]> => {
      if (!consultantId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('safari_events')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('data_hora', { ascending: false })

      if (error) { console.error('Error fetching safari events:', error); return [] }
      return (data ?? []) as SafariEvent[]
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  return { events: query.data ?? [], isLoading: query.isLoading, error: query.error }
}

// ---------------------------------------------------------------------------
// useSafariRsvps
// ---------------------------------------------------------------------------

export function useSafariRsvps(eventId: string | null) {
  const query = useQuery({
    queryKey: safariKeys.rsvps(eventId ?? ''),
    queryFn: async (): Promise<SafariEventRsvp[]> => {
      if (!eventId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('safari_event_rsvps')
        .select('*')
        .eq('safari_event_id', eventId)
        .order('created_at', { ascending: true })

      if (error) { console.error('Error fetching RSVPs:', error); return [] }
      return (data ?? []) as SafariEventRsvp[]
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
  })

  return { rsvps: query.data ?? [], isLoading: query.isLoading }
}

// ---------------------------------------------------------------------------
// useCreateSafari
// ---------------------------------------------------------------------------

export interface CreateSafariInput {
  consultant_id: string
  lead_id: string
  edificio_id?: string
  titulo: string
  descricao?: string
  data_hora: string
  endereco?: string
  vagas?: number
}

export function useCreateSafari() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSafariInput): Promise<SafariEvent> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('safari_events')
        .insert({
          consultant_id: input.consultant_id,
          lead_id: input.lead_id,
          edificio_id: input.edificio_id || null,
          titulo: input.titulo,
          descricao: input.descricao || null,
          data_hora: input.data_hora,
          endereco: input.endereco || null,
          vagas: input.vagas ?? 10,
          status: 'planejado' as const,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create safari: ${error.message}`)
      return data as SafariEvent
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: safariKeys.byConsultant(input.consultant_id) })
    },
  })
}

// ---------------------------------------------------------------------------
// useAddRsvp
// ---------------------------------------------------------------------------

export function useAddRsvp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      safari_event_id: string
      nome_convidado: string
      franquia?: string
      telefone?: string
    }): Promise<SafariEventRsvp> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('safari_event_rsvps')
        .insert({
          safari_event_id: input.safari_event_id,
          nome_convidado: input.nome_convidado,
          franquia: input.franquia || null,
          telefone: input.telefone || null,
          status: 'convidado' as const,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to add RSVP: ${error.message}`)
      return data as SafariEventRsvp
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: safariKeys.rsvps(input.safari_event_id) })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateRsvpStatus
// ---------------------------------------------------------------------------

export function useUpdateRsvpStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; eventId: string; status: StatusRsvp }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('safari_event_rsvps')
        .update({ status: input.status })
        .eq('id', input.id)
      if (error) throw new Error(`Failed to update RSVP: ${error.message}`)
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: safariKeys.rsvps(input.eventId) })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateSafariStatus
// ---------------------------------------------------------------------------

export function useUpdateSafariStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      consultant_id: string
      status: StatusSafari
      feedback?: string
      propostas_recebidas?: number
    }): Promise<SafariEvent> => {
      const supabase = createClient()
      const updates: Record<string, unknown> = { status: input.status }
      if (input.feedback !== undefined) updates.feedback = input.feedback
      if (input.propostas_recebidas !== undefined) updates.propostas_recebidas = input.propostas_recebidas

      const { data, error } = await supabase
        .from('safari_events')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update safari: ${error.message}`)
      return data as SafariEvent
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: safariKeys.byConsultant(input.consultant_id) })
    },
  })
}
