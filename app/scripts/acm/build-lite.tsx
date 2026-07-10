/**
 * ACM Lite genérico (Story 9.19 AC4) — gera 1 PDF a partir de dataset.json.
 *
 * Meta operacional: < 5 min com dados já no dataset (não inclui ingestão ITBI).
 *
 * Uso (de `app/`):
 *   npx -y tsx scripts/acm/build-lite.tsx docs/acm/honduras-629
 *   npx -y tsx scripts/acm/build-lite.tsx docs/acm/andrade-pertence-132
 *
 * Saída: <dir>/ACM-Lite-<slug>-YYYY-MM-DD.pdf
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToBuffer } from '@react-pdf/renderer'
import { computeLaudo, type AcmComparable } from '@/lib/acm/methodology'
import { buildAcmLiteItem } from '@/lib/acm/pdf/acmPackage'
import type { LaudoSourceComparable } from '@/lib/acm/pdf/laudoModel'
import { registerBrandFonts } from '@/lib/acm/pdf/theme'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')

const rel = process.argv[2]
if (!rel) {
  console.error('uso: npx tsx scripts/acm/build-lite.tsx <pasta-docs-acm>')
  process.exit(1)
}

const outDir = path.isAbsolute(rel) ? rel : path.join(repoRoot, rel)
const datasetPath = path.join(outDir, 'dataset.json')
if (!existsSync(datasetPath)) {
  // Honduras legado: sem dataset.json canônico na pasta — usar fixture via computation
  console.error(`dataset.json não encontrado em ${outDir}`)
  process.exit(1)
}

const ds = JSON.parse(readFileSync(datasetPath, 'utf8')) as {
  target: {
    endereco?: string
    bairro?: string
    areaConstruida: number
    areaTerreno?: number | null
    precoPretendido?: number | null
    precoPedidoReal?: number | null
  }
  comparaveis: Array<{
    endereco: string
    areaConstruida: number
    areaTerreno?: number | null
    preco: number
    distancia?: number | null
    dataVenda?: string | null
    isVendaReal?: boolean
    sqlCadastral?: string | null
    usoIptu?: string | null
    tipologia?: string
    tipologiaConfianca?: string
  }>
}

const comparaveis: AcmComparable[] = ds.comparaveis.map((c) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  dataVenda: c.dataVenda,
  isVendaReal: c.isVendaReal ?? true,
  sqlCadastral: c.sqlCadastral,
  tipologia: c.tipologia
    ? {
        valor: c.tipologia,
        fonte: String(c.tipologiaConfianca ?? '').includes('heur')
          ? ('heuristica' as const)
          : ('guia' as const),
      }
    : null,
}))

const propertyType =
  String(ds.target.endereco ?? '').match(/apart|apto/i) ? 'apartamento' as const : 'casa' as const

const computation = computeLaudo({
  target: {
    areaConstruida: ds.target.areaConstruida,
    areaTerreno: ds.target.areaTerreno ?? 0,
    endereco: ds.target.endereco,
    precoPretendido: ds.target.precoPretendido,
  },
  comparaveis,
  propertyType,
  precoPedidoReal: ds.target.precoPedidoReal ?? null,
})

const source: LaudoSourceComparable[] = ds.comparaveis.map((c) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  fonte: 'ITBI/PMSP',
  sqlCadastral: c.sqlCadastral,
}))

registerBrandFonts()
const item = buildAcmLiteItem(computation, source, {
  enderecoAlvo: ds.target.endereco ?? path.basename(outDir),
  bairro: ds.target.bairro,
  areaConstruida: ds.target.areaConstruida,
  areaTerreno: ds.target.areaTerreno,
  precoPretendido: ds.target.precoPretendido,
  precoPedidoReal: ds.target.precoPedidoReal,
  dataEmissao: new Date().toLocaleDateString('pt-BR'),
})

const buf = await renderToBuffer(item.doc)
mkdirSync(outDir, { recursive: true })
const slug = path.basename(outDir)
const outName = `ACM-Lite-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`
const outPath = path.join(outDir, outName)
writeFileSync(outPath, buf)
console.log(`OK ${outPath} (${buf.length} bytes) · mediana ${computation.medianaPrecoM2} · tese ${computation.teseComercial.tese}`)
