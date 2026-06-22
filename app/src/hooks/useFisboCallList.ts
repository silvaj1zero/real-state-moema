'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { parseCoordinates } from '@/lib/coordinates'
import { orderCallList, type CallListItem } from '@/lib/fisbo/callListOrder'
import type { ContatoStatus } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const fisboCallListKeys = {
  all: ['fisbo-call-list'] as const,
  list: (consultantId: string) => ['fisbo-call-list', consultantId] as const,
}

// ---------------------------------------------------------------------------
// Tipos das linhas cruas (subset das colunas que a call list consome)
// ---------------------------------------------------------------------------

interface ListingRow {
  id: string
  nome_anunciante: string | null
  endereco: string | null
  bairro: string | null
  telefone_anunciante: string | null
  whatsapp_anunciante: string | null
  preco: number | null
  preco_m2: number | null
  coordinates: string | null
  matched_edificio_id: string | null
  last_seen_at: string | null
}

interface LeadRow {
  id: string
  telefone: string | null
  etapa_funil: string
  contato_status: ContatoStatus
  contato_notas: string | null
  scraped_listing_id: string | null
}

// ---------------------------------------------------------------------------
// Merge puro: scraped_listings (FISBO) + leads do consultor → CallListItem[]
//
// Casa cada anúncio ao lead materializado por `scraped_listing_id` (vínculo
// determinístico) e, como fallback p/ leads antigos sem o vínculo, por telefone
// normalizado. Anúncios sem lead entram como `nao_contatado`.
// ---------------------------------------------------------------------------

function digits(phone: string | null): string {
  return (phone ?? '').replace(/\D/g, '')
}

