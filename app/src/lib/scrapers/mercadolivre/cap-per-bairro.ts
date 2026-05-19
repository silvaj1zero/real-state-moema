/**
 * Story 7.4 — cap-per-bairro helpers (LOGIC-001 fix, gate 2794411).
 *
 * Pure module: extrai bairro de uma URL MercadoLivre e computa as
 * decisões de paginacao + enqueue baseadas em contador POR BAIRRO
 * (não global). Importado tanto pelo Actor (`apps/crawlers/...`)
 * quanto pelos testes em `app/src/lib/scrapers/__tests__/`.
 *
 * PUREZA: TS puro (ADR-EPIC7-006). Sem IO, sem rede.
 */

/**
 * Extrai o slug do bairro a partir da URL canônica MercadoLivre Imoveis.
 *
 * URLs esperadas:
 *   - https://imoveis.mercadolivre.com.br/casas/venda/sao-paulo/moema/
 *   - https://imoveis.mercadolivre.com.br/apartamentos/venda/sao-paulo/itaim-bibi/
 *
 * Fallback: 'unknown' se padrão não casar.
 */
export function extractBairroFromUrl(url: string): string {
  const match = url.match(/\/(?:casas|apartamentos)\/[^/]+\/[^/]+\/([^/?]+)/i)
  return match?.[1] ?? 'unknown'
}

/**
 * Decide se o handler de LISTING_PAGE deve abortar (cap já atingido).
 */
export function shouldStopBairro(bairroCount: number, maxPerBairro: number): boolean {
  return bairroCount >= maxPerBairro
}

/**
 * Dada a lista de detail URLs encontrada na pagina + contador atual,
 * retorna o subset que cabe dentro do cap restante.
 */
export function clampDetailsToCap<T>(
  detailUrls: readonly T[],
  bairroCount: number,
  maxPerBairro: number,
): T[] {
  const remaining = Math.max(0, maxPerBairro - bairroCount)
  return detailUrls.slice(0, remaining)
}

/**
 * Calcula o próximo bairroCount apos enqueue dos N details desta pagina.
 */
export function nextBairroCount(bairroCount: number, enqueuedCount: number): number {
  return bairroCount + enqueuedCount
}

/**
 * Decide se devemos paginar para a próxima listing page deste bairro.
 */
export function shouldEnqueueNextPage(
  newBairroCount: number,
  maxPerBairro: number,
  hasNextPageUrl: boolean,
): boolean {
  return hasNextPageUrl && newBairroCount < maxPerBairro
}
