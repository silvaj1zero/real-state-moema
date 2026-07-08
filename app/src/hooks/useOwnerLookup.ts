'use client'

/**
 * useOwnerLookup — Story 6.6 (AC8).
 *
 * Mutation dispara POST /api/owners/lookup; a query opcional puxa o ultimo
 * lookup success do edificio direto do Supabase (RLS). Erros HTTP viram um
 * resultado tipado (`OwnerLookupMutationError`) para a UI da 6.7 mapear
 * (429 → forbidden, 402 → budget_exceeded, 503 → disabled...).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OwnerLookup } from '@/lib/supabase/types'
import type { OwnerLookupErrorBody, OwnerLookupResponse } from '@/lib/schemas/owner-lookup'

export const ownerLookupKeys = {
  all: ['owner-lookup'] as const,
  byEdificio: (edificioId: string) => ['owner-lookup', edificioId] as const,
  dossie: (edificioId: string) => ['owner-lookup', 'dossie', edificioId] as const,
  history: (consultantId: string) => ['owner-lookup', 'history', consultantId] as const,
}

/** Erro tipado da mutation — preserva o HTTP status e o corpo estruturado. */
export class OwnerLookupMutationError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly body: OwnerLookupErrorBody | OwnerLookupResponse | null,
  ) {
    super(
      body && 'error' in (body as OwnerLookupErrorBody)
        ? (body as OwnerLookupErrorBody).error
        : `owner lookup failed (${httpStatus})`,
    )
    this.name = 'OwnerLookupMutationError'
  }
}

/**
 * POST /api/owners/lookup compartilhado (mutation e query do dossie).
 * 404 com payload de lookup (status=not_found) e um resultado valido para a
 * UI; os demais nao-2xx viram OwnerLookupMutationError tipado.
 */
export async function postOwnerLookup(input: {
  edificio_id?: string
  sql_lote?: string
  endereco?: string
}): Promise<OwnerLookupResponse> {
  const res = await fetch('/api/owners/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const body = (await res.json().catch(() => null)) as
    | OwnerLookupResponse
    | OwnerLookupErrorBody
    | null

  if (!res.ok && !(res.status === 404 && body && 'status' in body)) {
    throw new OwnerLookupMutationError(res.status, body)
  }

  return body as OwnerLookupResponse
}

export function useOwnerLookup(edificioId?: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const lastLookup = useQuery({
    queryKey: edificioId ? ownerLookupKeys.byEdificio(edificioId) : ownerLookupKeys.all,
    enabled: Boolean(edificioId),
    queryFn: async (): Promise<OwnerLookup | null> => {
      const { data, error } = await supabase
        .from('owner_lookups')
        .select('*')
        .eq('edificio_id', edificioId!)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as OwnerLookup | null) ?? null
    },
  })

  const mutation = useMutation({
    mutationFn: postOwnerLookup,
    onSettled: (_data, _error, variables) => {
      if (variables?.edificio_id) {
        queryClient.invalidateQueries({ queryKey: ownerLookupKeys.byEdificio(variables.edificio_id) })
      }
      queryClient.invalidateQueries({ queryKey: ownerLookupKeys.all })
    },
  })

  return { lastLookup, ...mutation }
}

/** Dispara o esquecimento LGPD (AC10) e invalida caches locais. */
export function useForgetOwnerLookup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lookupId: string): Promise<void> => {
      const res = await fetch(`/api/owners/${lookupId}/forget`, { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `forget failed (${res.status})`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerLookupKeys.all })
    },
  })
}
