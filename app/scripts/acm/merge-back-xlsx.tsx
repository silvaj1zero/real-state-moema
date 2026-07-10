/**
 * P-2 — Merge-back da planilha XLSX do corretor sobre dataset.json.
 *
 * Uso (de `app/`):
 *   npx -y tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132
 *   npx -y tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132 path/to/planilha.xlsx
 *   npx -y tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132 --dry-run
 *
 * Default XLSX: procura ACM-*-validacao-corretor*.xlsx na pasta (prefere -revN mais alto).
 * Saida:
 *   dataset.json (backup em dataset.pre-merge-back.json se nao --dry-run)
 *   merge-back-report.json
 * Opcional: revalida com P-1 se --validate
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeBackFromXlsx } from '@/lib/acm/xlsx/mergeBack'
import type { AcmDataset } from '@/lib/acm/dataset'
import { runAcmValidatePipeline } from '@/lib/acm/validatePipeline'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')

function parseArgs(argv: string[]) {
  const pos: string[] = []
  const flags = new Set<string>()
  for (const a of argv) {
    if (a.startsWith('--')) flags.add(a.slice(2))
    else pos.push(a)
  }
  return { pos, flags }
}

function pickXlsx(dir: string, explicit?: string): string {
  if (explicit) {
    const p = path.isAbsolute(explicit) ? explicit : path.join(repoRoot, explicit)
    if (!existsSync(p)) throw new Error(`XLSX nao encontrado: ${p}`)
    return p
  }
  const files = readdirSync(dir)
    .filter((f) => /validacao-corretor.*\.xlsx$/i.test(f) && !f.startsWith('~$'))
    .sort((a, b) => {
      // prefere revN maior; senao nome mais longo / mtime via name
      const ra = /(\d+)/.exec(a)?.[1]
      const rb = /(\d+)/.exec(b)?.[1]
      if (ra && rb) return Number(rb) - Number(ra)
      if (a.includes('rev') && !b.includes('rev')) return -1
      if (!a.includes('rev') && b.includes('rev')) return 1
      return b.localeCompare(a)
    })
  if (!files.length) {
    throw new Error(`Nenhum ACM-*-validacao-corretor*.xlsx em ${dir}`)
  }
  return path.join(dir, files[0])
}

const { pos, flags } = parseArgs(process.argv.slice(2))
const rel = pos[0]
if (!rel || flags.has('help')) {
  console.log(`uso: npx tsx scripts/acm/merge-back-xlsx.tsx <pasta-docs-acm> [xlsx] [--dry-run] [--validate]`)
  process.exit(rel ? 0 : 1)
}

const outDir = path.isAbsolute(rel) ? rel : path.join(repoRoot, rel)
const datasetPath = path.join(outDir, 'dataset.json')
if (!existsSync(datasetPath)) {
  console.error(`dataset.json ausente: ${datasetPath}`)
  process.exit(1)
}

const xlsxPath = pickXlsx(outDir, pos[1])
const dry = flags.has('dry-run')
const doValidate = flags.has('validate')

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as AcmDataset
const buf = readFileSync(xlsxPath)
const { dataset: merged, report, marks } = mergeBackFromXlsx(dataset, buf)

console.log('\n=== ACM merge-back (P-2) ===')
console.log(`dataset: ${datasetPath}`)
console.log(`xlsx:    ${xlsxPath}`)
console.log(`marks:   ${report.nMarks} (ok=${report.nOk} nao=${report.nNao} duvida=${report.nDuvida} vazio=${report.nVazio})`)
console.log(`excluidos: ${report.nExcluidos} · tipologia: ${report.nTipologiaAtualizada} · campos: ${report.nCampoCorrigido}`)
console.log(`comparaveis: ${dataset.comparaveis.length} → ${merged.comparaveis.length}`)
if (report.excluidos.length) {
  console.log('  fora:', report.excluidos.slice(0, 10).join(' · ') + (report.excluidos.length > 10 ? ' …' : ''))
}
if (report.alteracoes.length) {
  for (const a of report.alteracoes.slice(0, 8)) {
    console.log(`  ~ ${a.endereco}: ${a.mudancas.join('; ')}`)
  }
}

const reportPath = path.join(outDir, 'merge-back-report.json')
const reportBody = {
  geradoEm: new Date().toISOString(),
  xlsx: path.basename(xlsxPath),
  dryRun: dry,
  report,
  marks: marks.filter((m) => m.confere !== 'vazio' || m.tipologiaManual || m.correcao),
}

if (dry) {
  console.log('\n--dry-run: nao grava dataset.json')
  writeFileSync(reportPath.replace(/\.json$/, '.dry-run.json'), JSON.stringify(reportBody, null, 2))
  console.log(`report → ${reportPath.replace(/\.json$/, '.dry-run.json')}`)
} else {
  const bak = path.join(outDir, 'dataset.pre-merge-back.json')
  if (!existsSync(bak)) {
    copyFileSync(datasetPath, bak)
    console.log(`backup → ${bak}`)
  }
  writeFileSync(datasetPath, JSON.stringify(merged, null, 2))
  writeFileSync(reportPath, JSON.stringify(reportBody, null, 2))
  console.log(`dataset → ${datasetPath}`)
  console.log(`report  → ${reportPath}`)
}

if (doValidate) {
  const v = runAcmValidatePipeline(merged, { propertyType: 'casa', tese: 'construcao' })
  console.log('\n--- P-1 pos-merge ---')
  console.log(`n=${v.resumo.totalComparaveis} mediana=${v.resumo.medianaPrecoM2} mercado=${v.resumo.valorMercado}`)
  for (const g of v.gates) {
    console.log(`${g.ok ? 'OK' : '!!'} [${g.id}] ${g.detalhe}`)
  }
}

console.log('\nEXIT 0')
