/**
 * Epic 7 — Proxy tiering por alvo (Story 7.12).
 *
 * Portais BR protegidos por Cloudflare (ZAP/VivaReal) bloqueiam IPs de
 * datacenter por reputacao de ASN no edge (403/503). IP residencial BR
 * atinge 85-99% de sucesso (report FISBO F5 media 2-1 / F6 alta 3-0). O
 * Crawlee ja aplica fingerprints/headers realistas + SessionPool por
 * padrao — o que falta e fornecer o pool de proxy residencial via
 * `ProxyConfiguration` por alvo (residencial e mais caro: usar so onde ha
 * bloqueio).
 *
 * DESIGN:
 *  - `resolveProxySpec` e PURO e injetavel (env via parametro) — testavel
 *    sem I/O nem dependencia da Apify/Crawlee.
 *  - `buildProxyConfiguration` recebe uma `factory` injetavel que
 *    materializa o `ProxyConfiguration` real (em prod: a
 *    `Actor.createProxyConfiguration` da Apify — exceção permitida pela
 *    ADR-EPIC7-002; em teste: um mock). Mantemos vendor-portabilidade.
 *  - Fallback gracioso (AC5): se residencial for pedido mas nao estiver
 *    disponivel, degrada para datacenter e LOGA — nunca quebra.
 *
 * PUREZA TS: ZERO import de `next/*`. `ProxyConfiguration` e type-only
 * (apagado no build) — sem runtime coupling a Crawlee.
 *
 * Ref: ADR-EPIC7-002 (Apify cloud Wave A) | ADR-EPIC7-006 (TS puro)
 */

import type { ProxyConfiguration } from 'crawlee'

import type { Portal } from '@/lib/schemas/epic7'

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

/** Nivel de proxy por alvo. `none` = sem proxy (ex.: dev local). */
export type ProxyTier = 'residential' | 'datacenter' | 'none'

/** Nome do grupo de proxy residencial Apify. */
export const RESIDENTIAL_GROUP = 'RESIDENTIAL'
/** Nome do grupo de proxy datacenter Apify. */
export const DATACENTER_GROUP = 'DATACENTER'

/**
 * AC2 — selecao de proxy POR ALVO (nao residencial global).
 *
 * Residencial so para os portais que a verificacao adversarial confirmou
 * atras de Cloudflare (report F5/F6): ZAP e VivaReal. MercadoLivre nao e
 * Cloudflare -> datacenter (custo menor). OLX fica em datacenter por
 * padrao (conservador): a telemetria de bloqueio (AC4) revela se precisa
 * subir para residencial — trocar 1 linha aqui. NAO assumimos residencial
 * sem evidencia (Art. IV — No Invention).
 */
export const PORTAL_PROXY_TIER: Record<Portal, ProxyTier> = {
  zap: 'residential',
  vivareal: 'residential',
  olx: 'datacenter',
  mercadolivre: 'datacenter',
}

// ---------------------------------------------------------------------------
// Spec resolution (pura)
// ---------------------------------------------------------------------------

/** Spec resolvida para um alvo — input do builder de ProxyConfiguration. */
export interface ProxySpec {
  tier: ProxyTier
  /** Grupos Apify (`['RESIDENTIAL']` | `['DATACENTER']` | `[]`). */
  apifyProxyGroups: string[]
  /** ISO country code (ex.: 'BR'). Omitido para `none`. */
  apifyProxyCountry?: string
  /**
   * Preenchido quando houve fallback gracioso (AC5): o tier pedido
   * originalmente, antes de degradar. Caller LOGA isto.
   */
  degradedFrom?: ProxyTier
}

/** Env injetavel (resolvida de `process.env` por `readProxyEnv`). */
export interface ProxyEnv {
  /** Grupos disponiveis no plano Apify atual (APIFY_PROXY_GROUPS). */
  availableGroups: string[]
  /** Pais alvo do proxy (APIFY_PROXY_COUNTRY). */
  country: string
}

