import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useBuildings } from './useBuildings'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock zustand map store to provide epicenter
vi.mock('@/store/map', () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      epicenter: { lat: -23.605, lng: -46.675 },
      activeRadius: 2000,
    }
    return selector(state)
  }),
}))

import { createClient } from '@/lib/supabase/client'
const mockCreateClient = vi.mocked(createClient)

function makeErrorBuilder(msg = 'Fetch failed') {
  const b: Record<string, unknown> = {}
  const c = () => b
  b.select = c; b.eq = c; b.order = c; b.limit = c
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

describe('useBuildings — error propagation', () => {
  it('propagates Supabase error instead of returning []', async () => {
    mockCreateClient.mockReturnValue({ from: () => makeErrorBuilder() } as ReturnType<typeof createClient>)

    const { result } = renderHook(() => useBuildings(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBeInstanceOf(Error)
    expect((result.current.error as Error).message).toContain('Failed to fetch buildings')
    expect(result.current.buildings).toEqual([])
  })
})
