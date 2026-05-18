/**
 * LGPD audit log tests — Story 7.10 AC3/AC4.
 *
 * Cobre: logLGPDAccess insere row com shape correto e defaults (user_id /
 * lead_id / listing_id null-safe, evidence default {}), logLGPDScrape
 * invoca RPC com payload correto, listLeadAuditTrail aplica filter +
 * order + limit. Mock do Supabase client builder.
 */

import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  logLGPDAccess,
  logLGPDScrape,
  listLeadAuditTrail,
} from '@/lib/lgpd-audit'

function makeInsertClient(insertResult: { error: { message: string } | null }) {
  const insert = vi.fn(() => Promise.resolve(insertResult))
  const from = vi.fn(() => ({ insert }))
  const client = { from } as unknown as SupabaseClient
  return { client, insert, from }
}

function makeRpcClient(rpcResult: { error: { message: string } | null }) {
  const rpc = vi.fn(() => Promise.resolve(rpcResult))
  const client = { rpc } as unknown as SupabaseClient
  return { client, rpc }
}

function makeSelectClient(rows: unknown[], error: { message: string } | null = null) {
  // chain: from().select().eq().order().limit()
  const limit = vi.fn(() => Promise.resolve({ data: rows, error }))
  const order = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const client = { from } as unknown as SupabaseClient
  return { client, from, select, eq, order, limit }
}

describe('logLGPDAccess', () => {
  it('inserts row with snake_case columns and defaults for null fields', async () => {
    const { client, from, insert } = makeInsertClient({ error: null })

    await logLGPDAccess(client, {
      leadId: 'lead-1',
      action: 'reveal_phone',
      legalBasis: 'legitimate_interest',
    })

    expect(from).toHaveBeenCalledWith('lgpd_audit_log')
    expect(insert).toHaveBeenCalledWith({
      user_id: null,
      lead_id: 'lead-1',
      listing_id: null,
      action: 'reveal_phone',
      legal_basis: 'legitimate_interest',
      evidence: {},
    })
  })

  it('passes through userId, listingId and evidence when provided', async () => {
    const { client, insert } = makeInsertClient({ error: null })

    await logLGPDAccess(client, {
      userId: 'user-9',
      leadId: 'lead-1',
      listingId: 'listing-7',
      action: 'export',
      legalBasis: 'consent',
      evidence: { source: 'admin_ui', n_records: 42 },
    })

    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-9',
      lead_id: 'lead-1',
      listing_id: 'listing-7',
      action: 'export',
      legal_basis: 'consent',
      evidence: { source: 'admin_ui', n_records: 42 },
    })
  })

  it('throws when insert returns an error', async () => {
    const { client } = makeInsertClient({ error: { message: 'permission denied' } })

    await expect(
      logLGPDAccess(client, {
        action: 'scrape',
        legalBasis: 'legitimate_interest',
      })
    ).rejects.toThrow(/logLGPDAccess failed: permission denied/)
  })
})

describe('logLGPDScrape', () => {
  it('invokes fn_lgpd_log_scrape RPC with mapped args', async () => {
    const { client, rpc } = makeRpcClient({ error: null })

    await logLGPDScrape(client, 'lead-1', 'listing-7', { portal: 'zap' })

    expect(rpc).toHaveBeenCalledWith('fn_lgpd_log_scrape', {
      p_lead_id: 'lead-1',
      p_listing_id: 'listing-7',
      p_evidence: { portal: 'zap' },
    })
  })

  it('passes null listingId through (Telegram / non-portal scrapes)', async () => {
    const { client, rpc } = makeRpcClient({ error: null })

    await logLGPDScrape(client, 'lead-1', null, { source: 'telegram_group_42' })

    expect(rpc).toHaveBeenCalledWith('fn_lgpd_log_scrape', {
      p_lead_id: 'lead-1',
      p_listing_id: null,
      p_evidence: { source: 'telegram_group_42' },
    })
  })

  it('throws when RPC returns error', async () => {
    const { client } = makeRpcClient({ error: { message: 'rpc not found' } })

    await expect(
      logLGPDScrape(client, 'lead-1', null, {})
    ).rejects.toThrow(/logLGPDScrape failed: rpc not found/)
  })
})

describe('listLeadAuditTrail', () => {
  it('selects audit fields filtered by lead_id ordered desc with default limit 50', async () => {
    const rows = [{ id: 'a1', action: 'reveal_phone' }]
    const { client, from, select, eq, order, limit } = makeSelectClient(rows)

    const result = await listLeadAuditTrail(client, 'lead-1')

    expect(from).toHaveBeenCalledWith('lgpd_audit_log')
    expect(select).toHaveBeenCalledWith(
      'id, action, legal_basis, evidence, timestamp, user_id'
    )
    expect(eq).toHaveBeenCalledWith('lead_id', 'lead-1')
    expect(order).toHaveBeenCalledWith('timestamp', { ascending: false })
    expect(limit).toHaveBeenCalledWith(50)
    expect(result).toEqual(rows)
  })

  it('respects custom limit', async () => {
    const { client, limit } = makeSelectClient([])

    await listLeadAuditTrail(client, 'lead-1', 5)

    expect(limit).toHaveBeenCalledWith(5)
  })

  it('returns [] when supabase returns null data', async () => {
    const { client } = makeSelectClient(null as unknown as unknown[])
    // makeSelectClient already returns data=null when rows arg is null
    const result = await listLeadAuditTrail(client, 'lead-1')
    expect(result).toEqual([])
  })

  it('throws on error', async () => {
    const { client } = makeSelectClient([], { message: 'rls blocked' })
    await expect(listLeadAuditTrail(client, 'lead-1')).rejects.toThrow(
      /listLeadAuditTrail failed: rls blocked/
    )
  })
})
