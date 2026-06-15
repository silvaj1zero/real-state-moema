/**
 * Adapter — linha da RPC `fn_comparaveis_no_raio` (acm_comparaveis) → `AcmComparable`
 * da lib de metodologia (Story 8.2). Tolerante ao schema atual e ao pós-8.1:
 * usa `area_construida_m2`/`area_terreno_m2` quando presentes, caindo para o
 * `area_m2` legado. Mantém a lib de cálculo desacoplada do tipo do DB.
 */
import type { AcmComparable } from './methodology'

/** Shape permissivo da linha vinda do banco (atual + campos da migration 8.1). */
export interface AcmRpcRow {
  endereco: string
  area_m2?: number | null
  area_construida_m2?: number | null
  area_terreno_m2?: number | null
  preco: number
  distancia_m?: number | null
  suites?: number | null
  vagas?: number | null
  preco_pedido?: number | null
  is_venda_real?: boolean
}

export function toAcmComparable(row: AcmRpcRow): AcmComparable {
  return {
    endereco: row.endereco,
    areaConstruida: row.area_construida_m2 ?? row.area_m2 ?? 0,
    areaTerreno: row.area_terreno_m2 ?? null,
    preco: row.preco,
    distancia: row.distancia_m ?? null,
    suites: row.suites ?? null,
    vagas: row.vagas ?? null,
    precoPedido: row.preco_pedido ?? null,
    isVendaReal: row.is_venda_real ?? false,
  }
}

export function toAcmComparables(rows: AcmRpcRow[]): AcmComparable[] {
  return rows.map(toAcmComparable)
}
