import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { AcmScreen } from './AcmScreen'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ back: vi.fn(), push: vi.fn() })),
}))

vi.mock('@/store/acm', () => ({
  useAcmStore: vi.fn((selector) =>
    selector({
      filterType: 'todos',
      radiusOption: '500m',
      customRadius: 500,
      openAddSheet: vi.fn(),
    }),
  ),
  getEffectiveRadius: vi.fn(() => 500),
}))

vi.mock('@/hooks/useAcm', () => ({
  useComparaveis: vi.fn(() => ({
    comparaveis: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useScrapedInRadius: vi.fn(() => ({ scrapedListings: [] })),
  calculateAcmStats: vi.fn(() => ({
    mediaPrecoM2: 0,
    medianaPrecoM2: 0,
    totalComparaveis: 0,
  })),
}))

vi.mock('@/hooks/useDossie', () => ({
  useCreateDossie: vi.fn(() => vi.fn()),
}))

// Mock all child components
vi.mock('./AcmMiniMap', () => ({
  AcmMiniMap: () => React.createElement('div', { 'data-testid': 'acm-mini-map' }),
}))
vi.mock('./AcmFilterToggle', () => ({
  AcmFilterToggle: () => React.createElement('div', { 'data-testid': 'acm-filter-toggle' }),
  AcmFilterBadge: () => React.createElement('span', { 'data-testid': 'acm-filter-badge' }),
}))
vi.mock('./AcmRadiusSelector', () => ({
  AcmRadiusSelector: () => React.createElement('div', { 'data-testid': 'acm-radius-selector' }),
}))
vi.mock('./AcmSummaryCards', () => ({
  AcmSummaryCards: () => React.createElement('div', { 'data-testid': 'acm-summary-cards' }),
}))
vi.mock('./AcmTable', () => ({
  AcmTable: () => React.createElement('div', { 'data-testid': 'acm-table' }),
}))
vi.mock('./AcmExportMenu', () => ({
  AcmExportMenu: () => React.createElement('div', { 'data-testid': 'acm-export-menu' }),
}))
vi.mock('./AcmImportScraping', () => ({
  AcmImportScraping: () => React.createElement('div', { 'data-testid': 'acm-import-scraping' }),
}))
vi.mock('./AddComparableSheet', () => ({
  AddComparableSheet: () => React.createElement('div', { 'data-testid': 'add-comparable-sheet' }),
}))
vi.mock('@/components/ui/ErrorBanner', () => ({
  ErrorBanner: ({ error }: { error: unknown }) =>
    error
      ? React.createElement('div', { 'data-testid': 'error-banner' }, 'Erro ao carregar dados')
      : null,
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const defaultProps = {
  leadId: 'lead-1',
  leadNome: 'João Silva',
  edificioEndereco: 'Rua Teste, 123',
  edificioId: 'edif-1',
  lat: -23.5505,
  lng: -46.6333,
  consultantId: 'consultant-1',
}

beforeEach(() => { vi.clearAllMocks() })

describe('AcmScreen', () => {
  it('renders without crash with required props', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(AcmScreen, defaultProps)),
    )
    const body = document.body.textContent ?? ''
    expect(body).toBeTruthy()
  })

  it('renders lead name in header', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(AcmScreen, defaultProps)),
    )
    const body = document.body.textContent ?? ''
    expect(body).toContain('João Silva')
  })

  it('renders ACM child sections', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(AcmScreen, defaultProps)),
    )
    expect(screen.getByTestId('acm-summary-cards')).toBeTruthy()
    expect(screen.getByTestId('acm-table')).toBeTruthy()
  })

  it('does not show error banner when comparaveis load successfully', () => {
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(AcmScreen, defaultProps)),
    )
    expect(screen.queryByTestId('error-banner')).toBeNull()
  })

  it('shows error banner when comparaveis fail to load', async () => {
    const { useComparaveis } = await import('@/hooks/useAcm')
    vi.mocked(useComparaveis).mockReturnValueOnce({
      comparaveis: [],
      isLoading: false,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
    })
    const { Wrapper } = { Wrapper: makeWrapper() }
    render(
      React.createElement(Wrapper, null, React.createElement(AcmScreen, defaultProps)),
    )
    expect(screen.getByTestId('error-banner')).toBeTruthy()
  })
})
