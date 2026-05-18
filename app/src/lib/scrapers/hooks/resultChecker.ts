/**
 * resultChecker — valida que cada result emitido pelo handler tem
 * sinais minimos de "pagina real de listing", evitando que paginas
 * de bloqueio/CAPTCHA gerem rows lixo em scraped_listings.
 *
 * AC2: result tem `portal_listing_id` (== `external_id`) + `list_price`
 * nao-null. portal_listing_id e a chave de deduplicacao por portal;
 * list_price (em centavos) e o signal mais forte de pagina valida.
 */

import type { Portal } from '@/lib/schemas/epic7'

export interface CheckableResult {
  portal_listing_id?: string | null
  external_id?: string | null
  list_price?: number | null
  [k: string]: unknown
}

export type ResultChecker = (result: CheckableResult) => boolean

/**
 * Factory que cria um checker tagged com o portal (futura instrumentacao
 * pode logar quantos resultados sao descartados por portal).
 *
 * Recebe `portal` para permitir overrides por portal no futuro (ex.
 * Wave B QuintoAndar pode aceitar list_price=null em "Aluguel sob
 * consulta"). Wave A: regra unica.
 */
export function makeDefaultResultChecker(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for portal-specific overrides
  portal: Portal,
): ResultChecker {
  return (result) => {
    const id = result.portal_listing_id ?? result.external_id
    if (typeof id !== 'string' || id.trim().length === 0) return false
    if (typeof result.list_price !== 'number') return false
    if (!Number.isFinite(result.list_price)) return false
    if (result.list_price <= 0) return false
    return true
  }
}
