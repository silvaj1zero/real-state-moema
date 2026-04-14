import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useFunnelStats, isRetrocesso } from './useFunnel'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/client'
const mockCreateClient = vi.mocked(createClient)

function makeErrorBuilder(msg = 'DB error') {
  const b: Record<string, unknown> = {}
  const c = () => b
  b.select = c; b.eq = c; b.order = c; b.not = c
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

describe('useFunnelStats — error propagation', () => {
  it('propagates Supabase error instead of returning empty stats', async () => {
    mockCreateClient.mockReturnValue({ from: () => makeErrorBuilder() } as unknown as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useFunnelStats('consultant-abc'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('Failed to fetch funnel stats')
  })

  it('returns empty stats when consultantId is null (not an error)', () => {
    const { result } = renderHook(() => useFunnelStats(null), {
      wrapper: makeWrapper(),
    })

    expect(result.current.stats.stages).toEqual([])
    expect(result.current.error).toBeNull()
  })
})

describe('isRetrocesso', () => {
  it('detects backward movement', () => {
    expect(isRetrocesso('v1_realizada', 'contato')).toBe(true)
  })

  it('recognizes forward movement as non-retrocesso', () => {
    expect(isRetrocesso('contato', 'v1_agendada')).toBe(false)
  })

  it('handles perdido correctly', () => {
    expect(isRetrocesso('representacao', 'perdido')).toBe(true)
  })
})
