// =============================================================================
// callListOrder — ordenação/priorização pura da call list FISBO (Story 10.1)
//
// Regra de priorização (AC4), documentada e testável:
//   1. Por STATUS de contato (quem precisa de ação primeiro):
//        nao_contatado → retornar → nao_atendeu → atendeu → agendado → descartado
//   2. Empate de status:
//        - se `origin` (lat/lng) for fornecido E o item tiver coords → menor
//          distância primeiro (proximidade); itens sem coords vão ao fim do grupo.
//        - sem `origin` → recência do anúncio (last_seen_at desc).
//
// O roteiro de visitas completo (agrupamento por raio/bairro, sequência) é a
// Story 10.2 — aqui só a ordenação base, com gancho de proximidade opcional.
// =============================================================================

import type { ContatoStatus } from '@/lib/supabase/types'

export interface CallListItem {
  /** id do anúncio FISBO de origem (scraped_listings). */
  listingId: string
  /** id do lead materializado, se já existir (null = ainda não captado). */
  leadId: string | null
  nome: string | null
  endereco: string | null
  bairro: string | null
  telefone: string | null
  whatsapp: string | null
  preco: number | null
  precoM2: number | null
  lat: number | null
  lng: number | null
  contatoStatus: ContatoStatus
  contatoNotas: string | null
  /** ISO — recência do anúncio (last_seen_at), usado no desempate sem origin. */
  lastSeenAt: string | null
  /** true quando não há telefone nem whatsapp (degradação graciosa — AC6). */
  semContato: boolean
  /** edifício casado ao anúncio (carregado p/ a captação; não afeta a ordem). */
  edificioId?: string | null
  /** etapa atual do lead materializado, se houver (p/ a ponte com o funil — AC5). */
  etapaFunil?: string | null
}

export interface OrderOptions {
  /** Ponto de referência para ordenar por proximidade (ex.: epicentro ativo). */
  origin?: { lat: number; lng: number } | null
}

/** Ordem de prioridade de ação por status (menor índice = mais no topo). */
const STATUS_PRIORITY: Record<ContatoStatus, number> = {
  nao_contatado: 0,
  retornar: 1,
  nao_atendeu: 2,
  atendeu: 3,
  agendado: 4,
  descartado: 5,
}

const EARTH_RADIUS_M = 6_371_000

/** Distância haversine em metros entre dois pontos lat/lng. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Distância de um item ao `origin`, ou Infinity quando não há origin ou o item
 * não tem coordenadas (vai para o fim do grupo de empate).
 */
export function itemDistance(item: CallListItem, origin?: { lat: number; lng: number } | null): number {
  if (!origin || item.lat == null || item.lng == null) return Infinity
  return haversineMeters(origin, { lat: item.lat, lng: item.lng })
}

/**
 * Ordena a call list aplicando a regra de priorização (AC4).
 * Função pura — não muta o array de entrada.
 */
export function orderCallList(items: CallListItem[], opts: OrderOptions = {}): CallListItem[] {
  const { origin } = opts
  const useProximity = !!origin

  return [...items].sort((a, b) => {
    // 1. Status de ação
    const sa = STATUS_PRIORITY[a.contatoStatus] ?? 99
    const sb = STATUS_PRIORITY[b.contatoStatus] ?? 99
    if (sa !== sb) return sa - sb

    // 2a. Proximidade (quando há origin)
    if (useProximity) {
      const da = itemDistance(a, origin)
      const db = itemDistance(b, origin)
      if (da !== db) return da - db
      // empate de distância (ambos sem coords) → cai para recência
    }

    // 2b. Recência do anúncio (last_seen_at desc); sem data vai ao fim
    const ta = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : -Infinity
    const tb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : -Infinity
    if (ta !== tb) return tb - ta

    // 3. Estabilidade — desempate final determinístico por id
    return a.listingId.localeCompare(b.listingId)
  })
}
