/**
 * Excel de VALIDAÇÃO do corretor (Fase 1) — ACM Rua Dr. Andrade Pertence, 113.
 *
 * Mesmo protocolo do Honduras (03-build-xlsx), adaptado ao dataset deste caso
 * (base ITBI/PMSP em PROD, recorte declarado R1–R5 — ver dataset.json):
 *   - SEM S/V/D e SEM preço pedido (campos 100% NULL até a Story 9.4);
 *   - COM competência real da venda e homogeneização FipeZap por item;
 *   - COM tipologia e área de TERRENO da GUIA OFICIAL (regra R5, pós-incidente
 *     09-Jul): a conferência humana foca nas linhas "casa (provável)" (vendas
 *     2026 sem guia pública — heurística de lote declarada).
 *
 * Ranking pela ADERÊNCIA CANÔNICA (`adherenceIndex`, methodology.ts) com
 * self-check contra o Top 3 do laudo v1 antes de gravar.
 *
 * Rodar de `app/`:  npx -y tsx scripts/acm-andrade-pertence/07-build-xlsx.tsx
 * Saída: docs/acm/andrade-pertence-113/ACM-AndradePertence113-validacao-corretor.xlsx
 */
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

import { adherenceIndex, RAIO_PADRAO_M, type AcmTarget } from '@/lib/acm/methodology'
import {
  FIPEZAP_SP_FONTE,
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
  FIPEZAP_SP_VENDA_RESIDENCIAL,
} from '@/lib/acm/data/fipezapSpVendaResidencial'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(scriptDir, '..', '..', '..', 'docs', 'acm', 'andrade-pertence-113')
mkdirSync(outDir, { recursive: true })

interface DatasetComparavel {
  endereco: string
  areaConstruida: number
  areaTerreno: number | null
  preco: number
  precoM2: number
  distancia: number
  dataVenda: string | null
  dataReferencia: string | null
  bairroReal: string | null
  sqlCadastral: string | null
  tipologia: string
  tipologiaConfianca: string
}
const dataset = JSON.parse(readFileSync(path.join(outDir, 'dataset.json'), 'utf8')) as {
  target: {
    endereco: string
    bairro: string
    cep: string
    cidade: string
    uf: string
    areaConstruida: number
    areaTerreno: number
    dormitorios: number
    suites: number
    vagas: number
    anoConstrucao: number
    precoPretendido: number
  }
  recorte: { raioM: number; regras: string[]; funil: Record<string, number> }
  avisos: string[]
  comparaveis: DatasetComparavel[]
}
const T = dataset.target

// --- homogeneização por item (mesma série/referência do laudo) --------------
const idxPorMes = new Map(FIPEZAP_SP_VENDA_RESIDENCIAL.map((p) => [p.mes, p.indice]))
const idxRef = idxPorMes.get(FIPEZAP_SP_ULTIMA_COMPETENCIA)!
function fatorFipeZap(dataVenda: string | null): number | null {
  if (dataVenda == null) return null
  const idx = idxPorMes.get(dataVenda)
  return idx != null && idx > 0 ? idxRef / idx : null
}

// --- ranking pela aderência canônica ----------------------------------------
const target: AcmTarget = { areaConstruida: T.areaConstruida, areaTerreno: T.areaTerreno }
const ranked = dataset.comparaveis
  .map((c) => ({
    c,
    indice: adherenceIndex(target, {
      endereco: c.endereco,
      areaConstruida: c.areaConstruida,
      areaTerreno: c.areaTerreno ?? null,
      preco: c.preco,
      distancia: c.distancia,
    }).indice,
  }))
  .sort((a, b) => b.indice - a.indice)
  .map((x, i) => ({ ...x, rank: i + 1 }))

// Self-check contra o laudo v2 (computation.json) — não publicar ranking errado.
const ESPERADO = [
  'AV DR CARDOSO DE MELO 379',
  'R ELIZABETH TROVAO USUI 64',
  'R ELIZABETH TROVAO USUI 65',
]
const top3 = ranked.slice(0, 3).map((x) => x.c.endereco)
if (JSON.stringify(top3) !== JSON.stringify(ESPERADO)) {
  console.error(`Top 3 diverge do laudo v2: ${top3.join(' · ')} — abortando.`)
  process.exit(1)
}
console.log(`Top 3: ${top3.join(' · ')} → CONFERE com o laudo v2 ✓`)

