import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { OwnerLookupResponse } from '@/lib/schemas/owner-lookup'

// --- Mocks ANTES dos imports dos componentes ---

let mutateResult: OwnerLookupResponse | null = null
let mutateError: unknown = null
const postOwnerLookup = vi.fn().mockImplementation(async () => {
  if (mutateError) throw mutateError
  return mutateResult
})
const forgetMutate = vi.fn().mockResolvedValue(undefined)
const feedInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/hooks/useOwnerLookup', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useOwnerLookup')>()
  return {
    ...original,
    postOwnerLookup: (...args: unknown[]) => postOwnerLookup(...args),
    useForgetOwnerLookup: () => ({ mutateAsync: forgetMutate, isPending: false }),
  }
})

vi.mock('@/hooks/useEnrichedContactsByEdificio', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useEnrichedContactsByEdificio')>()
  return {
    ...original,
    useEnrichedContactsByEdificio: () => ({
      data: [
        {
          listing_id: 'sl-1',
          nome: 'Anunciante X',
          telefone: '11999998888',
          whatsapp: null,
          email: null,
          portal: 'zap',
          enriched_at: null,
        },
      ],
      isLoading: false,
    }),
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: feedInsert,
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  }),
}))

vi.mock('@/components/search/CaptarLeadModal', () => ({
  CaptarLeadModal: () => <div data-testid="captar-modal" />,
}))

import { OwnerLookupModal } from './OwnerLookupModal'
import { OwnerLookupMutationError } from '@/hooks/useOwnerLookup'

function makeResponse(overrides: Partial<OwnerLookupResponse> = {}): OwnerLookupResponse {
  return {
    lookup_id: 'l1',
    status: 'success',
    cache_hit: false,
    cache_age_days: 0,
    edificio_id: 'e1',
    sql_lote: '001.002.0003-4',
    matricula: 'M-123',
    nome_proprietario: 'Maria da Silva',
    cpf_cnpj_masked: '***.***.***-09',
    cartorio: '15º Cartório',
    data_matricula: '2018-03-01',
    ultima_transacao: null,
    custo_brl: 0.28,
    error_message: null,
    rate_remaining: 29,
    rate_reset_at: null,
    budget_used: 0.28,
    budget_limit: 60,
    ...overrides,
  }
}

const defaultProps = {
  edificioId: 'e1',
  edificioNome: 'Ed. Maracatins',
  endereco: 'Al. dos Maracatins, 100',
  consultantId: 'c1',
  onClose: vi.fn(),
}

function renderModal(props: Partial<typeof defaultProps> & { quiet?: boolean } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <OwnerLookupModal {...defaultProps} {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mutateResult = makeResponse()
  mutateError = null
})

describe('OwnerLookupModal', () => {
  it('sucesso: renderiza as 3 seções e o proprietário (AC3)', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByText('Maria da Silva')).toBeTruthy())
    expect(screen.getByText('Proprietário')).toBeTruthy()
    expect(screen.getByText(/Contatos enriquecidos/)).toBeTruthy()
    expect(screen.getByText('Próxima ação')).toBeTruthy()
    expect(screen.getByText('***.***.***-09')).toBeTruthy()
  })

  it('cache hit: badge com idade em dias (AC2)', async () => {
    mutateResult = makeResponse({ cache_hit: true, cache_age_days: 12 })
    renderModal()
    await waitFor(() => expect(screen.getByText('Dados de cache (12 dias)')).toBeTruthy())
  })

  it('not_found: mensagem amigável + link GeoSampa (AC4)', async () => {
    mutateResult = makeResponse({ status: 'not_found', nome_proprietario: null })
    renderModal()
    await waitFor(() =>
      expect(screen.getByText(/Cartório não localizou matrícula/)).toBeTruthy(),
    )
    expect(screen.getByText(/GeoSampa/)).toBeTruthy()
  })

  it('429: mensagem de limite por hora (AC4)', async () => {
    mutateError = new OwnerLookupMutationError(429, {
      error: 'rate_limit_exceeded',
      rate_reset_at: '2026-07-08T18:30:00Z',
    })
    renderModal()
    await waitFor(() => expect(screen.getByText(/Limite de 30 consultas\/hora/)).toBeTruthy())
  })

  it('402: mensagem de orçamento (AC4)', async () => {
    mutateError = new OwnerLookupMutationError(402, {
      error: 'budget_exceeded',
      budget_used: 60,
      budget_limit: 60,
    })
    renderModal()
    await waitFor(() => expect(screen.getByText(/Orçamento mensal/)).toBeTruthy())
  })

  it('rodapé LGPD com Esquecer dados em 2 passos (AC5)', async () => {
    renderModal()
    await waitFor(() => expect(screen.getByText('Esquecer dados')).toBeTruthy())
    fireEvent.click(screen.getByText('Esquecer dados'))
    fireEvent.click(screen.getByText('Sim, esquecer'))
    await waitFor(() => expect(forgetMutate).toHaveBeenCalledWith('l1'))
    expect(screen.getByText('Dados removidos.')).toBeTruthy()
  })

  it('dispara evento owner_lookup_aberto ao abrir (AC8)', async () => {
    renderModal()
    await waitFor(() => expect(feedInsert).toHaveBeenCalledTimes(1))
    expect(feedInsert.mock.calls[0][0]).toMatchObject({ tipo: 'owner_lookup_aberto' })
  })

  it('quiet=1 + cache hit: NÃO dispara evento (AC8)', async () => {
    mutateResult = makeResponse({ cache_hit: true, cache_age_days: 3 })
    renderModal({ quiet: true })
    await waitFor(() => expect(screen.getByText(/Dados de cache/)).toBeTruthy())
    expect(feedInsert).not.toHaveBeenCalled()
  })

  it('dialog acessível: role, aria-label e escape fecha (AC9)', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toContain('Ed. Maracatins')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
