/**
 * Epic 7 — Telemetry Layer (Story 7.2 AC3).
 *
 * Async fire-and-forget persistence of crawl observability to Supabase
 * tables `crawl_runs`, `crawl_requests`, `crawl_failures` (created by
 * migration 009).
 *
 * PUREZA TS: ZERO imports de `next/*` ou helpers SSR. Usa o cliente
 * @supabase/supabase-js puro, recebendo env vars no constructor para
 * permitir copy-on-build em Apify Actors (ADR-EPIC7-006).
 *
 * Ref: `docs/code-anatomy/apify-crawlee-focused/extraction-notes.md` Sec. 2
 */

import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Status canonico de uma corrida de crawl. Mirror do CHECK em
 * `crawl_runs.status` (migration 009).
 */
export type CrawlRunStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface CrawlRunInsert {
  id?: string
  portal: string
  status: CrawlRunStatus
  started_at?: string
  finished_at?: string | null
  requests_finished?: number
  requests_failed?: number
  http_only_runs?: number
  browser_runs?: number
  mispredictions?: number
  avg_duration_ms?: number | null
  error_message?: string | null
}

export interface CrawlRequestInsert {
  run_id: string
  portal: string
  url: string
  status_code?: number | null
  duration_ms?: number | null
  retries?: number
}

export interface CrawlFailureInsert {
  run_id: string
  portal: string
  url: string
  error_message: string
  error_stack?: string | null
}

export interface CrawlRunSnapshot {
  run_id: string
  portal: string
  status: CrawlRunStatus
  requests_finished: number
  requests_failed: number
  started_at: string
  finished_at: string | null
}

// ---------------------------------------------------------------------------
// TelemetryClient — minimal subset of SupabaseClient we depend on.
// Tests inject a mock via this interface.
// ---------------------------------------------------------------------------

export interface TelemetryClient {
  insertRun(row: CrawlRunInsert): Promise<{ id: string }>
  updateRun(id: string, patch: Partial<CrawlRunInsert>): Promise<void>
  insertRequest(row: CrawlRequestInsert): Promise<void>
  insertFailure(row: CrawlFailureInsert): Promise<void>
  fetchRun(id: string): Promise<CrawlRunSnapshot | null>
}

/**
 * Adapter sobre `SupabaseClient` que implementa `TelemetryClient`.
 *
 * Mantemos esta classe restrita ao mapeamento tabela <-> objeto.
 * Toda logica de telemetria (contadores, batching) fica na classe
 * `Telemetry` abaixo.
 */
export class SupabaseTelemetryClient implements TelemetryClient {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async insertRun(row: CrawlRunInsert): Promise<{ id: string }> {
    const { data, error } = await this.db
      .from('crawl_runs')
      .insert(row)
      .select('id')
      .single()
    if (error) throw new Error(`crawl_runs insert failed: ${error.message}`)
    return { id: data.id as string }
  }

  async updateRun(id: string, patch: Partial<CrawlRunInsert>): Promise<void> {
    const { error } = await this.db
      .from('crawl_runs')
      .update(patch)
      .eq('id', id)
    if (error) throw new Error(`crawl_runs update failed: ${error.message}`)
  }

  async insertRequest(row: CrawlRequestInsert): Promise<void> {
    const { error } = await this.db.from('crawl_requests').insert(row)
    if (error) throw new Error(`crawl_requests insert failed: ${error.message}`)
  }

  async insertFailure(row: CrawlFailureInsert): Promise<void> {
    const { error } = await this.db.from('crawl_failures').insert(row)
    if (error) throw new Error(`crawl_failures insert failed: ${error.message}`)
  }

  async fetchRun(id: string): Promise<CrawlRunSnapshot | null> {
    const { data, error } = await this.db
      .from('crawl_runs')
      .select(
        'id, portal, status, requests_finished, requests_failed, started_at, finished_at',
      )
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`crawl_runs fetch failed: ${error.message}`)
    if (!data) return null
    return {
      run_id: data.id as string,
      portal: data.portal as string,
      status: data.status as CrawlRunStatus,
      requests_finished: (data.requests_finished as number) ?? 0,
      requests_failed: (data.requests_failed as number) ?? 0,
      started_at: data.started_at as string,
      finished_at: (data.finished_at as string | null) ?? null,
    }
  }
}

// ---------------------------------------------------------------------------
// Telemetry — public surface
// ---------------------------------------------------------------------------

export interface TelemetryOptions {
  /** Supabase URL — quando passado, constroi cliente service_role local. */
  supabaseUrl?: string
  /** Service-role key (NUNCA usar anon aqui — escrita protegida via RLS). */
  supabaseServiceRoleKey?: string
  /** Cliente custom (preferencial para testes). Tem prioridade sobre URL/key. */
  client?: TelemetryClient
  /** Logger opcional para fire-and-forget errors. Default: console.error. */
  logger?: (msg: string, err?: unknown) => void
}

