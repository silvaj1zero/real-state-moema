/**
 * Epic 7 — MercadoLivre Imoveis parsers barrel (Story 7.4).
 *
 * Sincronizado para `apps/crawlers/mercadolivre-imoveis/src/shared/`
 * via `apps/crawlers/mercadolivre-imoveis/scripts/sync-shared.sh`.
 *
 * PUREZA: TS puro (ADR-EPIC7-006).
 */

export {
  parseListingPage,
  type ParsedListingPage,
  _isDetailUrl,
} from './parseListing'

export {
  parseDetailPage,
  type ParsedDetail,
  extractPhone,
  MLB_ID_RE,
  CRECI_TEXT_RE,
  CNPJ_RE,
  BRL_RE,
  AREA_RE,
  PHONE_RE,
} from './parseDetail'

export {
  toPropertyEpic7,
  buildAdvertiserSignals,
  type ToPropertyOptions,
} from './toPropertyEpic7'

export {
  extractBairroFromUrl,
  shouldStopBairro,
  clampDetailsToCap,
  nextBairroCount,
  shouldEnqueueNextPage,
} from './cap-per-bairro'
