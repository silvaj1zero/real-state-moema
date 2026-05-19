/**
 * Edge Function — webhook_mercadolivre_done (Story 7.4 AC8)
 *
 * Recebe POST do Apify quando o Actor termina. Atualiza crawl_runs
 * para status='completed' (ou 'failed' se Apify reportou erro).
 * Idempotente — UNIQUE constraint em (run_id, status='completed').
 *
 * Auth: HMAC shared secret no header `x-webhook-secret`.
 *
 * Inputs (POST body do Apify):
 *   { resource: { status, stats, defaultDatasetId, ... }, eventType }
 * + query string: ?run_id={uuid}
 *
 * Runtime: Deno.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('MERCADOLIVRE_WEBHOOK_SECRET')

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // 1. Validar secret
  const provided = req.headers.get('x-webhook-secret')
  if (WEBHOOK_SECRET && provided !== WEBHOOK_SECRET) {
    return jsonResponse(401, { error: 'invalid_secret' })
  }

  // 2. Extrair run_id da query string
  const url = new URL(req.url)
  const runId = url.searchParams.get('run_id')
  if (!runId) {
    return jsonResponse(400, { error: 'run_id_missing' })
  }

  // 3. Parse Apify webhook payload
  let payload: {
    resource?: { status?: string; stats?: unknown }
    eventType?: string
  } = {}
  try {
    payload = await req.json()
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  const apifyStatus = payload.resource?.status ?? 'UNKNOWN'
  const finalStatus =
    apifyStatus === 'SUCCEEDED' ? 'completed' : apifyStatus === 'FAILED' || apifyStatus === 'ABORTED' ? 'failed' : 'completed'

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 4. Update idempotente — se já 'completed', skip silenciosamente
  const { data: existing } = await supabase
    .from('crawl_runs')
    .select('status')
    .eq('id', runId)
    .single()

  if (existing?.status === 'completed' || existing?.status === 'failed') {
    return jsonResponse(200, { run_id: runId, status: existing.status, idempotent: true })
  }

  const { error: updateErr } = await supabase
    .from('crawl_runs')
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      ...(payload.resource?.stats
        ? { error_message: null }
        : { error_message: `apify_status_${apifyStatus}` }),
    })
    .eq('id', runId)

  if (updateErr) {
    return jsonResponse(500, { error: 'crawl_run_update_failed', detail: updateErr.message })
  }

  return jsonResponse(200, { run_id: runId, status: finalStatus })
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
