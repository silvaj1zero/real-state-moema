import { describe, it, expect, vi } from 'vitest'
import type { OwnerLookup } from '@/lib/supabase/types'
import type { InfosimplesResult } from '@/lib/infosimples'
import {
  executeOwnerLookup,
  ownerLookupConfigFromEnv,
  type OwnerLookupConfig,
  type OwnerLookupStore,
} from './owner-lookup-service'

const NOW = new Date('2026-07-08T12:00:00Z')
const CONSULTANT = 'c0000000-0000-0000-0000-000000000001'
const EDIFICIO = 'e0000000-0000-0000-0000-000000000001'

function makeRow(overrides: Partial<OwnerLookup> = {}): OwnerLookup {
  return {
    id: 'l0000000-0000-0000-0000-000000000001',
    consultant_id: CONSULTANT,
    edificio_id: EDIFICIO,
    sql_lote: '001.002.0003-4',
    endereco: 'Al. dos Maracatins, 100',
    matricula: 'M-123',
    nome_proprietario: 'Maria da Silva',
    cpf_cnpj_masked: '***.***.***-09',
    cartorio: '15o Cartorio',
    data_matricula: '2018-03-01',
    ultima_transacao: '2018-03-01',
    fonte: 'infosimples',
    custo_brl: 0.28,
    raw_response: null,
    status: 'success',
    error_message: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  }
}

function makeStore(overrides: Partial<OwnerLookupStore> = {}): OwnerLookupStore {
  return {
    findCached: vi.fn().mockResolvedValue(null),
    getRateWindow: vi.fn().mockResolvedValue({ count: 0, oldestAt: null }),
    sumCostCurrentMonth: vi.fn().mockResolvedValue(0),
    resolveEdificio: vi.fn().mockResolvedValue({ sqlLote: '001.002.0003-4', endereco: 'Al. X, 1' }),
    insertLookup: vi.fn().mockImplementation(async (row) => makeRow(row as Partial<OwnerLookup>)),
    insertFeedEvent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const CONFIG_ON: OwnerLookupConfig = { enabled: true, rateLimit: 30, budgetBrl: 60, costBrl: 0.28 }
const CONFIG_OFF: OwnerLookupConfig = { ...CONFIG_ON, enabled: false }

const SUCCESS: InfosimplesResult = {
  status: 'success',
  matricula: 'M-123',
  nome_proprietario: 'Maria da Silva',
  cpf_cnpj_masked: '***.***.***-09',
  cartorio: '15o Cartorio',
  data_matricula: '2018-03-01',
  ultima_transacao: null,
  raw: { code: 200 },
}

function deps(store: OwnerLookupStore, config: OwnerLookupConfig, result: InfosimplesResult = SUCCESS) {
  return {
    store,
    consultar: vi.fn().mockResolvedValue(result),
    config,
    now: () => NOW,
  }
}

describe('ownerLookupConfigFromEnv', () => {
  it('defaults dos ACs 4/5 com env vazio', () => {
    const c = ownerLookupConfigFromEnv({})
    expect(c).toEqual({ enabled: false, rateLimit: 30, budgetBrl: 60, costBrl: 0.28 })
  })

  it('env sobrescreve limites', () => {
    const c = ownerLookupConfigFromEnv({
      OWNER_LOOKUP_ENABLED: 'true',
      INFOSIMPLES_TOKEN: 't',
      OWNER_LOOKUP_RATE_LIMIT: '10',
      OWNER_LOOKUP_BUDGET_BRL: '20.5',
    })
    expect(c).toEqual({ enabled: true, rateLimit: 10, budgetBrl: 20.5, costBrl: 0.28 })
  })
})

describe('executeOwnerLookup — cache 90d (AC6)', () => {
  it('cache hit retorna sem consultar API, custo 0 e idade em dias', async () => {
    const cachedAt = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const store = makeStore({
      findCached: vi.fn().mockResolvedValue(makeRow({ created_at: cachedAt })),
    })
    const d = deps(store, CONFIG_OFF) // flag OFF: cache deve funcionar mesmo assim
    const out = await executeOwnerLookup({ consultantId: CONSULTANT, edificioId: EDIFICIO }, d)

    expect(out.kind).toBe('ok')
    if (out.kind === 'ok') {
      expect(out.httpStatus).toBe(200)
      expect(out.body.cache_hit).toBe(true)
      expect(out.body.cache_age_days).toBe(10)
      expect(out.body.custo_brl).toBe(0)
    }
    expect(d.consultar).not.toHaveBeenCalled()
    expect(store.insertLookup).not.toHaveBeenCalled()
  })

  it('cache miss com flag OFF → disabled sem consumo (fronteira)', async () => {
    const store = makeStore()
    const d = deps(store, CONFIG_OFF)
    const out = await executeOwnerLookup({ consultantId: CONSULTANT, edificioId: EDIFICIO }, d)

    expect(out.kind).toBe('disabled')
    expect(d.consultar).not.toHaveBeenCalled()
    expect(store.insertLookup).not.toHaveBeenCalled()
  })
})

describe('executeOwnerLookup — rate limit (AC4)', () => {
  it('30/30 na janela → rate_limited com Retry-After derivado do mais antigo', async () => {
    const oldest = new Date(NOW.getTime() - 50 * 60 * 1000).toISOString() // 50min atras
    const store = makeStore({
      getRateWindow: vi.fn().mockResolvedValue({ count: 30, oldestAt: oldest }),
    })
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, edificioId: EDIFICIO },
      deps(store, CONFIG_ON),
    )

    expect(out.kind).toBe('rate_limited')
    if (out.kind === 'rate_limited') {
      expect(out.retryAfterSeconds).toBe(600) // faltam 10min p/ o mais antigo sair da janela
      expect(out.usage.rate_remaining).toBe(0)
    }
  })

  it('cache hit ignora rate limit (nao gasta janela)', async () => {
    const store = makeStore({
      getRateWindow: vi.fn().mockResolvedValue({ count: 30, oldestAt: NOW.toISOString() }),
      findCached: vi.fn().mockResolvedValue(makeRow()),
    })
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, edificioId: EDIFICIO },
      deps(store, CONFIG_ON),
    )
    expect(out.kind).toBe('ok')
  })
})

