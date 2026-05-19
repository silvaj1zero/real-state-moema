/**
 * Epic 7 — MercadoLivre Imoveis listing-page parser (Story 7.4 AC3, AC10).
 *
 * Recebe HTML cru de uma pagina de listagem (ex.:
 * `https://imoveis.mercadolivre.com.br/casas/venda/sao-paulo/moema/`) e
 * extrai (a) a lista de detail URLs descobertos e (b) a URL da proxima
 * pagina (ou null se ultima).
 *
 * PUREZA: TS puro (ADR-EPIC7-006). Sem imports `next/*` nem `@/`. Esta
 * funcao roda identico em Apify Actor isolado e nos vitest do app/.
 *
 * Implementacao: cheerio (DOM scraping). MercadoLivre publica cards de
 * busca como `<li class="ui-search-layout__item">` com link interno
 * `<a class="ui-search-link">` (selectors podem mudar — usamos uma
 * cascata de fallbacks regex-based para resiliencia minima).
 */

import * as cheerio from 'cheerio'

export interface ParsedListingPage {
  /** URLs absolutas para detail pages descobertas no card. */
  detailUrls: string[]
  /** URL absoluta da proxima pagina, ou null se nao houver. */
  nextPageUrl: string | null
}

const ML_DETAIL_HOST_RE = /(?:imoveis|produto|articulo|casa|apto)\.mercadolivre\.com\.br/i

function isDetailUrl(href: string): boolean {
  // Aceita URLs canonicas MLB-XXXXX OR -_JM (legacy) OR /MLB-xxxxx-
  if (!href) return false
  if (/\/MLB-?\d/.test(href)) return true
  if (/-_JM/.test(href)) return true
  if (ML_DETAIL_HOST_RE.test(href) && /\/p\//.test(href)) return true
  return false
}

function toAbsoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

/**
 * AC3 — extrai detail URLs + paginacao. Determinstico, sem rede.
 *
 * @param html HTML cru da listing page
 * @param pageUrl URL canonica da pagina (usada como base para hrefs relativos)
 */
export function parseListingPage(html: string, pageUrl: string): ParsedListingPage {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const detailUrls: string[] = []

  // Pass 1 — cards canonicos (`a.ui-search-link`, `a.ui-search-result__content`)
  $('a').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    if (!isDetailUrl(href)) return
    const abs = toAbsoluteUrl(href, pageUrl)
    if (seen.has(abs)) return
    seen.add(abs)
    detailUrls.push(abs)
  })

  // Paginacao — MercadoLivre usa `li.andes-pagination__button--next > a`
  let nextPageUrl: string | null = null
  const nextHref =
    $('li.andes-pagination__button--next > a').attr('href') ||
    $('a.andes-pagination__link[title="Siguiente" i]').attr('href') ||
    $('a[aria-label="Proxima" i]').attr('href') ||
    $('a[aria-label="Pagina seguinte" i]').attr('href') ||
    null
  if (nextHref) {
    nextPageUrl = toAbsoluteUrl(nextHref, pageUrl)
  }

  return { detailUrls, nextPageUrl }
}

/**
 * Helper exportado para testes — detecta detail URLs em fragments arbitrarios.
 * NAO usado em producao (parseListingPage cobre).
 */
export function _isDetailUrl(href: string): boolean {
  return isDetailUrl(href)
}