/**
 * Telemetry — wraps a TelemetryClient e expoe API alta para o
 * PortalCrawler usar nos hooks (`recordRequest`, `recordFailure`,
 * `snapshot`).
 *
 * Design notes:
 * - `recordRequest`/`recordFailure` sao fire-and-forget: NUNCA throw,
 *   so logam erro. Crawler nao deve parar por causa de telemetria.
 * - Counters in-memory permitem snapshot O(1) sem round-trip DB no
 *   hot path (relevante para overhead < 50ms/request).
 * - `flush` (chamado no fim do run) faz update final em `crawl_runs`
 *   com contadores agregados.
 */
export class Telemetry {
  private readonly client: TelemetryClient
  private readonly logger: (msg: string, err?: unknown) => void

  private runId: string | null = null
  private portal: string | null = null
  private startedAt: string | null = null

  private requestsFinished = 0
  private requestsFailed = 0
  private durationsMs: number[] = []

  constructor(opts: TelemetryOptions = {}) {
    this.logger = opts.logger ?? ((msg, err) => console.error(msg, err))

    if (opts.client) {
      this.client = opts.client
    } else if (opts.supabaseUrl && opts.supabaseServiceRoleKey) {
      const db = createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      this.client = new SupabaseTelemetryClient(db)
    } else {
      throw new Error(
        'Telemetry: provide either `client` or `supabaseUrl` + `supabaseServiceRoleKey`',
      )
    }
  }

  /**
   * Inicia um novo crawl_run e retorna run_id (UUID gerado por Postgres).
   *
   * MUST ser chamado antes de qualquer recordRequest/recordFailure.
   */
  async startRun(portal: string): Promise<string> {
    const startedAt = new Date().toISOString()
    const { id } = await this.client.insertRun({
      portal,
      status: 'running',
      started_at: startedAt,
      requests_finished: 0,
      requests_failed: 0,
      http_only_runs: 0,
      browser_runs: 0,
      mispredictions: 0,
    })
    this.runId = id
    this.portal = portal
    this.startedAt = startedAt
    this.requestsFinished = 0
    this.requestsFailed = 0
    this.durationsMs = []
    return id
  }

  /**
   * Registra um request concluido com sucesso. Fire-and-forget.
   *
   * @param url URL absoluta requisitada
   * @param statusCode HTTP status (200, 301, etc.)
   * @param durationMs latencia de request->response em ms
   * @param retries quantidade de retries antes de sucesso (default 0)
   */
  recordRequest(
    url: string,
    statusCode: number | null,
    durationMs: number | null,
    retries = 0,
  ): void {
    if (!this.runId || !this.portal) {
      this.logger('Telemetry.recordRequest called before startRun — ignored')
      return
    }
    this.requestsFinished += 1
    if (typeof durationMs === 'number' && Number.isFinite(durationMs)) {
      this.durationsMs.push(durationMs)
    }

    // Fire-and-forget — never block crawler on telemetry I/O.
    const runId = this.runId
    const portal = this.portal
    void this.client
      .insertRequest({
        run_id: runId,
        portal,
        url,
        status_code: statusCode,
        duration_ms: durationMs,
        retries,
      })
      .catch((err) =>
        this.logger('Telemetry.recordRequest insert failed', err),
      )
  }

  /**
   * Registra uma falha (apos retries esgotados ou propagacao explicita).
   * Fire-and-forget.
   */
  recordFailure(
    url: string,
    errorMessage: string,
    errorStack?: string | null,
  ): void {
    if (!this.runId || !this.portal) {
      this.logger('Telemetry.recordFailure called before startRun — ignored')
      return
    }
    this.requestsFailed += 1

    const runId = this.runId
    const portal = this.portal
    void this.client
      .insertFailure({
        run_id: runId,
        portal,
        url,
        error_message: errorMessage,
        error_stack: errorStack ?? null,
      })
      .catch((err) =>
        this.logger('Telemetry.recordFailure insert failed', err),
      )
  }

  /**
   * Snapshot in-memory dos contadores. Util para hooks e testes.
   * NAO faz query no DB.
   */
  snapshot(): {
    run_id: string | null
    portal: string | null
    started_at: string | null
    requests_finished: number
    requests_failed: number
    avg_duration_ms: number | null
  } {
    const avg =
      this.durationsMs.length === 0
        ? null
        : this.durationsMs.reduce((a, b) => a + b, 0) / this.durationsMs.length
    return {
      run_id: this.runId,
      portal: this.portal,
      started_at: this.startedAt,
      requests_finished: this.requestsFinished,
      requests_failed: this.requestsFailed,
      avg_duration_ms: avg,
    }
  }

  /**
   * Finaliza o run, persiste contadores agregados. Idempotente.
   */
  async finishRun(
    status: Extract<CrawlRunStatus, 'completed' | 'failed' | 'cancelled'>,
    errorMessage: string | null = null,
  ): Promise<void> {
    if (!this.runId) return
    const snap = this.snapshot()
    await this.client.updateRun(this.runId, {
      status,
      finished_at: new Date().toISOString(),
      requests_finished: snap.requests_finished,
      requests_failed: snap.requests_failed,
      avg_duration_ms: snap.avg_duration_ms,
      error_message: errorMessage,
    })
  }

  /**
   * Read-through ao DB para verificar estado real do run (uso de healer).
   */
  async fetchRunSnapshot(): Promise<CrawlRunSnapshot | null> {
    if (!this.runId) return null
    return this.client.fetchRun(this.runId)
  }
}
