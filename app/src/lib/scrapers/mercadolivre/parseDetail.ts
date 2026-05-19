/**
 * Epic 7 — MercadoLivre Imoveis detail-page parser (Story 7.4 AC3, AC4, AC10).
 *
 * Recebe HTML cru de uma pagina de anuncio (ex.:
 * `https://imoveis.mercadolivre.com.br/MLB-XXXXX-...`) e extrai os campos
 * Wave A necessarios para popular `scraped_listings` + envelope
 * `PropertyEpic7` (Story 7.1):
 *   - external_id (MLB-XXXX)
 *   - titulo, preco, area, quartos, banheiros
 *   - endereco_texto, bairro, cidade
 *   - nome_anunciante, telefone_anunciante (mascarado), whatsapp
 *   - creci_anunciante (regex em descricao + meta)
 *   - cnpj_anunciante (regex em descricao + meta)
 *   - descricao integral, foto_urls[]
 *
 * Strategy: 2 passos — preferir JSON-LD (`<script type="application/ld+json">`)
 * sobre DOM. Fallback DOM via cheerio quando JSON ausente. CNPJ e CRECI
 * sempre via regex sobre raw HTML + descricao (sao texto livre).
 *
 * PUREZA: TS puro (ADR-EPIC7-006). Sem imports `next/*` nem `@/`.
 */

import * as cheerio from 'cheerio'

export interface ParsedDetail {
  external_id: string | null
  titulo: string | null
  preco: number | null
  area_m2: number | null
  quartos: number | null
  banheiros: number | null
  endereco_texto: string | null
  bairro: string | null
  cidade: string | null
  nome_anunciante: string | null
  /** Telefone publicado — frequentemente mascarado `(11) ****-1234`. */
  telefone_anunciante: string | null
  /** Whatsapp publico — geralmente null em ML Wave A. */
  whatsapp_anunciante: string | null
  /** CRECI extraido por regex em descricao + meta. */
  creci_anunciante: string | null
  /** CNPJ extraido por regex (14 digitos limpos). */
  cnpj_anunciante: string | null
  descricao: string | null
  foto_urls: string[]
}

// ---------------------------------------------------------------------------
// Regex helpers (definidos fora da funcao para serem reaproveitados em testes)
// ---------------------------------------------------------------------------

/** MLB-XXXX ou MLB1234567890 em qualquer URL ML. */
export const MLB_ID_RE = /MLB-?(\d{6,12})/

/** CRECI — `CRECI 12345`, `CRECI: 12345-F`, `CRECI/SP 12345`. */
export const CRECI_TEXT_RE =
  /CRECI(?:\s*\/\s*[A-Z]{2})?\s*[:\s-]?\s*(\d{3,6}[-/]?[A-Z]?)\b/i

/** CNPJ mascarado `12.345.678/0001-99` ou cru `12345678000199`. */
export const CNPJ_RE =
  /\b(\d{2})[.\s-]?(\d{3})[.\s-]?(\d{3})[\s\/-]?(\d{4})[\s-]?(\d{2})\b/

/** Preco em BRL — `R$ 1.250.000` ou `R$ 1.250.000,00`. */
export const BRL_RE = /R\$\s*([\d.]+)(?:,\d{2})?/

/** Area — `120 m²`, `120m2`. */
export const AREA_RE = /(\d{1,5}(?:[.,]\d+)?)\s*m[²2]/i

// ---------------------------------------------------------------------------
// Number parsers
// ---------------------------------------------------------------------------

function parseBRL(text: string): number | null {
  if (!text) return null
  const m = BRL_RE.exec(text)
  if (!m) return null
  const digits = m[1].replace(/\./g, '')
  const n = Number(digits)
  return Number.isFinite(n) ? n : null
}

