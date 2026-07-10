import { describe, it, expect, vi } from 'vitest'
import {
  consultarCartorioArisp,
  isOwnerLookupEnabled,
  parseInfosimplesEnvelope,
} from './infosimples'

const ENV_ON = { OWNER_LOOKUP_ENABLED: 'true', INFOSIMPLES_TOKEN: 'tok-123' }
const noSleep = () => Promise.resolve()

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('isOwnerLookupEnabled (fronteira da API paga)', () => {
  it('OFF por default (env vazio)', () => {
    expect(isOwnerLookupEnabled({})).toBe(false)
  })

  it('OFF com flag true mas sem token', () => {
    expect(isOwnerLookupEnabled({ OWNER_LOOKUP_ENABLED: 'true' })).toBe(false)
  })

  it('OFF com token mas flag != true', () => {
    expect(isOwnerLookupEnabled({ INFOSIMPLES_TOKEN: 'tok', OWNER_LOOKUP_ENABLED: 'false' })).toBe(false)
  })

  it('ON somente com flag true + token', () => {
    expect(isOwnerLookupEnabled(ENV_ON)).toBe(true)
  })
})

describe('parseInfosimplesEnvelope', () => {
  it('code 200 com data → success com CPF mascarado', () => {
    const r = parseInfosimplesEnvelope({
      code: 200,
      data: [
        {
          matricula: '123.456',
          proprietario: 'Maria da Silva',
          documento: '123.456.789-09',
          cartorio: '15o Cartorio de SP',
          data_matricula: '2018-03-01',
        },
      ],
    })
    expect(r.status).toBe('success')
    if (r.status === 'success') {
      expect(r.nome_proprietario).toBe('Maria da Silva')
      expect(r.cpf_cnpj_masked).toBe('***.***.***-09')
      expect(r.cpf_cnpj_masked).not.toContain('123')
      expect(r.matricula).toBe('123.456')
    }
  })

  it('code 6xx → not_found', () => {
    expect(parseInfosimplesEnvelope({ code: 612 }).status).toBe('not_found')
  })

  it('code 200 sem data → not_found', () => {
    expect(parseInfosimplesEnvelope({ code: 200, data: [] }).status).toBe('not_found')
  })

  it('code de erro → failed com mensagem', () => {
    const r = parseInfosimplesEnvelope({ code: 500, code_message: 'instabilidade' })
    expect(r.status).toBe('failed')
    if (r.status === 'failed') expect(r.errorMessage).toContain('instabilidade')
  })
})

describe('consultarCartorioArisp', () => {
  it('flag OFF → failed sem chamar fetch (zero consumo)', async () => {
    const fetchImpl = vi.fn()
    const r = await consultarCartorioArisp('001.002.0003-4', {
      env: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: noSleep,
    })
    expect(r.status).toBe('failed')
    if (r.status === 'failed') expect(r.errorMessage).toContain('owner_lookup_disabled')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('sucesso na 1a tentativa', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ code: 200, data: [{ matricula: 'M1', proprietario: 'Joao' }] }),
    )
    const r = await consultarCartorioArisp('sql-1', {
      env: ENV_ON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: noSleep,
    })
    expect(r.status).toBe('success')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const bodySent = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string)
    expect(bodySent.token).toBe('tok-123')
    expect(bodySent.sql).toBe('sql-1')
  })

  it('not_found NAO re-tenta (evita custo)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ code: 612 }))
    const r = await consultarCartorioArisp('sql-2', {
      env: ENV_ON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: noSleep,
    })
    expect(r.status).toBe('not_found')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('erro tecnico faz retry com backoff e recupera', async () => {
    const sleeps: number[] = []
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 502))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(jsonResponse({ code: 200, data: [{ proprietario: 'Ana' }] }))
    const r = await consultarCartorioArisp('sql-3', {
      env: ENV_ON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: (ms) => {
        sleeps.push(ms)
        return Promise.resolve()
      },
    })
    expect(r.status).toBe('success')
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleeps).toEqual([1000, 3000]) // backoff 1s/3s (AC7)
  })

  it('3 falhas (1 + 2 retries) → failed com ultimo erro', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 503))
    const r = await consultarCartorioArisp('sql-4', {
      env: ENV_ON,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: noSleep,
    })
    expect(r.status).toBe('failed')
    if (r.status === 'failed') expect(r.errorMessage).toBe('HTTP 503')
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })
})
