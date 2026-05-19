/**
 * Edge Function — trigger_mercadolivre_crawl (Story 7.4 AC8)
 *
 * Disparado pelo cron `epic7_mercadolivre_daily` (definido em Story 7.6).
 * Padrão per ADR-EPIC7-003: registrar start em crawl_runs + disparar
 * Apify runs/start; retornar 202 em <=5s (limite Cron UI).
 *
 * Auth (SEC-002 fix, gate 2794411): valida shared secret no header
 *   `x-trigger-secret` contra env `MERCADOLIVRE_TRIGGER_SECRET`.
 *   Cron (Story 7.6 migration 012) deve enviar o header — ver migration 017.
 *
 * Inputs (POST body, opcional):
 *   { bairros?: string[], preco_min?, preco_max?, area_min?, area_max?, quartos_min? }
 *
 * Resposta: 202 { run_id, apify_run_id, status: 'running' }
 * ou 401 se header de auth ausente/incorreto
 * ou 5xx em falha pré-dispatch.
 *
 * Runtime: Deno (Supabase Edge Function).
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN')
const APIFY_ACTOR_ID = Deno.env.get('APIFY_ACTOR_MERCADOLIVRE_ID')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_BASE = Deno.env.get('EDGE_FUNCTION_BASE_URL') // ex: https://{ref}.supabase.co/functions/v1
const WEBHOOK_SECRET = Deno.env.get('MERCADOLIVRE_WEBHOOK_SECRET') // HMAC secret p/ webhook_mercadolivre_done
const TRIGGER_SECRET = Deno.env.get('MERCADOLIVRE_TRIGGER_SECRET') // shared secret p/ esta função

interface ActorInput {
  bairros?: string[]
  tipo_negocio?: 'venda' | 'aluguel'
  preco_min?: number
  preco_max?: number
  area_min?: number
  area_max?: number
  quartos_min?: number
}

const DEFAULT_INPUT: ActorInput = {
  bairros: ['moema', 'vila-olimpia', 'itaim-bibi'],
  tipo_negocio: 'venda',
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // SEC-002 fix: exigir auth header. Cron pg_cron envia x-trigger-secret.
  if (!TRIGGER_SECRET) {
    return jsonResponse(500, { error: 'trigger_secret_unset' })
  }
  const provided = req.headers.get('x-trigger-secret')
  if (provided !== TRIGGER_SECRET) {
    return jsonResponse(401, { error: 'unauthorized' })
  }

  if (!APIFY_TOKEN || !APIFY_ACTOR_ID) {
    return jsonResponse(500, { error: 'apify_env_missing' })
  }

  let body: ActorInput = {}
  try {
    body = (await req.json()) as ActorInput
  } catch {
    /* body opcional */
  }
  const input = { ...DEFAULT_INPUT, ...body }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. Registrar crawl_run em status=running
  const { data: run, error: insertErr } = await supabase
    .from('crawl_runs')
    .insert({
      portal: 'mercadolivre',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertErr || !run) {
    return jsonResponse(500, {
      error: 'crawl_run_insert_failed',
      detail: insertErr?.message,
    })
  }

  // 2. Disparar Apify Actor (não aguardar conclusão).
  // `webhookKey` faz o Apify Actor assinar o body via HMAC-SHA256 ao chamar
  // o webhook configurado dentro do Actor (Story 7.4 webhook_mercadolivre_done
  // valida `x-webhook-signature` com este mesmo secret).
  const webhookUrl = WEBHOOK_BASE
    ? `${WEBHOOK_BASE}/webhook_mercadolivre_done?run_id=${run.id}`
    : undefined

  const apifyRes = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...input,
        _runId: run.id,
        _webhook: webhookUrl,
        _webhookKey: WEBHOOK_SECRET, // Apify computa HMAC do body com este secret
      }),
    },
  )

  if (!apifyRes.ok) {
    await supabase
      .from('crawl_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: `apify_start_${apifyRes.status}`,
      })
      .eq('id', run.id)
    return jsonResponse(502, { error: 'apify_dispatch_failed', status: apifyRes.status })
  }

  const apifyJson = await apifyRes.json()

  return jsonResponse(202, {
    run_id: run.id,
    apify_run_id: apifyJson?.data?.id ?? null,
    status: 'running',
  })
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
