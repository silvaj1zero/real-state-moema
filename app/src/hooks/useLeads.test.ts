import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useLeadsByEdificio, useLeadsByFunnel } from './useLeads'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'
const mockCreateClient = vi.mocked(createClient)

function makeErrorBuilder(msg = 'Connection failed') {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = chain
  builder.eq = chain
  builder.order = chain
  builder.not = chain
  builder.range = chain
  builder.limit = chain
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: null, error: { message: msg, code: '503' } }).then(resolve)
  return builder
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useLeadsByEdificio — error propagation', () => {
  it('propagates Supabase error instead of returning []', async () => {
    mockCreateClient.mockReturnValue({ from: () => makeErrorBuilder() } as unknown as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useLeadsByEdificio('edificio-123'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('Failed to fetch leads by edificio')
    expect(result.current.leads).toEqual([])
  })

  it('returns empty array when edificioId is null (not an error)', () => {
    const { result } = renderHook(() => useLeadsByEdificio(null), {
      wrapper: makeWrapper(),
    })

    expect(result.current.leads).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useLeadsByFunnel — error propagation', () => {
  it('propagates Supabase error instead of returning []', async () => {
    const errorBuilder = makeErrorBuilder('Network error')
    const supabaseBuilder: Record<string, unknown> = {}
    const chain = () => supabaseBuilder
    supabaseBuilder.select = chain
    supabaseBuilder.eq = chain
    supabaseBuilder.order = chain
    supabaseBuilder.not = chain
    supabaseBuilder.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: null, error: { message: 'Network error', code: '503' } }).then(resolve)

    mockCreateClient.mockReturnValue({ from: () => supabaseBuilder } as unknown as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useLeadsByFunnel('consultant-abc'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('Failed to fetch leads by funnel')
    expect(result.current.leads).toEqual([])
  })

  it('returns empty array when consultantId is null (not an error)', () => {
    const { result } = renderHook(() => useLeadsByFunnel(null), {
      wrapper: makeWrapper(),
    })

    expect(result.current.leads).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
