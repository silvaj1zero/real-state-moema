/** Story 9.6 — prova que o PDF gerado EMBUTE Montserrat/Inter (não Helvetica). */
import { resolve } from 'node:path'
import React from 'react'
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { registerBrandFonts } from '../../src/lib/acm/pdf/theme'

const D = resolve(process.cwd(), 'public/fonts')
registerBrandFonts({
  montserratBold: resolve(D, 'Montserrat-Bold.ttf'),
  montserratSemiBold: resolve(D, 'Montserrat-SemiBold.ttf'),
  interRegular: resolve(D, 'Inter-Regular.ttf'),
  interMedium: resolve(D, 'Inter-Medium.ttf'),
})

const doc = React.createElement(
  Document,
  null,
  React.createElement(
    Page,
    { size: 'A4' },
    React.createElement(
      View,
      null,
      React.createElement(Text, { style: { fontFamily: 'Montserrat', fontSize: 18 } }, 'Titulo Montserrat'),
      React.createElement(Text, { style: { fontFamily: 'Inter', fontSize: 10 } }, 'Corpo Inter'),
    ),
  ),
)

async function main() {
  const buf = await renderToBuffer(doc)
  const s = buf.toString('latin1')
  const hasM = /Montserrat/.test(s)
  const hasI = /Inter/.test(s)
  const hasHelv = /Helvetica/.test(s)
  console.log(`PDF ${buf.length} bytes | Montserrat embutida: ${hasM ? 'SIM' : 'NAO'} | Inter embutida: ${hasI ? 'SIM' : 'NAO'} | Helvetica presente: ${hasHelv ? 'sim' : 'nao'}`)
  process.exit(hasM && hasI ? 0 : 1)
}
main()
