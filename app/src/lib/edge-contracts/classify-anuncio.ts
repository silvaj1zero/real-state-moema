/**
 * Edge-function boundary contract — classify-anuncio (Story 7.6 AC6).
 *
 * Runtime-agnostic (pure TypeScript). The Deno-hosted Edge Function at
 * `supabase/functions/classify-anuncio/index.ts` mirrors this logic byte-for-byte
 * for the validation and Wave A response builder. Both implementations MUST
 * stay in lock-step; the OpenAPI spec at
 * `docs/architecture/api-contracts/classify-anuncio.yaml` is the authoritative
 * shape contract.
 *
 * This module exists so vitest (Node) can validate the Wave A boundary without
 * pulling Deno-specific imports from the Edge Function bundle.
 */

export interface ClassifyAnuncioInput {
  listing_id: string
  text: string
}

export interface ClassifyAnuncioOutput {
  urgency_signal: 'high' | 'medium' | 'low' | null
  motivation_hint: string | null
  source: 'deterministic_v1' | 'langgraph_subgraph_v1'
}

export type ValidationResult =
  | { ok: true; value: ClassifyAnuncioInput }
  | { ok: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateInput(body: unknown): ValidationResult {
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
 * Wave A boundary stub. Always returns nulls + deterministic_v1. Wave B will
 * replace the body but MUST preserve the response shape and the `source`
 * enum value `langgraph_subgraph_v1`.
 */
export function classifyAnuncioWaveA(
  _input: ClassifyAnuncioInput,
): ClassifyAnuncioOutput {
  return {
    urgency_signal: null,
    motivation_hint: null,
    source: 'deterministic_v1',
  }
}
