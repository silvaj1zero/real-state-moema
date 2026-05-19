/**
 * Edge Function — classify-anuncio (Story 7.6 AC6)
 *
 * Boundary contract for Wave A. Returns deterministic-v1 (no NLP) so that
 * Wave B can plug in LangGraph/NLP without changing the pipeline contract.
 *
 * Versioning strategy (per ADR-EPIC7-003):
 *   - Wave A response: { urgency_signal: null, motivation_hint: null,
 *                         source: 'deterministic_v1' }
 *   - Wave B response: { urgency_signal: 'high'|'medium'|'low',
 *                         motivation_hint: text,
 *                         source: 'langgraph_subgraph_v1' }
 *
 * The `source` field is the contract version. Consumers MUST switch on it
 * rather than assuming non-null fields. Wave A intentionally returns nulls
 * so deterministic consumers fall through to heuristics.
 *
 * Inputs (POST body, required):
 *   { listing_id: uuid, text: string }
 *
 * Status codes:
 *   200 — classification returned (even when null in Wave A)
 *   400 — invalid payload
 *   405 — non-POST
 *
 * Runtime: Deno (Supabase Edge Function).
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

export interface ClassifyAnuncioInput {
  listing_id: string
  text: string
}

export interface ClassifyAnuncioOutput {
  urgency_signal: 'high' | 'medium' | 'low' | null
  motivation_hint: string | null
  source: 'deterministic_v1' | 'langgraph_subgraph_v1'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateInput(body: unknown): { ok: true; value: ClassifyAnuncioInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'body_must_be_object' }
  }
  const b = body as Record<string, unknown>
  if (typeof b.listing_id !== 'string' || !UUID_RE.test(b.listing_id)) {
    return { ok: false, error: 'listing_id_must_be_uuid' }
  }
  if (typeof b.text !== 'string') {
    return { ok: false, error: 'text_must_be_string' }
  }
  return { ok: true, value: { listing_id: b.listing_id, text: b.text } }
}

/**
 * Wave A boundary stub. Always returns nulls + deterministic_v1.
 * Wave B will replace this body with an actual subgraph call but MUST
 * preserve the response shape.
 */
export function classifyAnuncioWaveA(_input: ClassifyAnuncioInput): ClassifyAnuncioOutput {
  return {
    urgency_signal: null,
    motivation_hint: null,
    source: 'deterministic_v1',
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// Edge Function handler. Exported for direct testing in non-Deno runtimes.
export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const v = validateInput(body)
  if (!v.ok) {
    return json(400, { error: v.error })
  }

  const out = classifyAnuncioWaveA(v.value)
  return json(200, out)
}

// Only start the server when running under Deno. The module is importable
// for unit tests (which mount `handler` directly).
// deno-lint-ignore no-explicit-any
const isDeno = typeof (globalThis as any).Deno !== 'undefined'
if (isDeno) {
  serve(handler)
}
