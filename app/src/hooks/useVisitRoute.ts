'use client'

import { useMemo } from 'react'
import { useFisboCallList } from '@/hooks/useFisboCallList'
import { buildVisitRoute, type VisitRoute } from '@/lib/fisbo/routeOrder'
import type { ContatoStatus } from '@/lib/supabase/types'

// Alvos do roteiro do dia (Story 10.2, AC2): agendados + a retornar.
const ROUTE_STATUSES: ContatoStatus[] = ['agendado', 'retornar']

export interface UseVisitRouteResult {
  route: VisitRoute
  total: number
  isLoading: boolean
  error: unknown
}

/**
 * Roteiro de visitas (Story 10.2). Reusa a call list FISBO (10.1) como fonte de
 * alvos, filtra os acionáveis em campo (agendado/retornar) e os sequencia por
 * proximidade ao `origin` (ou por bairro quando ausente).
 */
export function useVisitRoute(
  consultantId: string | null,
  origin?: { lat: number; lng: number } | null,
): UseVisitRouteResult {
  const { items, isLoading, error } = useFisboCallList(consultantId, {})

  const targets = useMemo(
    () => items.filter((i) => ROUTE_STATUSES.includes(i.contatoStatus)),
    [items],
  )

  const route = useMemo(() => buildVisitRoute(targets, origin), [targets, origin])

  return { route, total: targets.length, isLoading, error }
}
