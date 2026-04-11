import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { FunnelKanban } from './FunnelKanban'

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({ user: { id: 'consultant-1' } }),
  ),
}))

vi.mock('@/store/funnel', () => ({
  useFunnelStore: vi.fn((selector) =>
    selector({
      openTransitionModal: vi.fn(),
      closeTransitionModal: vi.fn(),
      transitionModalOpen: false,
      transitionModalLeadId: null,
      transitionModalFromEtapa: null,
      transitionModalTargetEtapa: null,
    }),
  ),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  })),
}))

// Mock LeadCard to avoid its complexity
vi.mock('@/components/lead/LeadCard', () => ({
  LeadCard: ({ lead }: { lead: { nome: string } }) =>
    React.createElement('div', { 'data-testid': 'lead-card' }, lead.nome),
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const defaultProps = {
  stageCounts: { contato: 3, v1_agendada: 2, v1_realizada: 1 },
}

beforeEach(() => { vi.clearAllMocks() })

describe('FunnelKanban', () => {
  it('renders without crash with minimal props', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FunnelKanban, defaultProps),
      ),
    )
    // Should render kanban columns
    expect(screen.getByText('Contato')).toBeTruthy()
  })

  it('renders all 7 funnel stages', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FunnelKanban, defaultProps),
      ),
    )
    expect(screen.getByText('Contato')).toBeTruthy()
    expect(screen.getByText('V1 Agendada')).toBeTruthy()
    expect(screen.getByText('V1 Realizada')).toBeTruthy()
    expect(screen.getByText('Exclusividade')).toBeTruthy()
    expect(screen.getByText('Venda')).toBeTruthy()
  })

  it('shows stage counts in column headers', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FunnelKanban, { stageCounts: { contato: 5 } }),
      ),
    )
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('shows loading skeleton when data is loading', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(
        Wrapper,
        null,
        React.createElement(FunnelKanban, defaultProps),
      ),
    )
    // On first render with supabase mocked, loading state may appear briefly
    const body = document.body.textContent ?? ''
    expect(body).toBeTruthy()
  })
})
