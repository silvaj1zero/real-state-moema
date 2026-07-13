/**
 * Adapter — linha da RPC `fn_comparaveis_no_raio` (acm_comparaveis) → `AcmComparable`
 * da lib de metodologia (Story 8.2). Tolerante ao schema atual e ao pós-8.1:
 * usa `area_construida_m2`/`area_terreno_m2` quando presentes, caindo para o
 * `area_m2` legado. Mantém a lib de cálculo desacoplada do tipo do DB.
 *
 * Story 9.4 (backfill 12-Jul): mapeia os campos de metodologia populados pelo
 * sink do engine — `data_venda` → competência `dataVenda` (deflação 9.11/9.23),
 * R5 (`uso_iptu`/`padrao_iptu`/`complemento`/`sql_cadastral`) e `bairro_real`.
 * Campos ausentes na RPC seguem null (opt-in — zero mudança p/ dados antigos).
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
  // Story 9.4 — colunas populadas pelo sink/backfill do engine (RPC 20260711000002)
  data_venda?: string | null
  bairro_real?: string | null
  sql_cadastral?: string | null
  uso_iptu?: string | null
  padrao_iptu?: string | number | null
  complemento?: string | null
}

export function toAcmComparable(row: AcmRpcRow): AcmComparable {
  const vendaReal = row.is_venda_real ?? false
  // Competência 'YYYY-MM' só para venda real (ITBI): em anúncio, data_referencia
  // é data de captura, não de venda — mantém o comportamento semAjuste da 9.11.
  const dataVenda = vendaReal && row.data_venda ? row.data_venda.slice(0, 7) : null
  return {
    endereco: row.endereco,
    areaConstruida: row.area_construida_m2 ?? row.area_m2 ?? 0,
    areaTerreno: row.area_terreno_m2 ?? null,
    preco: row.preco,
    distancia: row.distancia_m ?? null,
    suites: row.suites ?? null,
    vagas: row.vagas ?? null,
    precoPedido: row.preco_pedido ?? null,
    isVendaReal: vendaReal,
    dataVenda,
    ...(dataVenda != null ? { dataVendaConfirmada: true } : {}),
    bairroReal: row.bairro_real ?? null,
    sqlCadastral: row.sql_cadastral ?? null,
    usoIptu: row.uso_iptu ?? null,
    padraoIptu: row.padrao_iptu != null ? String(row.padrao_iptu) : null,
    complemento: row.complemento ?? null,
  }
}

export function toAcmComparables(rows: AcmRpcRow[]): AcmComparable[] {
  return rows.map(toAcmComparable)
}
