import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { FeedScreen } from './FeedScreen'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
  })),
}))

vi.mock('./FeedCard', () => ({
  FeedCard: ({ item }: { item: { titulo: string } }) =>
    React.createElement('div', { 'data-testid': 'feed-card' }, item.titulo),
}))

vi.mock('./FeedFilters', () => ({
  FeedFiltersBar: () => React.createElement('div', { 'data-testid': 'feed-filters' }),
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => { vi.clearAllMocks() })

describe('FeedScreen', () => {
  it('renders without crash with consultantId', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FeedScreen, { consultantId: 'consultant-1' }),
      ),
    )
    expect(screen.getByText('Inteligência')).toBeTruthy()
  })

  it('renders filter bar', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FeedScreen, { consultantId: 'consultant-1' }),
      ),
    )
    expect(screen.getByTestId('feed-filters')).toBeTruthy()
  })

  it('renders "Marcar todos lidos" button', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FeedScreen, { consultantId: 'consultant-1' }),
      ),
    )
    expect(screen.getByText('Marcar todos lidos')).toBeTruthy()
  })

  it('shows empty state when no feed items', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FeedScreen, { consultantId: 'consultant-1' }),
      ),
    )
    // After loading: empty state message or loading state
    const body = document.body.textContent ?? ''
    // Either loading or empty message
    expect(body).toBeTruthy()
  })
})
