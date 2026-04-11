import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useReferrals } from './useReferrals'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/client'
const mockCreateClient = vi.mocked(createClient)

function makeErrorBuilder(msg = 'DB error') {
  const b: Record<string, unknown> = {}
  const c = () => b
  b.select = c; b.eq = c; b.order = c
  b.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: null, error: { message: msg } }).then(resolve)
  return b
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => { vi.resetAllMocks() })

describe('useReferrals — error propagation', () => {
  it('propagates Supabase error instead of returning []', async () => {
    mockCreateClient.mockReturnValue({ from: () => makeErrorBuilder() } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useReferrals('consultant-abc'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('Failed to fetch referrals')
    expect(result.current.referrals).toEqual([])
  })

  it('returns [] for null consultantId without error', () => {
    const { result } = renderHook(() => useReferrals(null), {
      wrapper: makeWrapper(),
    })

    expect(result.current.referrals).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
