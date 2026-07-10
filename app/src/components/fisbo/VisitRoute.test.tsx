import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { VisitRoute as VisitRouteType } from '@/lib/fisbo/routeOrder'
import type { RouteStop } from '@/lib/fisbo/routeOrder'

// --- Mocks ------------------------------------------------------------------

let mockRoute: VisitRouteType = { ordered: [], semCoord: [], hasOrigin: true }
let mockTotal = 0

vi.mock('@/hooks/useGeolocation', () => ({ useGeolocation: () => {} }))

vi.mock('@/store/map', () => ({
  useMapStore: (selector: (s: unknown) => unknown) =>
    selector({
      userLocation: { lat: -23.6, lng: -46.66 },
      epicenter: { lat: -23.605, lng: -46.675 },
    }),
}))

vi.mock('@/hooks/useVisitRoute', () => ({
  useVisitRoute: () => ({ route: mockRoute, total: mockTotal, isLoading: false, error: null }),
}))

vi.mock('@/lib/acm/pdf/staticMap', () => ({
  buildStaticMapUrl: () => null, // sem token no teste → sem mapa
}))

import { VisitRoute } from './VisitRoute'

function makeStop(overrides: Partial<RouteStop> = {}): RouteStop {
  return {
    listingId: 'l1',
    leadId: 'lead-1',
    nome: 'João Proprietário',
    endereco: 'Rua A, 100',
    bairro: 'Moema',
    telefone: '11999990000',
    whatsapp: '11999990000',
    preco: 1_000_000,
    precoM2: 10_000,
    lat: -23.601,
    lng: -46.661,
    contatoStatus: 'agendado',
    contatoNotas: null,
    lastSeenAt: null,
    semContato: false,
    distanciaM: 250,
    numero: 1,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRoute = { ordered: [], semCoord: [], hasOrigin: true }
  mockTotal = 0
})

describe('VisitRoute', () => {
  it('renderiza cabeçalho e seletores (AC1)', () => {
    render(<VisitRoute consultantId="c1" />)
    expect(screen.getByText('Roteiro de visitas')).toBeTruthy()
    expect(screen.getByLabelText('Ponto de partida')).toBeTruthy()
    expect(screen.getByLabelText('Modo de visão')).toBeTruthy()
  })

  it('estado vazio orienta o usuário', () => {
    render(<VisitRoute consultantId="c1" />)
    expect(screen.getByText(/Nenhum alvo no roteiro/i)).toBeTruthy()
  })

  it('lista paradas numeradas com distância (AC2)', () => {
    mockRoute = { ordered: [makeStop(), makeStop({ listingId: 'l2', numero: 2, distanciaM: 1500, nome: 'Maria' })], semCoord: [], hasOrigin: true }
    mockTotal = 2
    render(<VisitRoute consultantId="c1" />)
    expect(screen.getByText('João Proprietário')).toBeTruthy()
    expect(screen.getByText('250 m')).toBeTruthy()
    expect(screen.getByText('1.5 km')).toBeTruthy()
  })

  it('agrupa por bairro quando a visão é "Por bairro" (AC3)', () => {
    mockRoute = {
      ordered: [
        makeStop({ listingId: 'a', bairro: 'Moema', numero: 1 }),
        makeStop({ listingId: 'b', bairro: 'Vila Mariana', numero: 2, nome: 'Ana' }),
      ],
      semCoord: [],
      hasOrigin: true,
    }
    mockTotal = 2
    render(<VisitRoute consultantId="c1" />)
    fireEvent.change(screen.getByLabelText('Modo de visão'), { target: { value: 'bairro' } })
    expect(screen.getByText('Vila Mariana')).toBeTruthy()
    // "Moema" aparece como cabeçalho de grupo
    expect(screen.getAllByText(/Moema/).length).toBeGreaterThan(0)
  })
})
