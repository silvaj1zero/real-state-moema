// =============================================================================
// routeOrder — roteiro de visitas por proximidade (Story 10.2)
//
// Sequencia os alvos da call list (10.1) por DISTÂNCIA ao ponto de partida
// (haversine), com fallback por BAIRRO quando não há ponto de partida ou o item
// não tem coordenadas. Função pura, testável.
//
// LIMITAÇÃO INTENCIONAL (AC5): NÃO é otimização de rota (TSP/VRP). É ordenação
// simples por distância a partir do ponto de partida — não encadeia
// "vizinho-mais-próximo a partir do anterior".
// =============================================================================

import { haversineMeters, type CallListItem } from './callListOrder'

export interface RouteStop extends CallListItem {
  /** distância ao ponto de partida em metros; null sem origin ou sem coords. */
  distanciaM: number | null
  /** posição na sequência do dia (1..n). */
  numero: number
}

export interface VisitRoute {
  /** alvos com coordenada, ordenados (proximidade ou bairro) e numerados. */
  ordered: RouteStop[]
  /** alvos sem coordenada — vão para o fim, numerados após os `ordered` (AC6). */
  semCoord: RouteStop[]
  /** true quando um ponto de partida válido foi usado (ordenação por distância). */
  hasOrigin: boolean
}

function hasCoords(i: CallListItem): boolean {
  return i.lat != null && i.lng != null
}

/**
 * Monta o roteiro a partir dos alvos + ponto de partida opcional.
 * - Com origin: alvos com coords ordenados por distância asc.
 * - Sem origin: alvos com coords agrupáveis por bairro (ordena por bairro/nome).
 * - Alvos sem coords sempre ao fim (AC6).
 */
export function buildVisitRoute(
  items: CallListItem[],
  origin?: { lat: number; lng: number } | null,
): VisitRoute {
  const hasOrigin = !!origin
  const withCoord = items.filter(hasCoords)
  const without = items.filter((i) => !hasCoords(i))

  const orderedItems = [...withCoord]
  if (hasOrigin) {
    orderedItems.sort((a, b) => {
      const da = haversineMeters(origin!, { lat: a.lat!, lng: a.lng! })
      const db = haversineMeters(origin!, { lat: b.lat!, lng: b.lng! })
      if (da !== db) return da - db
      return a.listingId.localeCompare(b.listingId) // empate estável
    })
  } else {
    // Sem ponto de partida: ordena por bairro (visão/fallback por bairro — AC3/AC6).
    orderedItems.sort((a, b) => {
      const ba = (a.bairro ?? '￿').localeCompare(b.bairro ?? '￿')
      if (ba !== 0) return ba
      return (a.nome ?? '').localeCompare(b.nome ?? '') || a.listingId.localeCompare(b.listingId)
    })
  }

  const ordered: RouteStop[] = orderedItems.map((i, idx) => ({
    ...i,
    distanciaM: hasOrigin ? haversineMeters(origin!, { lat: i.lat!, lng: i.lng! }) : null,
    numero: idx + 1,
  }))

  const semCoord: RouteStop[] = without.map((i, idx) => ({
    ...i,
    distanciaM: null,
    numero: ordered.length + idx + 1,
  }))

  return { ordered, semCoord, hasOrigin }
}

/**
 * Agrupa as paradas por bairro, preservando a ordem de entrada dentro de cada
 * grupo. Itens sem bairro caem no bucket "Sem bairro" (sempre por último).
 */
export function groupByBairro(stops: RouteStop[]): { bairro: string; stops: RouteStop[] }[] {
  const SEM_BAIRRO = 'Sem bairro'
  const order: string[] = []
  const map = new Map<string, RouteStop[]>()

  for (const s of stops) {
    const key = s.bairro ?? SEM_BAIRRO
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(s)
  }

  // "Sem bairro" sempre por último.
  order.sort((a, b) => {
    if (a === SEM_BAIRRO) return 1
    if (b === SEM_BAIRRO) return -1
    return a.localeCompare(b)
  })

  return order.map((bairro) => ({ bairro, stops: map.get(bairro)! }))
}
