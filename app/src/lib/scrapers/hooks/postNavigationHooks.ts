/**
 * postNavigationHooks — executam APOS `page.goto` resolver. Detectam
 * paginas de bloqueio (Cloudflare challenge, CAPTCHA, login wall) e
 * marcam o request para propagacao (NaoRetryable) ou retry agressivo.
 */

export interface PostNavCtxLike {
  request: { url: string }
  response?: {
    status?: () => number
    headers?: () => Record<string, string>
  } | null
  page?: {
    content(): Promise<string>
  }
}

export type PostNavHook = (ctx: PostNavCtxLike) => Promise<void>

/**
 * Marker class — caller pode try/catch para diferenciar de erros HTTP
 * comuns. Crawlee tratara como "non-retryable" se thrown.
 */
export class AntiBotDetectedError extends Error {
  readonly detector: string
  constructor(detector: string, url: string) {
    super(`Anti-bot detected (${detector}) for ${url}`)
    this.name = 'AntiBotDetectedError'
    this.detector = detector
  }
}

export class LoginWallDetectedError extends Error {
  constructor(url: string) {
    super(`Login wall detected for ${url}`)
    this.name = 'LoginWallDetectedError'
  }
}

const CLOUDFLARE_TITLES = [
  /just a moment/i,
  /attention required/i,
  /please enable javascript/i,
]

const CAPTCHA_MARKERS = [
  /<title>[^<]*captcha[^<]*<\/title>/i,
  /class=["'][^"']*g-recaptcha/i,
  /hcaptcha\.com\/captcha/i,
]

const LOGIN_WALL_MARKERS = [
  /please\s+log\s*in/i,
  /sign\s*in\s*to\s*continue/i,
  /<title>[^<]*login[^<]*<\/title>/i,
  /class=["'][^"']*login-required/i,
]

/**
 * Anti-bot detection: Cloudflare 503 challenge + CAPTCHA markers no HTML.
 *
 * MUST throw AntiBotDetectedError para que `shouldPropagateError`
 * propage e o session pool desabilite a sessao atual.
 */
export const antiBotDetectionHook: PostNavHook = async (ctx) => {
  const status = ctx.response?.status?.()
  if (status === 503) {
    const server = ctx.response?.headers?.()?.['server']
    if (server && /cloudflare/i.test(server)) {
      throw new AntiBotDetectedError('cloudflare-503', ctx.request.url)
    }
  }

  if (!ctx.page) return
  const html = await ctx.page.content()

  for (const re of CLOUDFLARE_TITLES) {
    if (re.test(html)) {
      throw new AntiBotDetectedError('cloudflare-html', ctx.request.url)
    }
  }
  for (const re of CAPTCHA_MARKERS) {
    if (re.test(html)) {
      throw new AntiBotDetectedError('captcha', ctx.request.url)
    }
  }
}

/**
 * Login wall detection — separado do antibot porque indica que a URL
 * requer autenticacao (nao adianta retry com proxy novo).
 */
export const loginWallDetectionHook: PostNavHook = async (ctx) => {
  if (!ctx.page) return
  const html = await ctx.page.content()
  for (const re of LOGIN_WALL_MARKERS) {
    if (re.test(html)) {
      throw new LoginWallDetectedError(ctx.request.url)
    }
  }
}
