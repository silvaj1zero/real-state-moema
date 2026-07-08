/**
 * Owner lookup service — Story 6.6.
 *
 * Orquestracao pura do pipeline (AC1): cache 90d → rate limit → budget →
 * flag → Infosimples → persistencia + evento no feed. As dependencias de
 * I/O entram injetadas (`OwnerLookupStore` + client Infosimples), o que
 * permite testar toda a logica de guarda sem tocar DB nem API paga.
 * O adapter Supabase concreto vive em `owner-lookup-store.ts`; a rota
 * `/api/owners/lookup` e so fiacao.
 */

import type { OwnerLookup } from '@/lib/supabase/types'
import type { InfosimplesResult } from '@/lib/infosimples'
import { OWNER_LOOKUP_COST_BRL } from '@/lib/infosimples'
import type { OwnerLookupResponse, OwnerLookupUsage } from '@/lib/schemas/owner-lookup'

export const CACHE_TTL_DAYS = 90
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface OwnerLookupStore {
  /** Ultimo lookup success dentro do TTL — por edificio OU sql_lote. */
  findCached(params: {
    edificioId?: string
    sqlLote?: string
    sinceIso: string
  }): Promise<OwnerLookup | null>
  /** Consumo da ultima hora: total de consultas + a mais antiga na janela. */
  getRateWindow(consultantId: string): Promise<{ count: number; oldestAt: string | null }>
  /** SUM(custo_brl) do mes corrente do consultor. */
  sumCostCurrentMonth(consultantId: string): Promise<number>
  /** Resolve sql_lote/endereco do edificio (com fallback GeoSampa no adapter). */
  resolveEdificio(edificioId: string): Promise<{ sqlLote: string | null; endereco: string | null } | null>
  insertLookup(row: {
    consultant_id: string
    edificio_id: string | null
    sql_lote: string | null
    endereco: string | null
    matricula: string | null
    nome_proprietario: string | null
    cpf_cnpj_masked: string | null
    cartorio: string | null
    data_matricula: string | null
    ultima_transacao: string | null
    custo_brl: number
    raw_response: unknown
    status: 'success' | 'failed' | 'not_found'
    error_message: string | null
  }): Promise<OwnerLookup>
  /** Evento intelligence_feed `owner_lookup_completo` (AC9). Best-effort. */
  insertFeedEvent(evt: {
    consultant_id: string
    edificio_id: string | null
    titulo: string
    metadata: Record<string, unknown>
  }): Promise<void>
}

export interface OwnerLookupConfig {
  enabled: boolean
  rateLimit: number
  budgetBrl: number
  costBrl: number
}

export interface OwnerLookupEnv {
  OWNER_LOOKUP_ENABLED?: string
  INFOSIMPLES_TOKEN?: string
  OWNER_LOOKUP_RATE_LIMIT?: string
  OWNER_LOOKUP_BUDGET_BRL?: string
  OWNER_LOOKUP_COST_BRL?: string
  // Index signature: aceita process.env (ProcessEnv) sem cast.
  [key: string]: string | undefined
}

/** Le a config do ambiente (defaults dos ACs 4/5). */
export function ownerLookupConfigFromEnv(env: OwnerLookupEnv = process.env): OwnerLookupConfig {
  return {
    enabled: env.OWNER_LOOKUP_ENABLED === 'true' && Boolean(env.INFOSIMPLES_TOKEN),
    rateLimit: Number(env.OWNER_LOOKUP_RATE_LIMIT ?? 30),
    budgetBrl: Number(env.OWNER_LOOKUP_BUDGET_BRL ?? 60.0),
    costBrl: Number(env.OWNER_LOOKUP_COST_BRL ?? OWNER_LOOKUP_COST_BRL),
  }
}

export type OwnerLookupOutcome =
  | { kind: 'ok'; httpStatus: 200 | 404 | 502; body: OwnerLookupResponse }
  | { kind: 'edificio_not_found' }
  | { kind: 'sql_lote_unresolved' }
  | { kind: 'rate_limited'; retryAfterSeconds: number; usage: OwnerLookupUsage }
  | { kind: 'budget_exceeded'; usage: OwnerLookupUsage }
  | { kind: 'disabled'; usage: OwnerLookupUsage }

export interface ExecuteOwnerLookupInput {
  consultantId: string
  edificioId?: string
  sqlLote?: string
  endereco?: string
}

interface Deps {
  store: OwnerLookupStore
  consultar: (sqlLote: string) => Promise<InfosimplesResult>
  config: OwnerLookupConfig
  now?: () => Date
}

function toResponse(
  row: OwnerLookup,
  cacheHit: boolean,
  usage: OwnerLookupUsage,
  nowMs: number,
): OwnerLookupResponse {
  return {
    lookup_id: row.id,
    status: row.status,
    cache_hit: cacheHit,
    cache_age_days: cacheHit
      ? Math.floor((nowMs - new Date(row.created_at).getTime()) / DAY_MS)
      : 0,
    edificio_id: row.edificio_id,
    sql_lote: row.sql_lote,
    matricula: row.matricula,
    nome_proprietario: row.nome_proprietario,
    cpf_cnpj_masked: row.cpf_cnpj_masked,
    cartorio: row.cartorio,
    data_matricula: row.data_matricula,
    ultima_transacao: row.ultima_transacao,
    custo_brl: cacheHit ? 0 : Number(row.custo_brl),
    error_message: row.error_message,
    ...usage,
  }
}

