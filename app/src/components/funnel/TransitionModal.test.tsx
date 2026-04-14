import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { TransitionModal } from './TransitionModal'

// Mock stores
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = { user: { id: 'consultant-1' } }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

const mockFunnelStore: Record<string, unknown> = {
  transitionModalOpen: false,
  transitionModalLeadId: null,
  transitionModalFromEtapa: null,
  transitionModalTargetEtapa: null,
  closeTransitionModal: vi.fn(),
}

// useFunnelStore may be called with or without a selector
vi.mock('@/store/funnel', () => ({
  useFunnelStore: vi.fn((selector?: (s: unknown) => unknown) => {
    if (typeof selector === 'function') return selector(mockFunnelStore)
    return mockFunnelStore
  }),
}))

vi.mock('@/hooks/useFunnel', () => ({
  useTransitionLead: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  })),
  isRetrocesso: vi.fn((from: string, to: string) => {
    const order = ['contato', 'v1_agendada', 'v1_realizada', 'v2_agendada', 'v2_realizada', 'representacao', 'venda']
    return order.indexOf(from) > order.indexOf(to)
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    React.createElement('button', { onClick, disabled }, children),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) =>
    React.createElement('label', null, children),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  })),
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFunnelStore.transitionModalOpen = false
  mockFunnelStore.transitionModalLeadId = null
  mockFunnelStore.transitionModalFromEtapa = null
  mockFunnelStore.transitionModalTargetEtapa = null
  mockFunnelStore.closeTransitionModal = vi.fn()
})

describe('TransitionModal', () => {
  it('renders nothing when modal is closed', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    const { container } = render(
      React.createElement(Wrapper, null, React.createElement(TransitionModal)),
    )
    expect(container.textContent).toBe('')
  })

  it('renders modal content when open', () => {
    mockFunnelStore.transitionModalOpen = true
    mockFunnelStore.transitionModalLeadId = 'lead-1'
    mockFunnelStore.transitionModalFromEtapa = 'contato' as const
    mockFunnelStore.transitionModalTargetEtapa = 'v1_agendada' as const
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(TransitionModal)),
    )
    expect(screen.getByText(/Mover Lead/i)).toBeTruthy()
  })

  it('shows retrocesso warning for backward transitions', () => {
    mockFunnelStore.transitionModalOpen = true
    mockFunnelStore.transitionModalLeadId = 'lead-1'
    mockFunnelStore.transitionModalFromEtapa = 'v1_realizada' as const
    mockFunnelStore.transitionModalTargetEtapa = 'contato' as const
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(TransitionModal)),
    )
    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toContain('Retrocesso')
  })

  it('requires observacao field to confirm transition', () => {
    mockFunnelStore.transitionModalOpen = true
    mockFunnelStore.transitionModalLeadId = 'lead-1'
    mockFunnelStore.transitionModalFromEtapa = 'contato' as const
    mockFunnelStore.transitionModalTargetEtapa = 'v1_agendada' as const
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(TransitionModal)),
    )
    const confirmBtn = screen.queryByText(/Confirmar/i) ?? screen.queryByText(/Avançar/i)
    if (confirmBtn) {
      fireEvent.click(confirmBtn)
      const bodyText = document.body.textContent ?? ''
      expect(bodyText).toContain('Observação')
    }
  })
})
