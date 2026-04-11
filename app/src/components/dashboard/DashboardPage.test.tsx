import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { DashboardPage } from './DashboardPage'

// useAuthStore may be called with or without a selector
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = { user: { id: 'consultant-1' } }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('@/hooks/useDashboard', () => ({
  useDashboardKPIs: vi.fn(() => ({
    kpis: null,
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock child components to isolate DashboardPage logic
vi.mock('./TerritorialSection', () => ({
  TerritorialSection: () => React.createElement('div', { 'data-testid': 'territorial' }),
}))
vi.mock('./FunnelSection', () => ({
  FunnelSection: () => React.createElement('div', { 'data-testid': 'funnel-section' }),
}))
vi.mock('./MetaDiaria', () => ({
  MetaDiaria: () => React.createElement('div', { 'data-testid': 'meta-diaria' }),
}))
vi.mock('./InformantesSection', () => ({
  InformantesSection: () => React.createElement('div', { 'data-testid': 'informantes' }),
}))
vi.mock('./FrogSection', () => ({
  FrogSection: () => React.createElement('div', { 'data-testid': 'frog' }),
}))
vi.mock('./UpcomingSection', () => ({
  UpcomingSection: () => React.createElement('div', { 'data-testid': 'upcoming' }),
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

beforeEach(() => { vi.clearAllMocks() })

describe('DashboardPage', () => {
  it('renders without crash', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(DashboardPage)))
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })

  it('renders period selector buttons', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(DashboardPage)))
    expect(screen.getByText('Semana')).toBeTruthy()
    expect(screen.getByText('Mês')).toBeTruthy()
    expect(screen.getByText('Trimestre')).toBeTruthy()
  })

  it('renders all main sections', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(DashboardPage)))
    expect(screen.getByTestId('territorial')).toBeTruthy()
    expect(screen.getByTestId('funnel-section')).toBeTruthy()
    expect(screen.getByTestId('meta-diaria')).toBeTruthy()
    expect(screen.getByTestId('informantes')).toBeTruthy()
  })

  it('shows Mês as default period', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(React.createElement(Wrapper, null, React.createElement(DashboardPage)))
    const mesButton = screen.getByText('Mês')
    // The active button should have the blue color class
    expect(mesButton.className).toContain('bg-[#003DA5]')
  })
})
