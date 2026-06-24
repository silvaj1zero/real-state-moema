/**
 * Tema de branding RE/MAX Galeria para os entregáveis ACM em PDF (Story 8.3a/8.3b).
 *
 * Cores e tipografia traçam a `docs/branding/luciana-brand-guide.md` (Sec. 2).
 * Fontes: por padrão usamos as famílias nativas do React-PDF (Helvetica) — zero
 * dependência de rede, garante que a geração NUNCA quebre (8.3a AC8) e mantém a
 * capacidade offline da ADR-EPIC8-001. `registerBrandFonts()` é opt-in: registra
 * Montserrat/Inter quando os TTFs estiverem vendados em `public/fonts/`; se a
 * registração falhar, o documento continua com Helvetica (AC2 — fallback).
 */
import { Font } from '@react-pdf/renderer'

// ---------------------------------------------------------------------------
// Paleta (RE/MAX — luciana-brand-guide.md Sec. 2)
// ---------------------------------------------------------------------------

export const COLORS = {
  azulEscuro: '#001D4A', // headers, autoridade
  azul: '#003DA5', // headers, elementos primários
  azulMoema: '#2563EB', // links, dados
  vermelho: '#DC1431', // destaque/urgência
  corpo: '#374151', // texto corpo
  cinzaClaro: '#6B7280',
  cinzaBorda: '#E5E7EB',
  fundoSuave: '#F8FAFC',
  verde: '#16A34A', // valores positivos / fechamento
  dourado: '#D4A843', // selos premium
  branco: '#FFFFFF',
} as const

// ---------------------------------------------------------------------------
// Tipografia
// ---------------------------------------------------------------------------

/** Famílias ativas. Defaults nativos (Helvetica) — sobrescritos por registerBrandFonts(). */
export const FONTS = {
  heading: 'Helvetica-Bold',
  headingSemi: 'Helvetica-Bold',
  body: 'Helvetica',
  bodyMedium: 'Helvetica-Bold',
  mono: 'Courier',
}

let brandFontsRegistered = false

/**
 * URLs públicas das TTFs vendorizadas (Story 9.6 — `app/public/fonts/`, servidas
 * pelo Next em `/fonts/*`). Vendoring reproduzível: `scripts/acm-audit/vendor-fonts.mjs`.
 */
export const BRAND_FONT_URLS = {
  montserratBold: '/fonts/Montserrat-Bold.ttf',
  montserratSemiBold: '/fonts/Montserrat-SemiBold.ttf',
  interRegular: '/fonts/Inter-Regular.ttf',
  interMedium: '/fonts/Inter-Medium.ttf',
} as const

/**
 * Registra Montserrat (títulos) e Inter (corpo) a partir de URLs/paths de TTF.
 * Best-effort: qualquer falha mantém os defaults Helvetica (não lança).
 * Chamar uma vez antes de renderizar; idempotente.
 *
 * IMPORTANTE: os estilos dos Documents usam `FONTS.heading`/`body` SEM `fontWeight`
 * explícito → o React-PDF resolve para o peso normal (400). Por isso registramos o
 * peso 400 de cada família (Montserrat→Bold, Inter→Regular); sem isso o render
 * lançaria "font weight not found".
 */
export function registerBrandFonts(opts?: {
  montserratBold?: string
  montserratSemiBold?: string
  interRegular?: string
  interMedium?: string
}): boolean {
  if (brandFontsRegistered) return true
  if (!opts) return false
  try {
    if (opts.montserratBold || opts.montserratSemiBold) {
      const bold = opts.montserratBold ?? opts.montserratSemiBold!
      const semi = opts.montserratSemiBold ?? opts.montserratBold!
      Font.register({
        family: 'Montserrat',
        fonts: [
          // 400/normal → Bold (default dos títulos, que não declaram fontWeight)
          { src: bold, fontWeight: 400 as const },
          { src: semi, fontWeight: 600 as const },
          { src: bold, fontWeight: 700 as const },
        ],
      })
    }
    if (opts.interRegular || opts.interMedium) {
      const regular = opts.interRegular ?? opts.interMedium!
      const medium = opts.interMedium ?? opts.interRegular!
      Font.register({
        family: 'Inter',
        fonts: [
          { src: regular, fontWeight: 400 as const },
          { src: medium, fontWeight: 500 as const },
        ],
      })
    }
    FONTS.heading = 'Montserrat'
    FONTS.headingSemi = 'Montserrat'
    FONTS.body = 'Inter'
    FONTS.bodyMedium = 'Inter'
    brandFontsRegistered = true
    return true
  } catch {
    // mantém Helvetica — nunca quebra o PDF
    return false
  }
}

/**
 * Registra as fontes de marca no client (browser), a partir das TTFs vendorizadas.
 * Chamado no module-load (abaixo) — antes dos Documents avaliarem seus
 * `StyleSheet.create`. Em node/SSR/testes é no-op → fallback Helvetica (AC3).
 */
export function ensureBrandFonts(): boolean {
  if (typeof document === 'undefined') return false
  // jsdom (vitest) também define `document`, mas não há dev server p/ servir
  // `/fonts/*` → manter Helvetica sob teste (e provar as TTFs via fs no teste).
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return false
  return registerBrandFonts(BRAND_FONT_URLS)
}

/** Desabilita a hifenização automática (mantém endereços/valores íntegros). */
Font.registerHyphenationCallback((word) => [word])

// Registra as fontes de marca no client, no load do módulo — antes de qualquer
// Document avaliar seu StyleSheet.create (que captura FONTS.* por valor). Em
// node/testes é no-op (mantém Helvetica). Story 9.6.
ensureBrandFonts()

// ---------------------------------------------------------------------------
// Identidade da consultora (luciana-brand-guide.md + ACM_RESUMO)
// ---------------------------------------------------------------------------

export const CONSULTORA = {
  nome: 'Luciana Borba',
  cargo: 'Consultora Imobiliária',
  imobiliaria: 'RE/MAX Galeria',
  unidade: 'RE/MAX Galeria · Moema',
  creci: 'CRECI 045063-J',
  telefone: '(11) 99995-2014',
  email: 'lucianaborba@remax.com.br',
  rodape: '© 2026 Luciana Borba — RE/MAX Galeria · Moema',
} as const

// Re-export dos assets de marca (logos oficiais embutidos) — ver brandAssets.ts.
export { REMAX_BALLOON_PNG, REMAX_WORDMARK_PNG } from './brandAssets'
