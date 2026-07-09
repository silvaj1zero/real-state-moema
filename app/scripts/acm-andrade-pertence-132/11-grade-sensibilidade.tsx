/**
 * Grade de sensibilidade do caso 132 — média × mediana por recorte (Top 5/10/20/todos),
 * valor do alvo COM e SEM o deságio de Capex (Score B = −15%).
 * Usa a MESMA homogeneização FipeZap e o MESMO ranking de aderência do método.
 * Rodar de `app/`:  npx -y tsx scripts/acm-andrade-pertence-132/11-grade-sensibilidade.tsx
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  rankByAdherence,
  deflacionarComparaveis,
  median,
  CAPEX_BY_SCORE,
  type AcmComparable,
} from '@/lib/acm/methodology'
import {
  FIPEZAP_SP_FONTE,
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
  FIPEZAP_SP_VENDA_RESIDENCIAL,
} from '@/lib/acm/data/fipezapSpVendaResidencial'

interface RawComparavel {
  endereco: string
  areaConstruida: number
  areaTerreno: number | null
  preco: number
  distancia: number
  dataVenda: string | null
  bairroReal: string | null
}

interface LinhaGrade {
  recorte: string
  medM2: number
  avgM2: number
  medSem: number
  medCom: number
  avgSem: number
  avgCom: number
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const dataset = JSON.parse(
  readFileSync(path.join(repoRoot, 'docs', 'acm', 'andrade-pertence-132', 'dataset.json'), 'utf8'),
)
const AREA = dataset.target.areaConstruida as number
const CAPEX = CAPEX_BY_SCORE.B // 0.15 — Score B do alvo

const comparaveis: AcmComparable[] = (dataset.comparaveis as RawComparavel[]).map((c) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  dataVenda: c.dataVenda,
  bairroReal: c.bairroReal,
  isVendaReal: true,
}))

// Homogeneização temporal FipeZap (idêntica ao laudo).
const { comparaveis: homog } = deflacionarComparaveis(comparaveis, {
  indice: `${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte}`,
  serie: FIPEZAP_SP_VENDA_RESIDENCIAL,
  dataReferencia: FIPEZAP_SP_ULTIMA_COMPETENCIA,
})
const byEndereco = new Map(homog.map((c) => [c.endereco, c]))
const ranked = rankByAdherence(dataset.target, homog, dataset.recorte.raioM)
const m2 = (c: AcmComparable) => c.preco / c.areaConstruida

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const fmt = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`
const fmt2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

console.log(`\nAlvo: ${dataset.target.endereco} | área ${AREA} m² | Score B (Capex ${CAPEX * 100}%)`)
console.log(`Homogeneização: ${FIPEZAP_SP_FONTE.indice} → ${FIPEZAP_SP_ULTIMA_COMPETENCIA}`)
console.log(`Comparáveis na amostra: ${homog.length}\n`)

const recortes = [5, 10, 20, homog.length]
const linhas: LinhaGrade[] = []
for (const n of recortes) {
  const set = ranked.slice(0, n).map((r) => byEndereco.get(r.endereco)!).filter(Boolean)
  const vals = set.map(m2)
  const med = median(vals)
  const avg = mean(vals)
  linhas.push({
    recorte: n === homog.length ? `Todos (${n})` : `Top ${n}`,
    medM2: med,
    avgM2: avg,
    medSem: med * AREA,
    medCom: med * AREA * (1 - CAPEX),
    avgSem: avg * AREA,
    avgCom: avg * AREA * (1 - CAPEX),
  })
}

console.log('R$/m² homogeneizado por recorte:')
console.log('Recorte        | mediana R$/m² | média R$/m²')
for (const l of linhas)
  console.log(`${l.recorte.padEnd(14)} | ${fmt2(l.medM2).padStart(12)} | ${fmt2(l.avgM2).padStart(12)}`)

console.log(`\nVALOR DO ALVO (${AREA} m²) — SEM deságio (bruto = R$/m² × área):`)
console.log('Recorte        | por MEDIANA      | por MÉDIA')
for (const l of linhas)
  console.log(`${l.recorte.padEnd(14)} | ${fmt(l.medSem).padStart(15)} | ${fmt(l.avgSem).padStart(15)}`)

console.log(`\nVALOR DE MERCADO — COM deságio Capex −${CAPEX * 100}% (× ${(1 - CAPEX).toFixed(2)}):`)
console.log('Recorte        | por MEDIANA      | por MÉDIA')
for (const l of linhas)
  console.log(`${l.recorte.padEnd(14)} | ${fmt(l.medCom).padStart(15)} | ${fmt(l.avgCom).padStart(15)}`)

// Envelopes
const todosSem = linhas.flatMap((l) => [l.medSem, l.avgSem])
const todosCom = linhas.flatMap((l) => [l.medCom, l.avgCom])
console.log(`\nEnvelope SEM deságio: ${fmt(Math.min(...todosSem))} – ${fmt(Math.max(...todosSem))}`)
console.log(`Envelope COM deságio: ${fmt(Math.min(...todosCom))} – ${fmt(Math.max(...todosCom))}`)
console.log(`Anúncio atual: ${fmt(dataset.target.precoPedidoReal)}\n`)
