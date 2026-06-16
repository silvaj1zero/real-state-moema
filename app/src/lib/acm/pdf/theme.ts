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
 * Registra Montserrat (títulos) e Inter (corpo) a partir de URLs/paths de TTF.
 * Best-effort: qualquer falha mantém os defaults Helvetica (não lança).
 * Chamar uma vez antes de renderizar; idempotente.
 */
export function registerBrandFonts(opts?: {
  montserratBold?: string
  montserratSemiBold?: string
  interRegular?: string
  interMedium?: string
  interBold?: string
}): boolean {
  if (brandFontsRegistered) return true
  if (!opts) return false
  try {
    if (opts.montserratBold || opts.montserratSemiBold) {
      Font.register({
        family: 'Montserrat',
        fonts: [
          ...(opts.montserratSemiBold
            ? [{ src: opts.montserratSemiBold, fontWeight: 600 as const }]
            : []),
          ...(opts.montserratBold
            ? [{ src: opts.montserratBold, fontWeight: 700 as const }]
            : []),
        ],
      })
    }
    if (opts.interRegular || opts.interMedium || opts.interBold) {
      Font.register({
        family: 'Inter',
        fonts: [
          ...(opts.interRegular ? [{ src: opts.interRegular, fontWeight: 400 as const }] : []),
          ...(opts.interMedium ? [{ src: opts.interMedium, fontWeight: 500 as const }] : []),
          ...(opts.interBold ? [{ src: opts.interBold, fontWeight: 700 as const }] : []),
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

/** Desabilita a hifenização automática (mantém endereços/valores íntegros). */
Font.registerHyphenationCallback((word) => [word])

// ---------------------------------------------------------------------------
// Identidade da consultora (luciana-brand-guide.md + ACM_RESUMO)
// ---------------------------------------------------------------------------

export const CONSULTORA = {
  nome: 'Luciana Borba',
  cargo: 'Consultora Imobiliária',
  imobiliaria: 'RE/MAX Galeria',
  creci: 'CRECI 045063-J',
  rodape: '© 2026 Luciana Borba — RE/MAX Galeria',
} as const
