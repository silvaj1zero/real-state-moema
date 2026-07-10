/**
 * GeoSampa WFS — fallback de resolucao do SQL do lote (Story 6.6, AC1a).
 *
 * Usado apenas quando `edificios.sql_lote IS NULL` (Story 3.5 preenche a
 * maioria via IPTU). Consulta a camada CADASTRO_IPTU_LOTE por INTERSECTS com
 * o ponto do edificio. Isolado neste modulo (risco: GeoSampa muda URL/layer).
 */

const GEOSAMPA_WFS_URL = 'https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/wfs'
const LOTE_LAYER = 'CADASTRO_IPTU_LOTE'
const TIMEOUT_MS = 15_000

interface WfsFeatureCollection {
  features?: Array<{ properties?: Record<string, unknown> }>
}

/** Propriedades candidatas a conter o SQL do lote no retorno WFS. */
const SQL_PROPERTY_CANDIDATES = ['sql', 'sqlc', 'sql_lote', 'setor_quadra_lote']

/**
 * Busca o SQL (setor-quadra-lote) do lote que intersecta o ponto dado.
 * Retorna null se o WFS nao responder ou nao houver lote no ponto.
 */
export async function fetchSqlLoteByPoint(
  lng: number,
  lat: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: LOTE_LAYER,
    outputFormat: 'application/json',
    count: '1',
    CQL_FILTER: `INTERSECTS(geometry, POINT(${lng} ${lat}))`,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetchImpl(`${GEOSAMPA_WFS_URL}?${params.toString()}`, {
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error(`GeoSampa WFS HTTP ${res.status}`)
      return null
    }

    const body = (await res.json()) as WfsFeatureCollection
    const props = body.features?.[0]?.properties
    if (!props) return null

    for (const key of SQL_PROPERTY_CANDIDATES) {
      const v = props[key]
      if (typeof v === 'string' && v.trim() !== '') return v.trim()
      if (typeof v === 'number') return String(v)
    }
    return null
  } catch (err) {
    console.error(
      'GeoSampa WFS error:',
      controller.signal.aborted ? 'timeout' : err instanceof Error ? err.message : err,
    )
    return null
  } finally {
    clearTimeout(timer)
  }
}
