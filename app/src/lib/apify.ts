/**
 * Apify API client for portal scraping (Story 3.4)
 *
 * Calls Apify Actors to scrape ZAP, OLX, VivaReal.
 * Results are processed and inserted into scraped_listings.
 */

const APIFY_BASE = 'https://api.apify.com/v2'

interface ApifyRunResult {
  id: string
  status: string
  defaultDatasetId: string
}

interface ApifyListingRaw {
  url?: string
  title?: string
  address?: string
  price?: number | string
  area?: number | string
  rooms?: number | string
  advertiserType?: string // 'owner', 'broker', 'agency'
  description?: string
  externalId?: string
  latitude?: number
  longitude?: number
  neighborhood?: string
  propertyType?: string
}

export interface NormalizedListing {
  portal: 'zap' | 'olx' | 'vivareal'
  external_id: string
  url: string | null
  tipo_anunciante: 'proprietario' | 'corretor' | 'imobiliaria' | 'desconhecido'
  endereco: string | null
  bairro: string | null
  preco: number | null
  area_m2: number | null
  preco_m2: number | null
  tipologia: string | null
  quartos: number | null
  descricao: string | null
  is_fisbo: boolean
  lat: number | null
  lng: number | null
}

function getApifyToken(): string {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('Missing APIFY_TOKEN env var')
  return token
}

/** Run an Apify Actor and wait for completion */
export async function runActor(actorId: string, input: Record<string, unknown>): Promise<ApifyRunResult> {
  const token = getApifyToken()
  const res = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) throw new Error(`Apify run failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Poll for Actor run completion */
export async function waitForRun(runId: string, maxWaitMs = 300000): Promise<ApifyRunResult> {
  const token = getApifyToken()
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`)
    if (!res.ok) throw new Error(`Apify poll failed: ${res.status}`)
    const run: ApifyRunResult = await res.json()

    if (run.status === 'SUCCEEDED') return run
    if (run.status === 'FAILED' || run.status === 'ABORTED') {
      throw new Error(`Apify run ${run.status}`)
    }

    await new Promise((r) => setTimeout(r, 5000))
  }

  throw new Error('Apify run timed out')
}

/** Fetch dataset items from completed run */
export async function getDatasetItems(datasetId: string): Promise<ApifyListingRaw[]> {
  const token = getApifyToken()
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&format=json`)
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status}`)
  return res.json()
}

/** Parse Brazilian number format: "1.200.000" → 1200000, "120,5" → 120.5 */
function parseBrazilianNumber(str: string): number | null {
  // Remove non-numeric chars except . and ,
  let cleaned = str.replace(/[^\d.,]/g, '')
  if (!cleaned) return null

  // If has both . and , → Brazilian format: . is thousands, , is decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  // If only . → could be thousands (1.200.000) or decimal (120.5)
  else if (cleaned.includes('.')) {
    const parts = cleaned.split('.')
    // If last part has 3 digits → thousands separator
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleaned = cleaned.replace(/\./g, '')
    }
    // else keep as decimal
  }
  // If only , → decimal separator
  else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/** Map advertiser type from portal-specific values to our enum */
function mapAdvertiserType(raw: string | undefined): 'proprietario' | 'corretor' | 'imobiliaria' | 'desconhecido' {
  if (!raw) return 'desconhecido'
  const lower = raw.toLowerCase()
  if (lower.includes('proprietario') || lower.includes('proprietário') || lower === 'owner' || lower.includes('particular')) return 'proprietario'
  if (lower.includes('corretor') || lower === 'broker') return 'corretor'
  if (lower.includes('imobiliaria') || lower.includes('imobiliária') || lower === 'agency') return 'imobiliaria'
  return 'desconhecido'
}

/** Normalize raw Apify listing to our standard format */
export function normalizeListing(raw: ApifyListingRaw, portal: 'zap' | 'olx' | 'vivareal'): NormalizedListing | null {
  const externalId = raw.externalId || raw.url || null
  if (!externalId) return null

  const preco = typeof raw.price === 'string' ? parseBrazilianNumber(raw.price) : (raw.price ?? null)
  const area = typeof raw.area === 'string' ? parseBrazilianNumber(raw.area) : (raw.area ?? null)
  const quartos = typeof raw.rooms === 'string' ? parseInt(raw.rooms) : (raw.rooms ?? null)
  const tipo = mapAdvertiserType(raw.advertiserType)

  return {
    portal,
    external_id: String(externalId),
    url: raw.url || null,
    tipo_anunciante: tipo,
    endereco: raw.address || null,
    bairro: raw.neighborhood || null,
    preco: preco && preco > 0 ? preco : null,
    area_m2: area && area > 0 ? area : null,
    preco_m2: preco && area && area > 0 ? Math.round((preco / area) * 100) / 100 : null,
    tipologia: raw.propertyType || null,
    quartos: quartos && quartos > 0 ? quartos : null,
    descricao: raw.description?.slice(0, 500) || null,
    is_fisbo: tipo === 'proprietario',
    lat: raw.latitude ?? null,
    lng: raw.longitude ?? null,
  }
}

/** Portal-specific Apify Actor IDs (configure via env vars) */
export const ACTOR_IDS = {
  zap: process.env.APIFY_ACTOR_ZAP || '',
  olx: process.env.APIFY_ACTOR_OLX || '',
  vivareal: process.env.APIFY_ACTOR_VIVAREAL || '',
} as const

/** Default search input for Moema region */
export const MOEMA_SEARCH_INPUT = {
  locations: ['Moema', 'Vila Olímpia', 'Itaim Bibi'],
  city: 'São Paulo',
  state: 'SP',
  transactionType: 'sale',
  maxResults: 200,
}