/**
 * AC5 — le env vars de proxy (sem hardcode de credencial; o token Apify
 * fica em APIFY_TOKEN, gerido pelo SDK). Defaults assumem plano Apify
 * Creator (residencial + datacenter inclusos) e Brasil.
 *
 * `APIFY_PROXY_GROUPS` — CSV dos grupos disponiveis (ex.: "RESIDENTIAL,DATACENTER").
 * `APIFY_PROXY_COUNTRY` — ISO country code (ex.: "BR").
 */
export function readProxyEnv(
  env: Record<string, string | undefined> = process.env,
): ProxyEnv {
  const rawGroups = env.APIFY_PROXY_GROUPS
  const availableGroups = rawGroups
    ? rawGroups
        .split(',')
        .map((g) => g.trim().toUpperCase())
        .filter(Boolean)
    : [RESIDENTIAL_GROUP, DATACENTER_GROUP]
  const country = env.APIFY_PROXY_COUNTRY?.trim() || 'BR'
  return { availableGroups, country }
}

/**
 * AC1/AC2/AC5 — resolve a spec de proxy para um alvo, de forma pura.
 *
 *  - `residential` -> grupo RESIDENTIAL + countryCode, SE disponivel; senao
 *    degrada para datacenter (`degradedFrom: 'residential'`).
 *  - `datacenter` -> grupo DATACENTER (se disponivel) + countryCode.
 *  - `none` -> sem grupos, sem pais.
 */
export function resolveProxySpec(
  portal: Portal,
  env: ProxyEnv = readProxyEnv(),
): ProxySpec {
  const tier = PORTAL_PROXY_TIER[portal] ?? 'datacenter'

  if (tier === 'none') {
    return { tier: 'none', apifyProxyGroups: [] }
  }

  if (tier === 'residential') {
    if (env.availableGroups.includes(RESIDENTIAL_GROUP)) {
      return {
        tier: 'residential',
        apifyProxyGroups: [RESIDENTIAL_GROUP],
        apifyProxyCountry: env.country,
      }
    }
    // AC5 — residencial indisponivel: degrada para datacenter (nao quebra).
    return {
      tier: 'datacenter',
      apifyProxyGroups: env.availableGroups.includes(DATACENTER_GROUP)
        ? [DATACENTER_GROUP]
        : [],
      apifyProxyCountry: env.country,
      degradedFrom: 'residential',
    }
  }

  // datacenter
  return {
    tier: 'datacenter',
    apifyProxyGroups: env.availableGroups.includes(DATACENTER_GROUP)
      ? [DATACENTER_GROUP]
      : [],
    apifyProxyCountry: env.country,
  }
}

// ---------------------------------------------------------------------------
// Builder (injetavel)
// ---------------------------------------------------------------------------

/** Input que o factory recebe — espelha `Actor.createProxyConfiguration`. */
export interface ProxyFactoryInput {
  groups: string[]
  countryCode?: string
}

/**
 * Factory que materializa um `ProxyConfiguration` real. Em producao:
 * `Actor.createProxyConfiguration` (Apify). Em teste: mock que captura o
 * input. Pode ser async (Apify resolve credenciais).
 */
export type ProxyConfigurationFactory = (
  input: ProxyFactoryInput,
) => ProxyConfiguration | Promise<ProxyConfiguration>

/**
 * AC1/AC2/AC5 — constroi o `ProxyConfiguration` para um alvo usando a
 * factory injetavel. Retorna `undefined` para tier `none` (caller passa
 * `undefined` ao `createPortalCrawler`, que entao nao usa proxy).
 *
 * Loga quando houve degradacao residencial->datacenter (AC5).
 */
export async function buildProxyConfiguration(
  portal: Portal,
  factory: ProxyConfigurationFactory,
  env: ProxyEnv = readProxyEnv(),
  logger: (msg: string) => void = (m) => console.warn(m),
): Promise<ProxyConfiguration | undefined> {
  const spec = resolveProxySpec(portal, env)

  if (spec.degradedFrom) {
    logger(
      `[proxy] ${portal}: tier "${spec.degradedFrom}" indisponivel -> ` +
        `degradado para "${spec.tier}" (grupos: ${spec.apifyProxyGroups.join(',') || 'none'})`,
    )
  }

  if (spec.tier === 'none') return undefined

  return factory({
    groups: spec.apifyProxyGroups,
    countryCode: spec.apifyProxyCountry,
  })
}