export async function executeOwnerLookup(
  input: ExecuteOwnerLookupInput,
  deps: Deps,
): Promise<OwnerLookupOutcome> {
  const { store, consultar, config } = deps
  const now = deps.now ?? (() => new Date())
  const nowMs = now().getTime()

  // --- Usage (rate + budget) calculado uma vez, devolvido em toda resposta ---
  const [rate, budgetUsed] = await Promise.all([
    store.getRateWindow(input.consultantId),
    store.sumCostCurrentMonth(input.consultantId),
  ])
  const rateResetAt = rate.oldestAt
    ? new Date(new Date(rate.oldestAt).getTime() + HOUR_MS).toISOString()
    : null
  const usage: OwnerLookupUsage = {
    rate_remaining: Math.max(0, config.rateLimit - rate.count),
    rate_reset_at: rateResetAt,
    budget_used: budgetUsed,
    budget_limit: config.budgetBrl,
  }

  // --- Resolver alvo (edificio → sql_lote, ou lote avulso) ---
  const edificioId: string | null = input.edificioId ?? null
  let sqlLote: string | null = input.sqlLote ?? null
  let endereco: string | null = input.endereco ?? null

  if (edificioId) {
    const resolved = await store.resolveEdificio(edificioId)
    if (!resolved) return { kind: 'edificio_not_found' }
    sqlLote = resolved.sqlLote
    endereco = endereco ?? resolved.endereco
  }

  // --- Cache 90d (AC6) — antes de rate/budget: cache hit e gratis ---
  const sinceIso = new Date(nowMs - CACHE_TTL_DAYS * DAY_MS).toISOString()
  const cached = await store.findCached({
    edificioId: edificioId ?? undefined,
    sqlLote: sqlLote ?? undefined,
    sinceIso,
  })
  if (cached) {
    return { kind: 'ok', httpStatus: 200, body: toResponse(cached, true, usage, nowMs) }
  }

  // --- Guardas: rate limit (AC4) → budget (AC5) → flag (fronteira) ---
  if (rate.count >= config.rateLimit) {
    const retryAfterSeconds = rate.oldestAt
      ? Math.max(1, Math.ceil((new Date(rate.oldestAt).getTime() + HOUR_MS - nowMs) / 1000))
      : 3600
    return { kind: 'rate_limited', retryAfterSeconds, usage }
  }

  if (budgetUsed + config.costBrl > config.budgetBrl) {
    return { kind: 'budget_exceeded', usage }
  }

  if (!config.enabled) {
    // FRONTEIRA DA API PAGA: flag OFF → nada e consultado nem persistido.
    return { kind: 'disabled', usage }
  }

  if (!sqlLote) {
    // Sem SQL do lote (GeoSampa tambem falhou) nao ha o que consultar.
    return { kind: 'sql_lote_unresolved' }
  }

  // --- Consulta Infosimples (AC7) + persistencia (AC2) ---
  const result = await consultar(sqlLote)

  const row = await store.insertLookup({
    consultant_id: input.consultantId,
    edificio_id: edificioId,
    sql_lote: sqlLote,
    endereco,
    matricula: result.status === 'success' ? result.matricula : null,
    nome_proprietario: result.status === 'success' ? result.nome_proprietario : null,
    cpf_cnpj_masked: result.status === 'success' ? result.cpf_cnpj_masked : null,
    cartorio: result.status === 'success' ? result.cartorio : null,
    data_matricula: result.status === 'success' ? result.data_matricula : null,
    ultima_transacao: result.status === 'success' ? result.ultima_transacao : null,
    // not_found nao e cobrado (AC7); failed idem (consulta nao entregue).
    custo_brl: result.status === 'success' ? config.costBrl : 0,
    raw_response: result.status === 'failed' ? null : result.raw,
    status: result.status,
    error_message: result.status === 'failed' ? result.errorMessage : null,
  })

  // Usage pos-consulta (a linha recem-inserida conta na janela/orcamento).
  const usageAfter: OwnerLookupUsage = {
    rate_remaining: Math.max(0, usage.rate_remaining - 1),
    rate_reset_at: usage.rate_reset_at ?? new Date(nowMs + HOUR_MS).toISOString(),
    budget_used: usage.budget_used + Number(row.custo_brl),
    budget_limit: usage.budget_limit,
  }

  if (result.status === 'success') {
    // AC9 — evento de rastreabilidade (best-effort: falha nao quebra o lookup).
    try {
      await store.insertFeedEvent({
        consultant_id: input.consultantId,
        edificio_id: edificioId,
        titulo: 'Proprietário identificado via cartório',
        metadata: {
          edificio_id: edificioId,
          nome_proprietario: row.nome_proprietario,
          cache_hit: false,
          custo_brl: Number(row.custo_brl),
        },
      })
    } catch (err) {
      console.error('owner_lookup feed event failed:', err instanceof Error ? err.message : err)
    }
  }

  const httpStatus = result.status === 'success' ? 200 : result.status === 'not_found' ? 404 : 502
  return { kind: 'ok', httpStatus, body: toResponse(row, false, usageAfter, nowMs) }
}
