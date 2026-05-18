/**
 * preNavigationHooks — factories para hooks executados ANTES de
 * `page.goto(url)`. Usados pelo PortalCrawler para preparar contexto
 * (cookies de consent LGPD-PT, referer plausivel, headers anti-fingerprint).
 *
 * Convencao Crawlee: hooks recebem `crawlingContext` e `gotoOptions`,
 * podem mutar ambos.
 */

import type { Portal } from '@/lib/schemas/epic7'

/**
 * Subset minimo da interface Crawlee de pre-navigation context.
 * Tipamos aqui para permitir mock em testes sem importar tipos
 * profundos do crawlee (que carregam Playwright types).
 */
export interface PreNavCtxLike {
  request: { url: string; headers?: Record<string, string> }
  page?: {
    context(): {
      addCookies(
        cookies: Array<{
          name: string
          value: string
          domain: string
          path: string
        }>,
      ): Promise<void>
    }
  }
}

export interface GotoOptionsLike {
  referer?: string
  [k: string]: unknown
}

export type PreNavHook = (
  ctx: PreNavCtxLike,
  gotoOptions: GotoOptionsLike,
) => Promise<void> | void

/**
 * Mapa portal → cookies de consent (LGPD banners pedem aceite explicito;
 * sem cookie, a maioria dos portais BR mostra interstitial e bloqueia
 * scraping). Valores reais virao da implementacao da Story 7.4
 * (MercadoLivre) e refinados Wave B.
 */
const CONSENT_COOKIES_BY_PORTAL: Record<
  Portal,
  Array<{ name: string; value: string; domain: string; path: string }>
> = {
  zap: [],
  olx: [],
  vivareal: [],
  mercadolivre: [
    {
      name: '_ml_csrf',
      value: 'consent-accepted',
      domain: '.mercadolivre.com.br',
      path: '/',
    },
  ],
}

/**
 * Cria hook que injeta cookies de consent ANTES do goto. Idempotente.
 */
export function makeConsentCookieHook(portal: Portal): PreNavHook {
  const cookies = CONSENT_COOKIES_BY_PORTAL[portal] ?? []
  return async (ctx) => {
    if (cookies.length === 0) return
    const page = ctx.page
    if (!page) return
    await page.context().addCookies(cookies)
  }
}

/**
 * Cria hook que injeta um referer plausivel (busca google.com.br),
 * reduzindo signal "tipped-off bot" de portais que checam Referer.
 */
export function makeRefererHook(): PreNavHook {
  return (ctx, gotoOptions) => {
    gotoOptions.referer = 'https://www.google.com.br/'
    ctx.request.headers = {
      ...(ctx.request.headers ?? {}),
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    }
  }
}
