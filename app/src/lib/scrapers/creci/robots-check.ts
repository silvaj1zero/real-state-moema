/**
 * Epic 7 Story 7.7 — robots.txt compliance check per BR-COFECI-005.
 *
 * Fonte: `docs/code-anatomy/buscacreci/07-business-rules.md`.
 *
 * Comportamento:
 *  1. GET {origin}/robots.txt
 *  2. Se inacessivel (404/erro) -> assume allowed (graceful fallback)
 *  3. Parse linhas filtrando por user-agent `*` ou matching `userAgent`
 *  4. Coleta paths em `Disallow:`
 *  5. Se url.pathname comeca com algum disallow -> false
 *  6. Senao -> true
 */

export interface RobotsCheckOptions {
  fetchImpl?: typeof fetch
  /** Cache TTL em ms; default 1h. Cache em memoria por origin. */
  cacheTtlMs?: number
  userAgent?: string
}

interface CacheEntry {
  expiresAt: number
  disallowed: string[]
}

const cache = new Map<string, CacheEntry>()

export async function isAllowedByRobotsTxt(
  url: string,
  opts: RobotsCheckOptions = {},
): Promise<boolean> {
  const u = new URL(url)
  const cacheKey = `${u.origin}::${opts.userAgent ?? '*'}`
  const ttl = opts.cacheTtlMs ?? 60 * 60 * 1000

  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return !cached.disallowed.some((d) => u.pathname.startsWith(d))
  }

  const fetchImpl = opts.fetchImpl ?? globalThis.fetch
  let disallowed: string[] = []
  try {
    const resp = await fetchImpl(`${u.origin}/robots.txt`)
    if (resp.ok) {
      const text = await resp.text()
      disallowed = parseRobotsTxt(text, opts.userAgent ?? '*')
    }
  } catch {
    // graceful fallback — assume allowed
    disallowed = []
  }

  cache.set(cacheKey, { expiresAt: Date.now() + ttl, disallowed })
  return !disallowed.some((d) => u.pathname.startsWith(d))
}

/**
 * Parse robots.txt e retorna lista de paths Disallow para o agent dado.
 * Exportado para testes.
 */
export function parseRobotsTxt(
  text: string,
  userAgent: string,
): string[] {
  const lines = text.split('\n').map((l) => l.trim())
  let isRelevant = false
  const disallowed: string[] = []
  const wantsWildcard = userAgent === '*'

  for (const raw of lines) {
    if (!raw || raw.startsWith('#')) continue
    const lower = raw.toLowerCase()
    if (lower.startsWith('user-agent:')) {
      const agent = raw.slice('user-agent:'.length).trim()
      const agentLower = agent.toLowerCase()
      isRelevant =
        agent === '*' ||
        (wantsWildcard && agent === '*') ||
        agentLower.includes(userAgent.toLowerCase())
      continue
    }
    if (isRelevant && lower.startsWith('disallow:')) {
      const path = raw.slice('disallow:'.length).trim()
      if (path) disallowed.push(path)
    }
  }
  return disallowed
}

/** Limpa cache. Util em testes. */
export function clearRobotsCache(): void {
  cache.clear()
}