function parseArea(text: string): number | null {
  if (!text) return null
  const m = AREA_RE.exec(text)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseFirstInt(text: string | null | undefined): number | null {
  if (!text) return null
  const m = /\d+/.exec(text)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------
// JSON-LD extraction
// ---------------------------------------------------------------------------

interface JsonLdProduct {
  '@type'?: string | string[]
  name?: string
  description?: string
  image?: string | string[]
  offers?: {
    price?: number | string
    priceCurrency?: string
  }
  address?: {
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
  }
  numberOfBedrooms?: number | string
  numberOfBathroomsTotal?: number | string
  floorSize?: { value?: number | string; unitText?: string }
  brand?: { name?: string } | string
}

function extractJsonLd($: cheerio.CheerioAPI): JsonLdProduct | null {
  const scripts = $('script[type="application/ld+json"]')
  for (const el of scripts.toArray()) {
    const raw = $(el).contents().text()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const t = item['@type']
        const types = Array.isArray(t) ? t : [t]
        if (types.some((x) => typeof x === 'string' && /product|residence|apartment|house/i.test(x))) {
          return item as JsonLdProduct
        }
      }
    } catch {
      // ignore — proximo script
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

/** Detecta padroes de telefone mascarado ou publico ML. */
export const PHONE_RE = /\(?\s*(\d{2})\s*\)?\s*([\d*]{4,5})[-\s.]?([\d*]{4})/

export function extractPhone(text: string): string | null {
  if (!text) return null
  const m = PHONE_RE.exec(text)
  if (!m) return null
  // Aceita mascarado (*) — relevante para Wave A
  return `(${m[1]}) ${m[2]}-${m[3]}`
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * AC3/AC4 — parser determinstico de detail page. Mesmo input, mesmo output.
 *
 * @param html HTML cru da detail page (string)
 * @param url URL canonica do anuncio (usada como fallback para external_id)
 */
export function parseDetailPage(html: string, url: string): ParsedDetail {
  const $ = cheerio.load(html)
  const ld = extractJsonLd($)

  // ---- external_id ----
  let external_id: string | null = null
  const mlbInUrl = MLB_ID_RE.exec(url)
  if (mlbInUrl) external_id = `MLB-${mlbInUrl[1]}`
  if (!external_id) {
    const mlbInHtml = MLB_ID_RE.exec(html)
    if (mlbInHtml) external_id = `MLB-${mlbInHtml[1]}`
  }

  // ---- titulo ----
  let titulo: string | null = null
  if (ld?.name) titulo = String(ld.name).trim()
  if (!titulo) {
    titulo =
      $('h1.ui-pdp-title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      null
  }

  // ---- preco ----
  let preco: number | null = null
  if (ld?.offers?.price !== undefined) {
    const n = Number(ld.offers.price)
    if (Number.isFinite(n)) preco = n
  }
  if (preco === null) {
    const priceText =
      $('span.andes-money-amount__fraction').first().text().trim() ||
      $('meta[itemprop="price"]').attr('content') ||
      ''
    const cleaned = priceText.replace(/\./g, '')
    const n = Number(cleaned)
    if (Number.isFinite(n) && n > 0) preco = n
  }
  if (preco === null) {
    // ultimo fallback — raw text
    preco = parseBRL(html)
  }

  // ---- area / quartos / banheiros ----
  let area_m2: number | null = null
  if (ld?.floorSize?.value !== undefined) {
    const n = Number(ld.floorSize.value)
    if (Number.isFinite(n)) area_m2 = n
  }
  if (area_m2 === null) {
    // Buscar nos rows de specs `.ui-pdp-specs__table` ou `.andes-table`
    const specsText = $('.ui-pdp-specs__table, .andes-table, .ui-pdp-highlighted-specs').text()
    area_m2 = parseArea(specsText) ?? parseArea(html)
  }

  let quartos: number | null = null
  if (ld?.numberOfBedrooms !== undefined) {
    quartos = parseFirstInt(String(ld.numberOfBedrooms))
  }
  if (quartos === null) {
    // procurar label "Quartos" / "Dormitorios"
    const m = /(\d+)\s*(?:quartos?|dormit[oó]rios?)/i.exec(html)
    if (m) quartos = Number(m[1])
  }

  let banheiros: number | null = null
  if (ld?.numberOfBathroomsTotal !== undefined) {
    banheiros = parseFirstInt(String(ld.numberOfBathroomsTotal))
  }
  if (banheiros === null) {
    const m = /(\d+)\s*banheiros?/i.exec(html)
    if (m) banheiros = Number(m[1])
  }

  // ---- endereco ----
  let endereco_texto: string | null = null
  let bairro: string | null = null
  let cidade: string | null = null
  if (ld?.address) {
    endereco_texto = ld.address.streetAddress?.trim() || null
    bairro = ld.address.addressLocality?.trim() || null
    cidade = ld.address.addressRegion?.trim() || null
  }
  if (!endereco_texto) {
    endereco_texto = $('p.ui-pdp-media__title, .ui-vip-location__subtitle').first().text().trim() || null
  }
  if (!bairro) {
    const bm = /bairro[:\s]+([A-Za-zÁÂÃÀÉÊÍÓÔÕÚÇ\s]+?)(?:[,.]|$)/i.exec(endereco_texto || html)
    if (bm) bairro = bm[1].trim()
  }

  // ---- anunciante ----
  let nome_anunciante: string | null = null
  if (ld?.brand) {
    nome_anunciante = typeof ld.brand === 'string' ? ld.brand : ld.brand.name ?? null
  }
  if (!nome_anunciante) {
    nome_anunciante =
      $('.ui-pdp-seller__header__title, .ui-pdp-seller__link-trigger').first().text().trim() ||
      $('[data-testid="seller-name"]').first().text().trim() ||
      null
  }

  // ---- telefone / whatsapp ----
  const phoneSelectors = [
    '.ui-pdp-seller__phone',
    '[data-testid="seller-phone"]',
    '.contact-phone',
  ]
  let phoneText = ''
  for (const sel of phoneSelectors) {
    const t = $(sel).first().text().trim()
    if (t) {
      phoneText = t
      break
    }
  }
  const telefone_anunciante = phoneText ? extractPhone(phoneText) : extractPhone(html)

  let whatsapp_anunciante: string | null = null
  const waHref = $('a[href*="api.whatsapp.com"], a[href*="wa.me"]').first().attr('href')
  if (waHref) {
    const m = /(\d{10,13})/.exec(waHref)
    if (m) whatsapp_anunciante = m[1]
  }

  // ---- CRECI / CNPJ ----
  let creci_anunciante: string | null = null
  const creciMatch = CRECI_TEXT_RE.exec(html)
  if (creciMatch) creci_anunciante = creciMatch[1]

  let cnpj_anunciante: string | null = null
  const cnpjMatch = CNPJ_RE.exec(html)
  if (cnpjMatch) {
    cnpj_anunciante = `${cnpjMatch[1]}${cnpjMatch[2]}${cnpjMatch[3]}${cnpjMatch[4]}${cnpjMatch[5]}`
  }

  // ---- descricao ----
  let descricao: string | null = null
  if (ld?.description) descricao = String(ld.description).trim()
  if (!descricao) {
    descricao =
      $('p.ui-pdp-description__content').first().text().trim() ||
      $('meta[name="description"]').attr('content')?.trim() ||
      null
  }

  // ---- fotos ----
  const fotoSet = new Set<string>()
  if (ld?.image) {
    const imgs = Array.isArray(ld.image) ? ld.image : [ld.image]
    for (const i of imgs) if (typeof i === 'string') fotoSet.add(i)
  }
  $('img.ui-pdp-gallery__figure__image, figure img, meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('content')
    if (src && /^https?:/.test(src)) fotoSet.add(src)
  })
  const foto_urls = Array.from(fotoSet)

  return {
    external_id,
    titulo,
    preco,
    area_m2,
    quartos,
    banheiros,
    endereco_texto,
    bairro,
    cidade,
    nome_anunciante,
    telefone_anunciante,
    whatsapp_anunciante,
    creci_anunciante,
    cnpj_anunciante,
    descricao,
    foto_urls,
  }
}
