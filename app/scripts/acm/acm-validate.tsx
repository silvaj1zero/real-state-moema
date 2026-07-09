/**
 * P-1 — CLI `acm-validate` (offline v1).
 *
 * Pipeline: dataset canônico → gates R5/9.8/avisos → computation.json → PDF Lite
 * (e opcionalmente laudo). Substitui o trio de scripts por caso para o caminho
 * "já tenho dataset.json limpo".
 *
 * Uso (de `app/`):
 *   npx -y tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132
 *   npx -y tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132 --laudo
 *   npx -y tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132 --tese construcao --no-lite
 *
 * Flags:
 *   --lite / --no-lite   PDF Lite (default: on)
 *   --laudo              PDF laudo técnico (mais pesado)
 *   --tese <AcmTese>     construcao|terreno|hibrido|apto
 *   --type <property>    casa|apartamento|terreno
 *   --json-only          só computation + relatório (sem PDF)
 *
 * Saída em <pasta-dataset>/:
 *   ACM-validate-report.json
 *   ACM-computation.json
 *   ACM-Lite-*.pdf (se --lite)
 *   ACM-Laudo-*.pdf (se --laudo)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToBuffer } from '@react-pdf/renderer'
import type { AcmTese } from '@/lib/acm/methodology'
import type { TipologiaTipo } from '@/lib/acm/tipologia'
import type { AcmDataset } from '@/lib/acm/dataset'
import { runAcmValidatePipeline } from '@/lib/acm/validatePipeline'
import { buildAcmLiteItem } from '@/lib/acm/pdf/acmPackage'
import { buildLaudoModel, type LaudoSourceComparable } from '@/lib/acm/pdf/laudoModel'
import { LaudoDocument } from '@/lib/acm/pdf/LaudoDocument'
import { registerBrandFonts } from '@/lib/acm/pdf/theme'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
// app/scripts/acm → repo root
const repoRoot = path.resolve(scriptDir, '..', '..', '..')

function parseArgs(argv: string[]) {
  const pos: string[] = []
  const flags = new Set<string>()
  const kv: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        kv[key] = next
        i++
      } else {
        flags.add(key)
      }
    } else {
      pos.push(a)
    }
  }
  return { pos, flags, kv }
}

async function main() {
  const { pos, flags, kv } = parseArgs(process.argv.slice(2))
  const rel = pos[0]
  if (!rel || flags.has('help') || flags.has('h')) {
    console.log(`uso: npx tsx scripts/acm/acm-validate.tsx <pasta-docs-acm> [flags]
  --lite | --no-lite   PDF Lite (default on)
  --laudo              PDF laudo técnico
  --tese construcao|terreno|hibrido|apto
  --type casa|apartamento|terreno
  --json-only          sem PDF`)
    process.exit(rel ? 0 : 1)
  }

  const outDir = path.isAbsolute(rel) ? rel : path.join(repoRoot, rel)
  const datasetPath = path.join(outDir, 'dataset.json')
  if (!existsSync(datasetPath)) {
    console.error(`dataset.json não encontrado: ${datasetPath}`)
    process.exit(1)
  }

  const ds = JSON.parse(readFileSync(datasetPath, 'utf8')) as AcmDataset
  const wantLite = !flags.has('no-lite') && !flags.has('json-only')
  const wantLaudo = flags.has('laudo')
  const jsonOnly = flags.has('json-only')
  const tese = (kv.tese as AcmTese | undefined) ?? undefined
  const propertyType = (kv.type as TipologiaTipo | undefined) ?? undefined

  const result = runAcmValidatePipeline(ds, {
    tese,
    propertyType,
    subprecificacaoMeta: {
      nAnuncios:
        typeof (ds as { nAnuncios?: number }).nAnuncios === 'number'
          ? (ds as { nAnuncios?: number }).nAnuncios
          : null,
    },
  })

  const { computation, meta, gates, resumo } = result

  console.log('\n=== ACM validate (P-1 offline) ===')
  console.log(`alvo: ${meta.enderecoAlvo}${meta.bairro ? ` · ${meta.bairro}` : ''}`)
  console.log(`tipo: ${meta.propertyType} · tese-eval: ${meta.tese}`)
  console.log(
    `n=${resumo.totalComparaveis} · mediana R$/m²=${resumo.medianaPrecoM2} · mercado=${resumo.valorMercado} · fech=${resumo.valorFechamento}`,
  )
  console.log(
    `tese comercial: ${resumo.teseComercial} · subprecificação: ${resumo.subprecificacao ?? '—'}`,
  )
  console.log('\n--- gates ---')
  for (const g of gates) {
    const mark = g.ok ? 'OK ' : g.severidade === 'critico' ? '!! ' : '·· '
    console.log(`${mark}[${g.id}] ${g.detalhe}`)
  }

  mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  const slug = path.basename(outDir)

  const reportPath = path.join(outDir, 'ACM-validate-report.json')
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        meta,
        resumo,
        gates,
        avisos: computation.avisos,
        r5: computation.r5,
        teseComercial: computation.teseComercial,
        subprecificacao: computation.subprecificacao,
        top3: computation.top3.map((t) => t.endereco),
      },
      null,
      2,
    ),
  )
  console.log(`\nreport → ${reportPath}`)

  const compPath = path.join(outDir, 'ACM-computation.json')
  writeFileSync(compPath, JSON.stringify(computation, null, 2))
  console.log(`computation → ${compPath}`)

  if (!jsonOnly && (wantLite || wantLaudo)) {
    registerBrandFonts()
    const source: LaudoSourceComparable[] = ds.comparaveis.map((c) => ({
      endereco: c.endereco,
      areaConstruida: c.areaConstruida,
      areaTerreno: c.areaTerreno,
      preco: c.preco,
      distancia: c.distancia,
      fonte: c.fonte ?? 'ITBI/PMSP',
      sqlCadastral: c.sqlCadastral,
      isVendaReal: c.isVendaReal ?? true,
    }))

    const inputBase = {
      enderecoAlvo: meta.enderecoAlvo,
      bairro: meta.bairro,
      areaConstruida: meta.areaConstruida,
      areaTerreno: meta.areaTerreno ?? 0,
      precoPretendido: ds.target.precoPretendido,
      precoPedidoReal: ds.target.precoPedidoReal ?? null,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
    }

    if (wantLite) {
      const item = buildAcmLiteItem(computation, source, inputBase)
      const buf = await renderToBuffer(item.doc)
      const out = path.join(outDir, `ACM-Lite-${slug}-${stamp}.pdf`)
      writeFileSync(out, buf)
      console.log(`lite → ${out} (${buf.length} bytes)`)
    }

    if (wantLaudo) {
      const model = buildLaudoModel(computation, source, inputBase)
      const buf = await renderToBuffer(<LaudoDocument model={model} />)
      const out = path.join(outDir, `ACM-Laudo-${slug}-${stamp}.pdf`)
      writeFileSync(out, buf)
      console.log(`laudo → ${out} (${buf.length} bytes)`)
    }
  }

  const hardFail = gates.some(
    (g) => !g.ok && g.severidade === 'critico' && g.id !== 'avisos_criticos',
  )
  if (hardFail) {
    console.error('\nEXIT 2 — gate crítico (amostra/R5)')
    process.exit(2)
  }
  console.log('\nEXIT 0 — validate ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