export function buildCallListItems(listings: ListingRow[], leads: LeadRow[]): CallListItem[] {
  const byListingId = new Map<string, LeadRow>()
  const byPhone = new Map<string, LeadRow>()
  for (const lead of leads) {
    if (lead.scraped_listing_id) byListingId.set(lead.scraped_listing_id, lead)
    const d = digits(lead.telefone)
    if (d && !byPhone.has(d)) byPhone.set(d, lead)
  }

  return listings.map((l): CallListItem => {
    const lead =
      byListingId.get(l.id) ??
      (digits(l.telefone_anunciante) ? byPhone.get(digits(l.telefone_anunciante)) : undefined) ??
      null

    const coords = parseCoordinates(l.coordinates)
    const semContato = !l.telefone_anunciante && !l.whatsapp_anunciante

    return {
      listingId: l.id,
      leadId: lead?.id ?? null,
      nome: l.nome_anunciante,
      endereco: l.endereco,
      bairro: l.bairro,
      telefone: l.telefone_anunciante,
      whatsapp: l.whatsapp_anunciante,
      preco: l.preco,
      precoM2: l.preco_m2,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      contatoStatus: lead?.contato_status ?? 'nao_contatado',
      contatoNotas: lead?.contato_notas ?? null,
      lastSeenAt: l.last_seen_at,
      semContato,
      edificioId: l.matched_edificio_id,
      etapaFunil: lead?.etapa_funil ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// useFisboCallList — query + filtros + ordenação
// ---------------------------------------------------------------------------

export interface CallListFilters {
  bairro?: string | null
  status?: ContatoStatus | null
  /** ponto de referência p/ ordenar por proximidade (Story 10.2 fornece). */
  origin?: { lat: number; lng: number } | null
}

export function useFisboCallList(consultantId: string | null, filters: CallListFilters = {}) {
  const query = useQuery({
    queryKey: fisboCallListKeys.list(consultantId ?? ''),
    queryFn: async (): Promise<CallListItem[]> => {
      if (!consultantId) return []
      const supabase = createClient()

      const [listingsRes, leadsRes] = await Promise.all([
        supabase
          .from('scraped_listings')
          .select(
            'id, nome_anunciante, endereco, bairro, telefone_anunciante, whatsapp_anunciante, preco, preco_m2, coordinates, matched_edificio_id, last_seen_at',
          )
          .eq('is_fisbo', true)
          .eq('is_active', true)
          .limit(1000),
        supabase
          .from('leads')
          .select('id, telefone, etapa_funil, contato_status, contato_notas, scraped_listing_id')
          .eq('consultant_id', consultantId),
      ])

      if (listingsRes.error) throw new Error(`Falha ao carregar anúncios FISBO: ${listingsRes.error.message}`)
      if (leadsRes.error) throw new Error(`Falha ao carregar leads: ${leadsRes.error.message}`)

      return buildCallListItems(
        (listingsRes.data ?? []) as ListingRow[],
        (leadsRes.data ?? []) as LeadRow[],
      )
    },
    enabled: !!consultantId,
    staleTime: 30 * 1000,
  })

  const all = useMemo(() => query.data ?? [], [query.data])

  // Filtros (AC7) + ordenação (AC4) aplicados como view sobre os dados em cache.
  const items = useMemo(() => {
    let rows = all
    if (filters.bairro) rows = rows.filter((r) => r.bairro === filters.bairro)
    if (filters.status) rows = rows.filter((r) => r.contatoStatus === filters.status)
    return orderCallList(rows, { origin: filters.origin })
  }, [all, filters.bairro, filters.status, filters.origin])

  const bairros = useMemo(() => {
    const set = new Set<string>()
    for (const r of all) if (r.bairro) set.add(r.bairro)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [all])

  return {
    items,
    bairros,
    total: all.length,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useRegisterContatoStatus — registra a tentativa (AC3) com update otimista
//
// Se o anúncio ainda não virou lead, materializa o lead (captação — reuso do
// fluxo da Story 6.x) com o vínculo `scraped_listing_id`. Retorna o leadId p/ a
// ponte com o funil/agenda (AC5, tratada na UI).
// ---------------------------------------------------------------------------

export interface RegisterContatoStatusInput {
  item: CallListItem
  status: ContatoStatus
  notas?: string | null
  consultantId: string
}

export interface RegisterContatoStatusResult {
  leadId: string
  etapaFunil: string | null
}

export function useRegisterContatoStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      item,
      status,
      notas,
      consultantId,
    }: RegisterContatoStatusInput): Promise<RegisterContatoStatusResult> => {
      const supabase = createClient()
      const nowIso = new Date().toISOString()
      const notasValue = notas != null && notas.trim() !== '' ? notas.trim() : undefined

      // Lead já existe → só atualiza o status.
      if (item.leadId) {
        const { error } = await supabase
          .from('leads')
          .update({
            contato_status: status,
            contato_status_at: nowIso,
            ...(notasValue !== undefined ? { contato_notas: notasValue } : {}),
          })
          .eq('id', item.leadId)
        if (error) throw new Error(`Falha ao registrar contato: ${error.message}`)
        return { leadId: item.leadId, etapaFunil: item.etapaFunil ?? null }
      }

      // Sem lead → captar (materializar) com o vínculo determinístico.
      const insert = {
        consultant_id: consultantId,
        nome: item.nome || `Proprietário - ${item.endereco?.split(',')[0] || 'Sem endereço'}`,
        telefone: item.telefone || null,
        edificio_id: item.edificioId ?? null,
        origem: 'fisbo_scraping' as const,
        etapa_funil: 'contato' as const,
        is_fisbo: true,
        scraped_listing_id: item.listingId,
        contato_status: status,
        contato_status_at: nowIso,
        contato_notas: notasValue ?? null,
        notas: 'Captado via call list FISBO (Epic 10).',
      }

      const { data, error } = await supabase.from('leads').insert(insert).select('id').single()

      // Corrida: o anúncio já virou lead (índice único consultant_id+scraped_listing_id).
      if (error) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id, etapa_funil')
          .eq('consultant_id', consultantId)
          .eq('scraped_listing_id', item.listingId)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('leads')
            .update({
              contato_status: status,
              contato_status_at: nowIso,
              ...(notasValue !== undefined ? { contato_notas: notasValue } : {}),
            })
            .eq('id', existing.id)
          return { leadId: existing.id, etapaFunil: existing.etapa_funil ?? null }
        }
        throw new Error(`Falha ao captar lead: ${error.message}`)
      }

      return { leadId: data.id, etapaFunil: 'contato' }
    },

    onMutate: async ({ item, status, consultantId }) => {
      const key = fisboCallListKeys.list(consultantId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CallListItem[]>(key)

      queryClient.setQueryData<CallListItem[]>(key, (old) =>
        (old ?? []).map((r) =>
          r.listingId === item.listingId ? { ...r, contatoStatus: status } : r,
        ),
      )

      return { previous, key }
    },

    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous)
      }
    },

    onSettled: (_data, _err, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: fisboCallListKeys.list(consultantId) })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['funnel'] })
      queryClient.invalidateQueries({ queryKey: ['leads', 'funnel'] })
    },
  })
}
