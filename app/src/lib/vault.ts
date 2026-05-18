/**
 * Supabase Vault wrapper — Epic 7 Story 7.10 AC2.
 *
 * Single legitimate path for storing and reading lead PII. Never touch
 * `vault.secrets` or `vault.decrypted_secrets` directly from feature code.
 *
 * All operations route through SECURITY DEFINER RPCs (`fn_store_lead_pii`,
 * `fn_decrypt_lead_pii`) which enforce RLS ownership and audit logging.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type LeadPIIField = 'telefone' | 'email' | 'whatsapp' | 'nome'

const VALID_FIELDS: ReadonlySet<LeadPIIField> = new Set([
  'telefone',
  'email',
  'whatsapp',
  'nome',
])

/**
 * Stores a PII value for a lead, encrypted at rest by Supabase Vault.
 * Returns the resulting secret UUID for traceability.
 */
export async function storeLeadPII(
  client: SupabaseClient,
  leadId: string,
  field: LeadPIIField,
  plaintext: string
): Promise<string> {
  if (!VALID_FIELDS.has(field)) {
    throw new Error(`storeLeadPII: invalid field "${field}"`)
  }
  if (!plaintext || plaintext.trim().length === 0) {
    throw new Error('storeLeadPII: plaintext is required')
  }

  const { data, error } = await client.rpc('fn_store_lead_pii', {
    p_lead_id: leadId,
    p_field: field,
    p_plaintext: plaintext,
  })

  if (error) {
    throw new Error(`storeLeadPII failed: ${error.message}`)
  }
  return data as string
}

/**
 * Decrypts a PII value for a lead. Every call is logged to `lgpd_audit_log`
 * via the underlying RPC. Returns `null` if the field was never captured.
 *
 * Blocked automatically when `lead.lgpd_status != 'active'` (opt-out, anonymized).
 */
export async function getLeadPII(
  client: SupabaseClient,
  leadId: string,
  field: LeadPIIField
): Promise<string | null> {
  if (!VALID_FIELDS.has(field)) {
    throw new Error(`getLeadPII: invalid field "${field}"`)
  }

  const { data, error } = await client.rpc('fn_decrypt_lead_pii', {
    p_lead_id: leadId,
    p_field: field,
  })

  if (error) {
    throw new Error(`getLeadPII failed: ${error.message}`)
  }
  return (data as string | null) ?? null
}

/**
 * Convenience: stores all known PII fields for a lead in one call.
 * Skips undefined fields. Errors propagate (no partial-store semantics).
 */
export async function storeLeadPIIBatch(
  client: SupabaseClient,
  leadId: string,
  fields: Partial<Record<LeadPIIField, string>>
): Promise<void> {
  for (const [field, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value.length > 0) {
      await storeLeadPII(client, leadId, field as LeadPIIField, value)
    }
  }
}