// --- formatação --------------------------------------------------------------
const brl = (n: number | null) => (n == null ? '—' : `R$ ${Math.round(n).toLocaleString('pt-BR')}`)
const num = (n: number | null) => (n == null ? '—' : n.toLocaleString('pt-BR'))
const mapsLink = (endereco: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${endereco}, São Paulo, SP`)}`

const HEADER = [
  'Rank',
  'Endereço',
  'Bairro (verificação parcial)',
  'Mês/Ano venda (ITBI)',
  'Área (m² — guia)',
  'Terreno (m² — guia)',
  'Tipologia (guia oficial)',
  'Valor venda (ITBI)',
  'R$/m²',
  `Fator FipeZap → ${FIPEZAP_SP_ULTIMA_COMPETENCIA}`,
  'R$/m² homogeneizado',
  'SQL cadastral (GeoSampa)',
  'Distância ao alvo (aprox.)',
  'Google Maps',
  'Tipologia (casa/sobrado?)',
  'Confere? (✓/✗/?)',
  'Correção',
  'Observação do corretor',
]
const WIDTH: Record<string, number> = {
  Rank: 6,
  Endereço: 32,
  'Bairro (verificação parcial)': 22,
  'Mês/Ano venda (ITBI)': 18,
  'Área (m² — guia)': 14,
  'Terreno (m² — guia)': 16,
  'Tipologia (guia oficial)': 24,
  'Valor venda (ITBI)': 18,
  'R$/m²': 12,
  [`Fator FipeZap → ${FIPEZAP_SP_ULTIMA_COMPETENCIA}`]: 20,
  'R$/m² homogeneizado': 18,
  'SQL cadastral (GeoSampa)': 20,
  'Distância ao alvo (aprox.)': 20,
  'Google Maps': 14,
  'Tipologia (casa/sobrado?)': 22,
  'Confere? (✓/✗/?)': 14,
  Correção: 22,
  'Observação do corretor': 32,
}
const COL_MAPS = HEADER.indexOf('Google Maps')

function buildRow(x: { c: DatasetComparavel; rank: number }): (string | number)[] {
  const { c, rank } = x
  const fator = fatorFipeZap(c.dataVenda)
  return [
    rank,
    c.endereco,
    c.bairroReal ?? 'não verificado',
    c.dataVenda ?? '— (fora da série)',
    num(c.areaConstruida),
    num(c.areaTerreno),
    c.tipologia === 'casa' ? 'casa (guia oficial)' : c.tipologia,
    brl(c.preco),
    num(Math.round(c.precoM2)),
    fator == null ? '— (sem ajuste)' : fator.toFixed(4),
    fator == null ? num(Math.round(c.precoM2)) : num(Math.round(c.precoM2 * fator)),
    c.sqlCadastral ?? '—',
    `~${num(c.distancia)} m (geocode da base)`,
    'Abrir no Maps',
    '', // Tipologia — corretor confirma casa/sobrado × unidade avulsa
    '',
    '',
    '',
  ]
}

function sheetFromRanked(list: { c: DatasetComparavel; rank: number }[]): XLSX.WorkSheet {
  const aoa = [HEADER, ...list.map(buildRow)]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = HEADER.map((h) => ({ wch: WIDTH[h] || 14 }))
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(HEADER.length - 1)}1` }
  ws['!freeze'] = { xSplit: 2, ySplit: 1 }
  list.forEach((x, i) => {
    const cell = XLSX.utils.encode_cell({ r: i + 1, c: COL_MAPS })
    if (ws[cell]) ws[cell].l = { Target: mapsLink(x.c.endereco), Tooltip: 'Abrir no Google Maps' }
  })
  return ws
}

// --- Leia-me ------------------------------------------------------------------
function sheetLeiame(): XLSX.WorkSheet {
  const rows = [
    ['DOCUMENTO DE VALIDAÇÃO DE COMPARÁVEIS — ACM (Fase 1)'],
    ['Imóvel-alvo', `${T.endereco} — ${T.bairro} (CEP ${T.cep}), ${T.cidade}/${T.uf}`],
    [
      'Programa do alvo',
      `${T.areaConstruida} m² constr. · ${T.areaTerreno} m² terreno · ${T.dormitorios} dorm (1 suíte adaptada) · ${T.vagas} vaga · construção ${T.anoConstrucao} · reforma geral`,
    ],
    ['Valor referenciado pela proprietária', brl(T.precoPretendido)],
    ['Raio de análise', `${RAIO_PADRAO_M} m`],
    ['Consultora', 'Luciana Borba — RE/MAX Galeria (CRECI 045063-J)'],
    ['Fonte', 'Base ITBI/PMSP em PROD (acm_comparaveis) — dataset congelado dataset.json (laudo v1 de 09/07/2026)'],
    [''],
    [
      'OBJETIVO',
      'Validar, linha a linha, os comparáveis do ACM. A tipologia já vem CONFIRMADA pela guia oficial (uso IPTU) para vendas ≤ 2025; as linhas "casa (provável)" são vendas 2026 sem guia pública — priorize a conferência delas.',
    ],
    [''],
    ['RECORTE DA AMOSTRA (declarado no laudo, Sec. 4)'],
    ...dataset.recorte.regras.map((r) => ['', r]),
    [
      'Funil',
      `${dataset.recorte.funil.rpcNoRaio} vendas no raio → ${dataset.recorte.funil.aposVendaUnica} com venda única no endereço → ${dataset.recorte.funil.aposClasseValor} após filtro de classe (amostra final)`,
    ],
    [''],
    [
      'ORDENAÇÃO',
      `Ranking por ADERÊNCIA da metodologia: área construída (50%) + área terreno (20% — terreno real da guia oficial nas casas confirmadas) + proximidade (30%). Top 3 = ${top3.join(' · ')}.`,
    ],
    ['ABAS', 'Top 5 / Top 10 / Top 20 / Todos (120) = mesma lista, recortada. Ofertas ativas e Terrenos = ver notas nas abas.'],
    [''],
    ['LEGENDA DAS COLUNAS'],
    ['Bairro (verificação parcial)', 'Por NOME de logradouro no ViaCEP, restrito aos bairros do raio (V. Olímpia / Moema / V. N. Conceição etc.). Não é o CEP da guia (Story 9.4). "não verificado" = inconclusivo.'],
    ['Mês/Ano venda (ITBI)', 'Competência real da guia (data_referencia da base).'],
    ['Área (m² — guia)', 'Campo area_m2 da guia ITBI ingerida. ATENÇÃO: presume-se área CONSTRUÍDA; em guias de casa pode haver ambiguidade com terreno — apontar na Observação se conhecer o imóvel.'],
    [`Fator FipeZap → ${FIPEZAP_SP_ULTIMA_COMPETENCIA}`, `Deflação a valor presente pela série ${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte} (${FIPEZAP_SP_FONTE.url}). Vendas fora da série (2023) entram SEM ajuste.`],
    ['SQL cadastral', 'Setor/Quadra/Lote — consultável no GeoSampa (geosampa.prefeitura.sp.gov.br).'],
    ['Distância ao alvo', 'APROXIMADA: coordenadas da base geocodificadas por logradouro/CEP (±~200 m). Não usada como evidência.'],
    ['Tipologia (casa/sobrado?)', '✓ = casa/sobrado (comparável válido) · ✗ = unidade avulsa de prédio/condomínio (excluir) · ? = não identificável.'],
    [''],
    ['PENDÊNCIAS DESTA EMISSÃO (condicionantes do laudo v1)'],
    ['Lente de terreno', 'MEDIDA nesta emissão (v2): área de terreno real das guias oficiais das casas confirmadas. Laudo v2: construção R$ 723,5 mil–1,094M (aderente R$ 1.060.626) e leitura direta de terreno convergente — o valor da proprietária (R$ 1,1M) é defensável.'],
    ['Ofertas ativas', 'Concorrência à venda não levantada — Fase 2 (re-verificação web).'],
    ['Fatores de liquidez', 'A definir com a consultora — nesta emissão, fechamento = mercado.'],
    [''],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 34 }, { wch: 115 }]
  return ws
}

// --- main ---------------------------------------------------------------------
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, sheetLeiame(), 'Leia-me')
XLSX.utils.book_append_sheet(wb, sheetFromRanked(ranked.slice(0, 5)), 'Top 5')
XLSX.utils.book_append_sheet(wb, sheetFromRanked(ranked.slice(0, 10)), 'Top 10')
XLSX.utils.book_append_sheet(wb, sheetFromRanked(ranked.slice(0, 20)), 'Top 20')
XLSX.utils.book_append_sheet(wb, sheetFromRanked(ranked), `Todos (${ranked.length})`)

const wsOfertas = XLSX.utils.aoa_to_sheet([
  ['OFERTAS ATIVAS (concorrência à venda)'],
  ['Status', 'Não levantadas nesta emissão.'],
  ['Motivo', 'Corresponde à Fase 2 do workflow ACM (re-verificação web — portais/anúncios no raio). A âncora do laudo v1 são exclusivamente fechamentos reais de ITBI.'],
  ['Ação', 'Levantar sobrados/casas à venda no raio de 1 km para calibrar teto competitivo e deságio esperado antes da conversa de preço.'],
])
wsOfertas['!cols'] = [{ wch: 20 }, { wch: 110 }]
XLSX.utils.book_append_sheet(wb, wsOfertas, 'Ofertas ativas')

const wsTerrenos = XLSX.utils.aoa_to_sheet([
  ['LENTE DE TERRENO — PENDÊNCIA Nº 1 DO LAUDO'],
  ['Status', 'Não mensurável nesta emissão.'],
  ['Motivo', 'A base ITBI em PROD não expõe área de terreno por comparável (campos da Story 9.4 = 100% NULL). Sem R$/m² de terreno, o efeito-escala e a comparação direta de terreno ficam inertes.'],
  ['Por que importa', `O alvo é um sobrado de ${T.areaConstruida} m² construídos (1974, reforma geral) sobre ${T.areaTerreno} m² de terreno na Vila Olímpia — o valor está majoritariamente na TERRA. Na emissão v2 a lente de terreno já é medida pelas guias oficiais e converge com o valor referenciado pela proprietária (R$ 1,1M).`],
  ['Ação', 'Backfill das guias ITBI (Story 9.4) OU parâmetros de residual (VGV, custo de obra, margem) elicitados com a consultora.'],
])
wsTerrenos['!cols'] = [{ wch: 20 }, { wch: 110 }]
XLSX.utils.book_append_sheet(wb, wsTerrenos, 'Terrenos')

const outPath = path.join(outDir, 'ACM-AndradePertence113-validacao-corretor.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`Excel gerado: ${outPath}`)
console.log(`Abas: Leia-me, Top 5, Top 10, Top 20, Todos (${ranked.length}), Ofertas ativas, Terrenos`)
