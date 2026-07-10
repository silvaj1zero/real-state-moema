import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { registerBrandFonts, ensureBrandFonts, BRAND_FONT_URLS } from './theme'

// Caminhos absolutos das TTFs vendorizadas (Story 9.6 AC1). React-PDF aceita
// path de arquivo local em node — diferente das URLs públicas usadas no browser.
const FONTS_DIR = resolve(__dirname, '../../../../public/fonts')
const paths = {
  montserratBold: resolve(FONTS_DIR, 'Montserrat-Bold.ttf'),
  montserratSemiBold: resolve(FONTS_DIR, 'Montserrat-SemiBold.ttf'),
  interRegular: resolve(FONTS_DIR, 'Inter-Regular.ttf'),
  interMedium: resolve(FONTS_DIR, 'Inter-Medium.ttf'),
}

describe('Story 9.6 — fontes de marca', () => {
  it('AC1: as 4 TTFs estão vendorizadas em public/fonts', () => {
    for (const p of Object.values(paths)) expect(existsSync(p), p).toBe(true)
  })

  it('AC3: ensureBrandFonts() é no-op em node (sem document) → não lança, fica em Helvetica', () => {
    expect(ensureBrandFonts()).toBe(false)
  })

  it('AC4: registra as TTFs reais e renderiza um Document a buffer sem lançar', async () => {
    // Registra a partir dos paths de arquivo (node). Idempotente.
    const okReg = registerBrandFonts(paths)
    expect(okReg).toBe(true)

    // Document mínimo exercitando Montserrat (heading) e Inter (corpo), incl. o
    // peso 400 sem fontWeight explícito (regressão do "weight not found").
    const buf = await renderToBuffer(
      <Document>
        <Page size="A4">
          <View>
            <Text style={{ fontFamily: 'Montserrat', fontSize: 18 }}>Título Montserrat</Text>
            <Text style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12 }}>Subtítulo SemiBold</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 10 }}>Corpo em Inter Regular</Text>
            <Text style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 10 }}>Dado em Inter Medium</Text>
          </View>
        </Page>
      </Document>,
    )
    expect(buf.length).toBeGreaterThan(0)
  })

  it('BRAND_FONT_URLS aponta para /fonts/*.ttf (servido pelo Next no browser)', () => {
    expect(BRAND_FONT_URLS.montserratBold).toBe('/fonts/Montserrat-Bold.ttf')
    expect(BRAND_FONT_URLS.interRegular).toBe('/fonts/Inter-Regular.ttf')
  })
})
