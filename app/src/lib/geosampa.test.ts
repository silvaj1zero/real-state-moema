import { describe, it, expect, vi } from 'vitest'
import { fetchSqlLoteByPoint } from './geosampa'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('fetchSqlLoteByPoint', () => {
  it('extrai o sql do primeiro feature (propriedade "sql")', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ features: [{ properties: { sql: '001.002.0003-4' } }] }),
    )
    const sql = await fetchSqlLoteByPoint(-46.66, -23.6, fetchImpl as unknown as typeof fetch)
    expect(sql).toBe('001.002.0003-4')

    const url = new URL(fetchImpl.mock.calls[0][0] as string)
    expect(url.searchParams.get('typeNames')).toBe('CADASTRO_IPTU_LOTE')
    expect(url.searchParams.get('CQL_FILTER')).toBe('INTERSECTS(geometry, POINT(-46.66 -23.6))')
  })

  it('aceita propriedades alternativas (sqlc / sql_lote)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ features: [{ properties: { sqlc: '099.888.0777-6' } }] }),
    )
    expect(await fetchSqlLoteByPoint(-46, -23, fetchImpl as unknown as typeof fetch)).toBe(
      '099.888.0777-6',
    )
  })

  it('sem features → null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ features: [] }))
    expect(await fetchSqlLoteByPoint(-46, -23, fetchImpl as unknown as typeof fetch)).toBeNull()
  })

  it('HTTP nao-ok → null (degrada sem lancar)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 503))
    expect(await fetchSqlLoteByPoint(-46, -23, fetchImpl as unknown as typeof fetch)).toBeNull()
  })

  it('erro de rede → null (degrada sem lancar)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ENOTFOUND'))
    expect(await fetchSqlLoteByPoint(-46, -23, fetchImpl as unknown as typeof fetch)).toBeNull()
  })
})
