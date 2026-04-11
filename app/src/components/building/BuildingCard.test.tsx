import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { BuildingCard } from './BuildingCard'
import type { EdificioWithQualificacao } from '@/lib/supabase/types'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}))

function makeBuilding(overrides: Partial<EdificioWithQualificacao> = {}): EdificioWithQualificacao {
  return {
    id: 'b-1',
    nome: 'Edifício Teste',
    endereco: 'Rua das Flores, 100',
    coordinates: null,
    lat: -23.605,
    lng: -46.675,
    total_units: 40,
    num_pavimentos: 12,
    ano_construcao: 2005,
    tipologia: 'residencial_vertical',
    padrao: 'medio',
    abertura_corretores: 'desconhecido',
    seed_source: null,
    seed_source_secondary: null,
    area_construida: null,
    padrao_iptu: null,
    tipo_uso_iptu: null,
    sql_lote: null,
    edited_fields: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    edificios_qualificacoes: [],
    ...overrides,
  } as EdificioWithQualificacao
}

beforeEach(() => { vi.clearAllMocks() })

describe('BuildingCard', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      React.createElement(BuildingCard, {
        building: makeBuilding(),
        isOpen: false,
        onClose: vi.fn(),
        onUpdate: vi.fn(),
      }),
    )
    // When closed, card content should not be visible
    expect(container.textContent).not.toContain('Edifício Teste')
  })

  it('renders building name when isOpen is true', () => {
    render(
      React.createElement(BuildingCard, {
        building: makeBuilding(),
        isOpen: true,
        onClose: vi.fn(),
        onUpdate: vi.fn(),
      }),
    )
    expect(screen.getByText('Edifício Teste')).toBeTruthy()
  })

  it('renders building address', () => {
    render(
      React.createElement(BuildingCard, {
        building: makeBuilding(),
        isOpen: true,
        onClose: vi.fn(),
        onUpdate: vi.fn(),
      }),
    )
    expect(screen.getByText('Rua das Flores, 100')).toBeTruthy()
  })

  it('shows "Não Visitado" status when qualificação has nao_visitado status', () => {
    render(
      React.createElement(BuildingCard, {
        building: makeBuilding({
          edificios_qualificacoes: [
            {
              id: 'q-1',
              edificio_id: 'b-1',
              consultant_id: 'c-1',
              status_varredura: 'nao_visitado',
              is_fisbo_detected: false,
              notas: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as EdificioWithQualificacao['edificios_qualificacoes'],
        }),
        isOpen: true,
        onClose: vi.fn(),
        onUpdate: vi.fn(),
      }),
    )
    expect(screen.getByText('Não Visitado')).toBeTruthy()
  })

  it('shows qualificação status when present', () => {
    const building = makeBuilding({
      edificios_qualificacoes: [
        {
          id: 'q-1',
          edificio_id: 'b-1',
          consultant_id: 'c-1',
          status_varredura: 'mapeado',
          is_fisbo_detected: false,
          notas: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ] as EdificioWithQualificacao['edificios_qualificacoes'],
    })
    render(
      React.createElement(BuildingCard, {
        building,
        isOpen: true,
        onClose: vi.fn(),
        onUpdate: vi.fn(),
      }),
    )
    expect(screen.getByText('Mapeado')).toBeTruthy()
  })
})
