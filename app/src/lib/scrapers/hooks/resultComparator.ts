/**
 * resultComparator — comparator default (deep isEqual) usado pelo
 * AdaptivePlaywrightCrawler para detectar mispredictions entre runs
 * HTTP-only e Playwright.
 *
 * Implementacao TS pura (sem dependencia em lodash) para preservar
 * portabilidade Apify Actors / Edge Functions.
 */

/**
 * Compara dois valores arbitrarios (objects, arrays, primitives) por
 * deep equality. Trata NaN como igual a si mesmo (diferente de === ).
 */
export function defaultResultComparator(a: unknown, b: unknown): boolean {
  return deepEqual(a, b)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false

  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b)
  }

  if (a === null || b === null) return false
  if (typeof a !== 'object') return false

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  const ak = Object.keys(ao)
  const bk = Object.keys(bo)
  if (ak.length !== bk.length) return false
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false
    if (!deepEqual(ao[k], bo[k])) return false
  }
  return true
}
