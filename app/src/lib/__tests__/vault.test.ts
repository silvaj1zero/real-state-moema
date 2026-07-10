/**
 * Vault wrapper tests — Story 7.10 AC2.
 *
 * Cobre: input validation (campo invalido, plaintext vazio), roundtrip happy
 * path com mock RPC, null-safety quando RPC retorna null, propagacao de erro.
 *
 * Nao testa contra Vault real — wrapper depende de SECURITY DEFINER RPCs
 * (`fn_store_lead_pii`, `fn_decrypt_lead_pii`) que vivem na migration 014.
 * Validacao end-to-end em local Supabase fica documentada em
 * docs/poc/7.10-lgpd-smoke.md (executada por @qa).
 */

import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  storeLeadPII,
  getLeadPII,
  storeLeadPIIBatch,
  type LeadPIIField,
} from '@/lib/vault'

function makeClient(rpcImpl: (name: string, args: unknown) => unknown): SupabaseClient {
  return {
    rpc: vi.fn(rpcImpl as never),
  } as unknown as SupabaseClient
}

describe('storeLeadPII', () => {
  it('rejects invalid field name', async () => {
    const client = makeClient(() => ({ data: null, error: null }))
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storeLeadPII(client, 'lead-1', 'cpf' as any, '11999998888')
    ).rejects.toThrow(/invalid field/)
  })

  it('rejects empty plaintext', async () => {
    const client = makeClient(() => ({ data: null, error: null }))
    await expect(
      storeLeadPII(client, 'lead-1', 'telefone', '   ')
    ).rejects.toThrow(/plaintext is required/)
  })

  it('returns secret UUID from RPC on success', async () => {
    const FAKE_UUID = '11111111-1111-1111-1111-111111111111'
    const rpc = vi.fn(() => ({ data: FAKE_UUID, error: null }))
    const client = { rpc } as unknown as SupabaseClient

    const result = await storeLeadPII(client, 'lead-1', 'telefone', '11999998888')

    expect(result).toBe(FAKE_UUID)
    expect(rpc).toHaveBeenCalledWith('fn_store_lead_pii', {
      p_lead_id: 'lead-1',
      p_field: 'telefone',
      p_plaintext: '11999998888',
    })
  })

  it('throws when RPC returns an error', async () => {
    const rpc = vi.fn(() => ({ data: null, error: { message: 'rls denied' } }))
    const client = { rpc } as unknown as SupabaseClient

    await expect(
      storeLeadPII(client, 'lead-1', 'email', 'foo@example.com')
    ).rejects.toThrow(/storeLeadPII failed: rls denied/)
  })
})

describe('getLeadPII', () => {
  it('returns plaintext from RPC', async () => {
    const rpc = vi.fn(() => ({ data: '11999998888', error: null }))
    const client = { rpc } as unknown as SupabaseClient

    const result = await getLeadPII(client, 'lead-1', 'telefone')

    expect(result).toBe('11999998888')
    expect(rpc).toHaveBeenCalledWith('fn_decrypt_lead_pii', {
      p_lead_id: 'lead-1',
      p_field: 'telefone',
    })
  })

  it('returns null when RPC returns null (no secret_id captured)', async () => {
    const rpc = vi.fn(() => ({ data: null, error: null }))
    const client = { rpc } as unknown as SupabaseClient

    const result = await getLeadPII(client, 'lead-1', 'email')

    expect(result).toBeNull()
  })

  it('rejects invalid field name before hitting RPC', async () => {
    const rpc = vi.fn(() => ({ data: null, error: null }))
    const client = { rpc } as unknown as SupabaseClient

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getLeadPII(client, 'lead-1', 'cpf' as any)
    ).rejects.toThrow(/invalid field/)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('propagates RPC error message', async () => {
    const rpc = vi.fn(() => ({ data: null, error: { message: 'lead opted out' } }))
    const client = { rpc } as unknown as SupabaseClient

    await expect(getLeadPII(client, 'lead-1', 'telefone')).rejects.toThrow(
      /getLeadPII failed: lead opted out/
    )
  })
})

describe('storeLeadPIIBatch', () => {
  it('calls storeLeadPII for each defined field, skipping undefined/empty', async () => {
    const FAKE_UUID = '22222222-2222-2222-2222-222222222222'
    const rpc = vi.fn((_fn: string, _params: Record<string, unknown>) => ({
      data: FAKE_UUID,
      error: null,
    }))
    const client = { rpc } as unknown as SupabaseClient

    await storeLeadPIIBatch(client, 'lead-1', {
      telefone: '11999998888',
      email: 'foo@example.com',
      whatsapp: undefined,
      nome: '',
    } as Partial<Record<LeadPIIField, string>>)

    // Only telefone + email should hit RPC (whatsapp undef, nome empty).
    expect(rpc).toHaveBeenCalledTimes(2)
    const fields = rpc.mock.calls.map((c) => (c[1] as { p_field: string }).p_field)
    expect(fields.sort()).toEqual(['email', 'telefone'])
  })

  it('is a no-op when no fields provided', async () => {
    const rpc = vi.fn(() => ({ data: null, error: null }))
    const client = { rpc } as unknown as SupabaseClient

    await storeLeadPIIBatch(client, 'lead-1', {})

    expect(rpc).not.toHaveBeenCalled()
  })
})
