/**
 * Edge Function — webhook_mercadolivre_done (Story 7.4 AC8)
 *
 * Recebe POST do Apify quando o Actor termina. Atualiza crawl_runs
 * para status='completed' (ou 'failed' se Apify reportou erro).
 * Idempotente — UNIQUE constraint em (run_id, status='completed').
 *
 * Auth: HMAC-SHA256 sobre o body raw (header `x-webhook-signature`).
 *   - Apify webhook config envia `secret` que o Apify usa para calcular
 *     a assinatura HMAC do payload e mandar no header `x-webhook-signature`.
 *   - Fix SEC-001 (gate 2794411): trocou shared-token simples por HMAC.
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

// Constant-time comparison to avoid timing attacks on signature validation.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// HMAC-SHA256 hex digest via Web Crypto (Deno-native, no node:crypto needed).
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const bytes = new Uint8Array(sigBuf)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // 1. Ler body RAW (necessário para HMAC; depois fazer JSON.parse)
  const bodyText = await req.text()

  // 2. Validar HMAC-SHA256 sobre o body — SEC-001 fix
  if (!WEBHOOK_SECRET) {
    return jsonResponse(500, { error: 'webhook_secret_unset' })
  }
  const providedSig = (req.headers.get('x-webhook-signature') ?? '').trim().toLowerCase()
  if (!providedSig) {
    return jsonResponse(401, { error: 'signature_missing' })
  }
  const expectedSig = await hmacSha256Hex(WEBHOOK_SECRET, bodyText)
  if (!timingSafeEqualHex(expectedSig, providedSig)) {
    return jsonResponse(401, { error: 'invalid_signature' })
  }

  // 3. Extrair run_id da query string
  const url = new URL(req.url)
  const runId = url.searchParams.get('run_id')
  if (!runId) {
    return jsonResponse(400, { error: 'run_id_missing' })
  }

  // 4. Parse Apify webhook payload
  let payload: {
    resource?: { status?: string; stats?: unknown }
    eventType?: string
  } = {}
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  const apifyStatus = payload.resource?.status ?? 'UNKNOWN'
  const finalStatus =
    apifyStatus === 'SUCCEEDED'
      ? 'completed'
      : apifyStatus === 'FAILED' || apifyStatus === 'ABORTED'
        ? 'failed'
        : 'completed'

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 5. Update idempotente — se já 'completed', skip silenciosamente
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

// Export helpers for unit tests (Deno test runner can import)
export { hmacSha256Hex, timingSafeEqualHex }
