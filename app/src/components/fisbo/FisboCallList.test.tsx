import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { CallListItem } from '@/lib/fisbo/callListOrder'

// --- Mocks dos hooks de dados (smoke isola a UI) ---------------------------

const registerMutate = vi.fn().mockResolvedValue({ leadId: 'lead-1', etapaFunil: 'contato' })
const enrichMutate = vi.fn()
const onAfterRegister = vi.fn().mockResolvedValue(undefined)

let mockItems: CallListItem[] = []
let mockState = { isLoading: false, error: null as unknown }

vi.mock('@/hooks/useFisboCallList', () => ({
  useFisboCallList: () => ({
    items: mockItems,
    bairros: ['Moema', 'Vila Mariana'],
    total: mockItems.length,
    isLoading: mockState.isLoading,
    error: mockState.error,
    refetch: vi.fn(),
  }),
  useRegisterContatoStatus: () => ({ mutateAsync: registerMutate, isPending: false }),
}))

vi.mock('@/hooks/useContactEnrichment', () => ({
  useEnrichContact: () => ({ mutate: enrichMutate, isPending: false }),
}))

vi.mock('@/components/fisbo/useCallListBridge', () => ({
  useRegisterContatoStatusBridge: () => ({ onAfterRegister }),
}))

vi.mock('@/components/scheduling/ScheduleModal', () => ({
  ScheduleModal: () => null,
}))

import { FisboCallList } from './FisboCallList'

function makeItem(overrides: Partial<CallListItem> = {}): CallListItem {
  return {
    listingId: 'l1',
    leadId: null,
    nome: 'João Proprietário',
    endereco: 'Rua A, 100',
    bairro: 'Moema',
    telefone: '11999990000',
    whatsapp: '11999990000',
    preco: 1_000_000,
    precoM2: 10_000,
    lat: null,
    lng: null,
    contatoStatus: 'nao_contatado',
    contatoNotas: null,
    lastSeenAt: null,
    semContato: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItems = []
  mockState = { isLoading: false, error: null }
})

describe('FisboCallList', () => {
  it('renderiza o título e os filtros', () => {
    render(<FisboCallList consultantId="c1" />)
    expect(screen.getByText('Call list FISBO')).toBeTruthy()
    expect(screen.getByLabelText('Filtrar por bairro')).toBeTruthy()
    expect(screen.getByLabelText('Filtrar por status')).toBeTruthy()
  })

  it('mostra estado vazio sem itens', () => {
    render(<FisboCallList consultantId="c1" />)
    expect(screen.getByText(/Nenhum FISBO para ligar/i)).toBeTruthy()
  })

  it('renderiza um item com nome, WhatsApp e botões de status', () => {
    mockItems = [makeItem()]
    render(<FisboCallList consultantId="c1" />)
    expect(screen.getByText('João Proprietário')).toBeTruthy()
    expect(screen.getByText('WhatsApp')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Atendeu/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Agendado/ })).toBeTruthy()
  })

  it('registra status com 1 toque e dispara a ponte do funil (AC3/AC5)', async () => {
    mockItems = [makeItem()]
    render(<FisboCallList consultantId="c1" />)
    fireEvent.click(screen.getByRole('button', { name: /Agendado/ }))
    expect(registerMutate).toHaveBeenCalledOnce()
    const arg = registerMutate.mock.calls[0][0]
    expect(arg.status).toBe('agendado')
    expect(arg.consultantId).toBe('c1')
  })

  it('degrada graciosamente: sem contato mostra "Enriquecer" (AC6)', () => {
    mockItems = [makeItem({ telefone: null, whatsapp: null, semContato: true })]
    render(<FisboCallList consultantId="c1" />)
    expect(screen.getByText('Sem contato')).toBeTruthy()
    const btn = screen.getByText('Enriquecer')
    fireEvent.click(btn)
    expect(enrichMutate).toHaveBeenCalledWith('l1')
  })
})
