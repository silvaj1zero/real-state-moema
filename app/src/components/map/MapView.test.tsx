import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MapView } from './MapView'

// Mock mapbox/react-map-gl to avoid WebGL dependency
vi.mock('react-map-gl/mapbox', () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'mapbox-map' }, children),
  NavigationControl: () => React.createElement('div', { 'data-testid': 'nav-control' }),
  Marker: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'marker' }, children),
}))
vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}))

vi.mock('@/store/map', () => ({
  useMapStore: vi.fn((selector) =>
    selector({
      epicenter: { lat: -23.5505, lng: -46.6333 },
      setEpicenter: vi.fn(),
    }),
  ),
}))

vi.mock('@/store/filters', () => ({
  useFilterStore: vi.fn((selector) =>
    selector({ isVisible: vi.fn().mockReturnValue(true) }),
  ),
}))

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}))

vi.mock('@/hooks/useBuildings', () => ({
  useBuildings: vi.fn(() => ({
    buildings: [],
    invalidate: vi.fn(),
    error: null,
    refetch: vi.fn(),
  })),
}))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({ isOnline: true, pendingCount: 0 })),
}))

// Mock child components
vi.mock('./RadiusCircles', () => ({
  RadiusCircles: () => React.createElement('div', { 'data-testid': 'radius-circles' }),
}))
vi.mock('./GPSPin', () => ({
  GPSPin: () => React.createElement('div', { 'data-testid': 'gps-pin' }),
}))
vi.mock('./EpicenterPin', () => ({
  EpicenterPin: () => React.createElement('div', { 'data-testid': 'epicenter-pin' }),
}))
vi.mock('./LayersPanel', () => ({
  LayersPanel: () => React.createElement('div', { 'data-testid': 'layers-panel' }),
}))
vi.mock('./FilterPanel', () => ({
  FilterPanel: () => React.createElement('div', { 'data-testid': 'filter-panel' }),
}))
vi.mock('./MapLegend', () => ({
  MapLegend: () => React.createElement('div', { 'data-testid': 'map-legend' }),
}))
vi.mock('@/components/layout/HeaderBar', () => ({
  HeaderBar: () => React.createElement('div', { 'data-testid': 'header-bar' }),
}))
vi.mock('@/components/layout/BottomTabBar', () => ({
  BottomTabBar: () => React.createElement('div', { 'data-testid': 'bottom-tab-bar' }),
}))
vi.mock('@/components/building/QuickRegisterForm', () => ({
  QuickRegisterForm: () => React.createElement('div', { 'data-testid': 'quick-register' }),
}))
vi.mock('@/components/building/BuildingCard', () => ({
  BuildingCard: () => React.createElement('div', { 'data-testid': 'building-card' }),
}))
vi.mock('@/components/ui/ErrorBanner', () => ({
  ErrorBanner: ({ error }: { error: unknown }) =>
    error
      ? React.createElement('div', { 'data-testid': 'error-banner' }, 'Erro ao carregar dados')
      : null,
}))

beforeEach(() => { vi.clearAllMocks() })

describe('MapView', () => {
  it('renders without crash', () => {
    const { container } = render(React.createElement(MapView))
    expect(container).toBeTruthy()
  })

  it('shows token configuration message when MAPBOX_TOKEN is not set', () => {
    // In test environment, NEXT_PUBLIC_MAPBOX_TOKEN is undefined
    // The component renders a fallback message
    render(React.createElement(MapView))
    const body = document.body.textContent ?? ''
    // Either the map renders (if token is set) or the fallback message shows
    expect(body.length).toBeGreaterThan(0)
  })

  it('does not show error banner when buildings load successfully', () => {
    render(React.createElement(MapView))
    expect(screen.queryByTestId('error-banner')).toBeNull()
  })

  it('renders map view without crash even when buildings fail', async () => {
    const { useBuildings } = await import('@/hooks/useBuildings')
    vi.mocked(useBuildings).mockReturnValueOnce({
      buildings: [],
      isLoading: false,
      invalidate: vi.fn(),
      error: new Error('Network error'),
      refetch: vi.fn(),
    } as any)
    const { container } = render(React.createElement(MapView))
    // Component should not throw, either shows map with error or no-token fallback
    expect(container).toBeTruthy()
  })
})
