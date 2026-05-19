/**
 * Shared run-lifecycle helpers — Story 7.6 AC7/AC8.
 *
 * Reusable contract for Epic 7 Edge Functions that orchestrate long-running
 * portal scrapes / ETL jobs against the `crawl_runs` telemetry table
 * (Story 7.2 AC1 schema + 7.6 AC4 retry_count column).
 *
 * Pattern (per ADR-EPIC7-003):
 *   1. trigger_*_crawl   -> createRun() then dispatch external job (Apify/HTTP)
 *                          and return 202 in <=5s (pg_cron UI hard limit)
 *   2. webhook_*_done    -> completeRun() (idempotent) when external job
 *                          posts back
 *   3. self-healing      -> fn_mark_stale_runs() sweeps runs stuck > 15min
 *                          (migration 013 — does NOT use these helpers)
 *
 * NOT consumed by trigger_mercadolivre_crawl / webhook_mercadolivre_done yet
 * (those are owned by Story 7.4 and predate this module). Refactor those to
 * use this contract in a future story to deduplicate.
 *
 * Runtime: Deno (Supabase Edge Functions). Imports use deno-compatible URLs.
 */

// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type CrawlRunStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export interface CreateRunInput {
  portal: string
  // Optional pre-known metadata; merged into the telemetry row.
  metadata?: Record<string, unknown>
}

export interface CompleteRunInput {
  run_id: string
  status: Exclude<CrawlRunStatus, 'running'>
  stats?: Record<string, unknown>
  error_message?: string
}

export interface CrawlRun {
  id: string
  portal: string
  status: CrawlRunStatus
  started_at: string
  finished_at: string | null
  retry_count: number
}

/**
 * Build a service-role Supabase client from the standard Edge Function env.
 * Returns null if env is missing so callers can short-circuit with 500.
 */
export function getServiceClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * AC7 — Register a fresh crawl_run row in status='running'.
 * Returns the new run row (id + started_at) so the caller can pass run_id to
 * its external dispatcher (Apify start, container kickoff, etc).
 */
export async function createRun(
  client: SupabaseClient,
  input: CreateRunInput,
): Promise<{ data: CrawlRun | null; error: string | null }> {
  const { data, error } = await client
    .from('crawl_runs')
    .insert({
      portal: input.portal,
      status: 'running',
      started_at: new Date().toISOString(),
      retry_count: 0,
    })
    .select('id, portal, status, started_at, finished_at, retry_count')
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'createRun_insert_failed' }
  }
  return { data: data as CrawlRun, error: null }
}

/**
 * AC8 — Mark a run as completed/failed/cancelled. Idempotent: if the row is
 * already in a terminal state, the UPDATE is a no-op (matched by guard).
 *
 * Returns { updated: boolean } so callers can decide whether to treat as a
 * duplicate webhook delivery.
 */
export async function completeRun(
  client: SupabaseClient,
  input: CompleteRunInput,
): Promise<{ updated: boolean; error: string | null }> {
  const { data, error } = await client
    .from('crawl_runs')
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      error_message: input.error_message ?? null,
    })
    .eq('id', input.run_id)
    .eq('status', 'running') // idempotency guard: only update if still running
    .select('id')

  if (error) {
    return { updated: false, error: error.message }
  }
  return { updated: (data?.length ?? 0) > 0, error: null }
}

/**
 * Lightweight 202 helper for trigger functions.
 */
export function accepted(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 202,
    headers: { 'content-type': 'application/json' },
  })
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
