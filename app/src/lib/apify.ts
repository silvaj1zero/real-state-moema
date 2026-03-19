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

/** Output schema from viralanalyzer/brazil-real-estate-scraper */
interface ApifyListingRaw {
  id?: string // e.g. "olx-1487017053"
  title?: string
  url?: string
  price?: number | string
  priceFormatted?: string
  condominiumFee?: number
  iptu?: number | null
  transactionType?: string
  propertyType?: string
  propertySubType?: string
  area?: number | string
  bedrooms?: number | string
  bathrooms?: number
  parkingSpaces?: number
  amenities?: string
  complexAmenities?: string | null
  neighborhood?: string
  city?: string
  state?: string
  images?: string[]
  imageCount?: number
  publishedAt?: string
  pricePerSqm?: number
  source?: string // "OLX Imoveis", "ZAP Imoveis", "VivaReal", etc.
  scrapedAt?: string
  // Legacy fields (kept for generic actor compatibility)
  address?: string
  rooms?: number | string
  advertiserType?: string
  description?: string
  externalId?: string
  latitude?: number
  longitude?: number
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

/** Detect portal from Actor source field */
function detectPortal(raw: ApifyListingRaw, fallback: 'zap' | 'olx' | 'vivareal'): 'zap' | 'olx' | 'vivareal' | 'quintoandar' | 'outro' {
  const src = (raw.source || '').toLowerCase()
  if (src.includes('zap')) return 'zap'
  if (src.includes('olx')) return 'olx'
  if (src.includes('vivareal') || src.includes('viva real')) return 'vivareal'
  if (src.includes('quintoandar') || src.includes('quinto andar')) return 'quintoandar'

  // Fallback: detect from URL
  const url = (raw.url || '').toLowerCase()
  if (url.includes('zapimoveis') || url.includes('zap.com')) return 'zap'
  if (url.includes('olx.com')) return 'olx'
  if (url.includes('vivareal')) return 'vivareal'
  if (url.includes('quintoandar')) return 'quintoandar'

  return fallback
}

/** Normalize raw Apify listing to our standard format */
export function normalizeListing(raw: ApifyListingRaw, portal: 'zap' | 'olx' | 'vivareal'): NormalizedListing | null {
  // Use actor's id field, or our own, or URL as fallback
  const externalId = raw.id || raw.externalId || raw.url || null
  if (!externalId) return null

  const preco = typeof raw.price === 'string' ? parseBrazilianNumber(raw.price) : (raw.price ?? null)
  const area = typeof raw.area === 'string' ? parseBrazilianNumber(raw.area) : (raw.area ?? null)
  const quartos = raw.bedrooms != null
    ? (typeof raw.bedrooms === 'string' ? parseInt(raw.bedrooms) : raw.bedrooms)
    : (typeof raw.rooms === 'string' ? parseInt(raw.rooms) : (raw.rooms ?? null))
  const tipo = mapAdvertiserType(raw.advertiserType)
  const detectedPortal = detectPortal(raw, portal)

  // Build address from title or city+neighborhood
  const endereco = raw.address
    || (raw.neighborhood && raw.city ? `${raw.neighborhood}, ${raw.city} - ${raw.state || 'SP'}` : null)
    || raw.title?.split(' - ').pop() || null

  return {
    portal: detectedPortal === 'quintoandar' || detectedPortal === 'outro' ? portal : detectedPortal,
    external_id: String(externalId),
    url: raw.url || null,
    tipo_anunciante: tipo,
    endereco,
    bairro: raw.neighborhood || null,
    preco: preco && preco > 0 ? preco : null,
    area_m2: area && area > 0 ? area : null,
    preco_m2: raw.pricePerSqm ?? (preco && area && area > 0 ? Math.round((preco / area) * 100) / 100 : null),
    tipologia: raw.propertyType || null,
    quartos: quartos && quartos > 0 ? quartos : null,
    descricao: raw.title?.slice(0, 500) || raw.description?.slice(0, 500) || null,
    is_fisbo: tipo === 'proprietario',
    lat: raw.latitude ?? null,
    lng: raw.longitude ?? null,
  }
}

/**
 * Single Actor handles all portals: viralanalyzer/brazil-real-estate-scraper
 * Differentiated by `platform` input param.
 */
export const ACTOR_ID = process.env.APIFY_ACTOR_ID || 'viralanalyzer~brazil-real-estate-scraper'

/** Platform identifiers for the brazil-real-estate-scraper Actor */
export const PORTAL_PLATFORMS: Record<string, string> = {
  zap: 'zapimoveis',
  olx: 'olx',
  vivareal: 'vivareal',
}

/** Build search input for a specific portal in Moema region */
export function buildSearchInput(portal: 'zap' | 'olx' | 'vivareal', maxItems = 200): Record<string, unknown> {
  return {
    platform: PORTAL_PLATFORMS[portal] || portal,
    state: 'sp',
    city: 'sao-paulo',
    neighborhood: 'moema',
    listingType: 'sale',
    maxItems,
  }
}
