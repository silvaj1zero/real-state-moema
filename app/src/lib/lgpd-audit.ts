/**
 * LGPD audit log helpers — Epic 7 Story 7.10 AC3/AC4.
 *
 * Wraps the `lgpd_audit_log` table. Use these helpers rather than raw inserts
 * so the action / legal_basis enums stay aligned with the SQL CHECK constraints.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type LGPDAction =
  | 'scrape'
  | 'reveal_phone'
  | 'reveal_email'
  | 'reveal_name'
  | 'export'
  | 'delete'
  | 'anonymize'
  | 'opt_out_request'
  | 'opt_out_complete'

export type LGPDLegalBasis =
  | 'legitimate_interest'
  | 'consent'
  | 'legal_obligation'

export interface LGPDAuditEntry {
  userId?: string | null
  leadId?: string | null
  listingId?: string | null
  action: LGPDAction
  legalBasis: LGPDLegalBasis
  evidence?: Record<string, unknown>
}

/**
 * Append a row to lgpd_audit_log. Caller MUST be authenticated OR use a
 * service-role client (admin endpoints).
 */
export async function logLGPDAccess(
  client: SupabaseClient,
  entry: LGPDAuditEntry
): Promise<void> {
  const row = {
    user_id: entry.userId ?? null,
    lead_id: entry.leadId ?? null,
    listing_id: entry.listingId ?? null,
    action: entry.action,
    legal_basis: entry.legalBasis,
    evidence: entry.evidence ?? {},
  }

  const { error } = await client.from('lgpd_audit_log').insert(row)
  if (error) {
    throw new Error(`logLGPDAccess failed: ${error.message}`)
  }
}

/**
 * Convenience helper for crawlers that just stored a new lead.
 * Wraps the `fn_lgpd_log_scrape` RPC which sets legal_basis automatically.
 */
export async function logLGPDScrape(
  client: SupabaseClient,
  leadId: string,
  listingId: string | null,
  evidence: Record<string, unknown>
): Promise<void> {
  const { error } = await client.rpc('fn_lgpd_log_scrape', {
    p_lead_id: leadId,
    p_listing_id: listingId,
    p_evidence: evidence,
  })
  if (error) {
    throw new Error(`logLGPDScrape failed: ${error.message}`)
  }
}

/**
 * Returns recent audit log entries for a given lead. Subject to RLS:
 * consultor sees their own rows; admin sees all.
 */
export async function listLeadAuditTrail(
  client: SupabaseClient,
  leadId: string,
  limit = 50
): Promise<unknown[]> {
  const { data, error } = await client
    .from('lgpd_audit_log')
    .select('id, action, legal_basis, evidence, timestamp, user_id')
    .eq('lead_id', leadId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`listLeadAuditTrail failed: ${error.message}`)
  }
  return data ?? []
}