describe('executeOwnerLookup — budget guard (AC5)', () => {
  it('budget estourado → budget_exceeded com consumo atual', async () => {
    const store = makeStore({ sumCostCurrentMonth: vi.fn().mockResolvedValue(59.9) })
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, edificioId: EDIFICIO },
      deps(store, CONFIG_ON),
    )
    expect(out.kind).toBe('budget_exceeded')
    if (out.kind === 'budget_exceeded') {
      expect(out.usage.budget_used).toBe(59.9)
      expect(out.usage.budget_limit).toBe(60)
    }
  })

  it('exatamente no limite passa (59.72 + 0.28 = 60.00)', async () => {
    const store = makeStore({ sumCostCurrentMonth: vi.fn().mockResolvedValue(59.72) })
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, edificioId: EDIFICIO },
      deps(store, CONFIG_ON),
    )
    expect(out.kind).toBe('ok')
  })
})

describe('executeOwnerLookup — pipeline de consulta (AC1/AC2/AC9)', () => {
  it('sucesso: persiste, cobra 0.28, dispara feed e devolve payload', async () => {
    const store = makeStore()
    const d = deps(store, CONFIG_ON)
    const out = await executeOwnerLookup({ consultantId: CONSULTANT, edificioId: EDIFICIO }, d)

    expect(out.kind).toBe('ok')
    if (out.kind === 'ok') {
      expect(out.httpStatus).toBe(200)
      expect(out.body.cache_hit).toBe(false)
      expect(out.body.nome_proprietario).toBe('Maria da Silva')
      expect(out.body.custo_brl).toBe(0.28)
      expect(out.body.rate_remaining).toBe(29)
      expect(out.body.budget_used).toBe(0.28)
    }
    expect(store.insertLookup).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', custo_brl: 0.28, consultant_id: CONSULTANT }),
    )
    expect(store.insertFeedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ cache_hit: false, custo_brl: 0.28 }),
      }),
    )
  })

  it('not_found: persiste com custo 0, httpStatus 404, sem feed', async () => {
    const store = makeStore()
    const d = deps(store, CONFIG_ON, { status: 'not_found', raw: { code: 612 } })
    const out = await executeOwnerLookup({ consultantId: CONSULTANT, edificioId: EDIFICIO }, d)

    expect(out.kind).toBe('ok')
    if (out.kind === 'ok') expect(out.httpStatus).toBe(404)
    expect(store.insertLookup).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'not_found', custo_brl: 0 }),
    )
    expect(store.insertFeedEvent).not.toHaveBeenCalled()
  })

  it('failed: persiste erro, custo 0, httpStatus 502', async () => {
    const store = makeStore()
    const d = deps(store, CONFIG_ON, { status: 'failed', errorMessage: 'timeout apos 20s' })
    const out = await executeOwnerLookup({ consultantId: CONSULTANT, edificioId: EDIFICIO }, d)

    expect(out.kind).toBe('ok')
    if (out.kind === 'ok') {
      expect(out.httpStatus).toBe(502)
      expect(out.body.error_message).toBe('timeout apos 20s')
    }
    expect(store.insertLookup).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', custo_brl: 0 }),
    )
  })

  it('falha no feed event NAO quebra o lookup (best-effort)', async () => {
    const store = makeStore({
      insertFeedEvent: vi.fn().mockRejectedValue(new Error('feed indisponivel')),
    })
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, edificioId: EDIFICIO },
      deps(store, CONFIG_ON),
    )
    expect(out.kind).toBe('ok')
    if (out.kind === 'ok') expect(out.httpStatus).toBe(200)
  })
})

describe('executeOwnerLookup — resolucao do alvo (AC1)', () => {
  it('edificio inexistente → edificio_not_found', async () => {
    const store = makeStore({ resolveEdificio: vi.fn().mockResolvedValue(null) })
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, edificioId: EDIFICIO },
      deps(store, CONFIG_ON),
    )
    expect(out.kind).toBe('edificio_not_found')
  })

  it('sem sql_lote resolvido (GeoSampa falhou) → sql_lote_unresolved', async () => {
    const store = makeStore({
      resolveEdificio: vi.fn().mockResolvedValue({ sqlLote: null, endereco: 'Al. X' }),
    })
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, edificioId: EDIFICIO },
      deps(store, CONFIG_ON),
    )
    expect(out.kind).toBe('sql_lote_unresolved')
  })

  it('variante { sql_lote, endereco } consulta direto sem resolver edificio', async () => {
    const store = makeStore()
    const d = deps(store, CONFIG_ON)
    const out = await executeOwnerLookup(
      { consultantId: CONSULTANT, sqlLote: '099.111.0001-1', endereco: 'Av. Y, 22' },
      d,
    )
    expect(out.kind).toBe('ok')
    expect(store.resolveEdificio).not.toHaveBeenCalled()
    expect(d.consultar).toHaveBeenCalledWith('099.111.0001-1')
    expect(store.insertLookup).toHaveBeenCalledWith(
      expect.objectContaining({ edificio_id: null, sql_lote: '099.111.0001-1' }),
    )
  })
})
