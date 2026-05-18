/**
 * Epic 7 — Scrapers barrel export (Story 7.2).
 *
 * Superficie publica de `app/src/lib/scrapers/`. Stories 7.4+ consomem
 * a partir DAQUI para preservar refactors internos.
 *
 * Convencao ADR-EPIC7-006: TS puro. Nao adicionar imports `next/*`.
 */

export {
  createPortalCrawler,
  PORTAL_CRAWLER_DEFAULTS,
  type PortalCrawlerOptions,
  type ResultChecker,
  type PreNavHook,
  type PostNavHook,
} from './portal-crawler'

export {
  Telemetry,
  SupabaseTelemetryClient,
  type TelemetryClient,
  type TelemetryOptions,
  type CrawlRunStatus,
  type CrawlRunInsert,
  type CrawlRequestInsert,
  type CrawlFailureInsert,
  type CrawlRunSnapshot,
} from './telemetry'

export { makeDefaultResultChecker } from './hooks/resultChecker'
export { defaultResultComparator } from './hooks/resultComparator'
export { shouldPropagateError } from './hooks/shouldPropagateError'
export {
  makeConsentCookieHook,
  makeRefererHook,
} from './hooks/preNavigationHooks'
export {
  antiBotDetectionHook,
  loginWallDetectionHook,
  AntiBotDetectedError,
  LoginWallDetectedError,
} from './hooks/postNavigationHooks'
