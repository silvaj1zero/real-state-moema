/**
 * shouldPropagateError — propaga apenas erros nao recuperaveis (403,
 * 429, Cloudflare/CAPTCHA wall); demais erros retornam false para que
 * o AutoscaledPool decida retry com novo proxy.
 *
 * Convencao Crawlee: retornar `true` aborta o request handler e marca
 * como failure; `false` (ou exception engolida) tenta retry.
 */

export interface PropagationContext {
  statusCode?: number | null
  errorMessage?: string | null
}

const HARD_BLOCK_STATUS = new Set([401, 403, 451])
const RATE_LIMIT_STATUS = new Set([429])

const ANTI_BOT_MARKERS = [
  /cloudflare/i,
  /captcha/i,
  /access\s+denied/i,
  /please\s+enable\s+cookies/i,
  /attention\s+required/i,
]

/**
 * Decide se erro deve ser propagado (true) ou tentado novamente (false).
 *
 * Regras Wave A:
 *  - 401/403/451 → propaga (provavel block geo / acesso negado)
 *  - 429 → propaga (rate-limit; AutoscaledPool ja vai reduzir concurrency)
 *  - Cloudflare / CAPTCHA / "access denied" no body → propaga
 *  - 5xx → false (retry com novo proxy)
 *  - Timeout / network → false (retry com novo proxy)
 */
export function shouldPropagateError(ctx: PropagationContext): boolean {
  const code = ctx.statusCode ?? 0
  if (HARD_BLOCK_STATUS.has(code)) return true
  if (RATE_LIMIT_STATUS.has(code)) return true

  const msg = ctx.errorMessage ?? ''
  if (msg && ANTI_BOT_MARKERS.some((re) => re.test(msg))) return true

  return false
}
