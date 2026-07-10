/**
 * Excel de VALIDAÇÃO do corretor (Fase 1) — ACM Rua Dr. Andrade Pertence, 132
 * (caso Rodolpho — anunciado a R$ 1.495.000).
 *
 * Mesmo protocolo do caso 113 (scripts/acm-andrade-pertence/07-build-xlsx.tsx):
 * ranking pela aderência canônica (`adherenceIndex`) com self-check contra o
 * Top 3 do laudo v3, homogeneização FipeZap por item e TIPOLOGIA/TERRENO da
 * GUIA OFICIAL (regra R5, pós-incidente 09-Jul — a ingestão da base descartava
 * o "Complemento" da guia e ~50% da amostra do proxy eram apartamentos).
 *
 * Específico deste caso: as duas transações ITBI da PRÓPRIA rua (nº 45 e nº 110)
 * são unidades VERTICAIS (guia oficial/heurística de lote) e estão FORA da
 * amostra — nota na aba Leia-me.
 *
 * Rodar de `app/`:  npx -y tsx scripts/acm-andrade-pertence-132/07-build-xlsx.tsx
 * Saída: docs/acm/andrade-pertence-132/ACM-AndradePertence132-validacao-corretor.xlsx
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const outDir = path.resolve(scriptDir, '..', '..', '..', 'docs', 'acm', 'andrade-pertence-132')
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
    proprietario: string
    areaConstruida: number
    areaTerreno: number | null
    dormitorios: number
    suites: number
    vagas: number
    estado: string
    precoPretendido: number
    precoPedidoReal: number
  }
  recorte: { raioM: number; regras: string[]; funil: Record<string, number> }
  avisos: string[]
  comparaveis: DatasetComparavel[]
}
const T = dataset.target
// Área construída oficial = 196 m² (confirmada; dataset trazia 220 estimado).
// Mantém o ranking de aderência da XLSX em sincronia com o laudo v4.
T.areaConstruida = 196

// --- homogeneização por item (mesma série/referência do laudo) --------------
const idxPorMes = new Map(FIPEZAP_SP_VENDA_RESIDENCIAL.map((p) => [p.mes, p.indice]))
const idxRef = idxPorMes.get(FIPEZAP_SP_ULTIMA_COMPETENCIA)!
function fatorFipeZap(dataVenda: string | null): number | null {
  if (dataVenda == null) return null
  const idx = idxPorMes.get(dataVenda)
  return idx != null && idx > 0 ? idxRef / idx : null
}

// --- ranking pela aderência canônica (terreno do alvo não informado → 0) ----
const target: AcmTarget = { areaConstruida: T.areaConstruida, areaTerreno: 0 }
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

// Self-check contra o laudo v4 (computation.json) — não publicar ranking errado.
// v4: área construída do alvo fixada em 196 m² (era 220 estimado) → o ranking de
// aderência muda (Ubaíra 250 m² sai do Top 3; entra TV Sebastião Emílio Forli 58).
const ESPERADO = ['R JURUENA 87', 'R PARIQUERA-ACU 41', 'TV SEBASTIAO EMILIO FORLI 58']
const top3 = ranked.slice(0, 3).map((x) => x.c.endereco)
if (JSON.stringify(top3) !== JSON.stringify(ESPERADO)) {
  console.error(`Top 3 diverge do laudo v4: ${top3.join(' · ')} — abortando.`)
  process.exit(1)
}
console.log(`Top 3: ${top3.join(' · ')} → CONFERE com o laudo v4 ✓`)

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
  Endereço: 34,
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
  'Distância ao alvo (aprox.)': 24,
  'Google Maps': 14,
  'Tipologia (casa/sobrado?)': 22,
  'Confere? (✓/✗/?)': 14,
  Correção: 22,
  'Observação do corretor': 34,
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
    c.tipologia !== 'casa' ? 'PRIORIDADE: venda 2026 sem guia pública — confirmar tipologia' : '',
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
    ['Imóvel-alvo', `${T.endereco} — ${T.bairro} (CEP ${T.cep}), ${T.cidade}/${T.uf} · proprietário: ${T.proprietario}`],
    [
      'Programa do alvo',
      `${T.areaConstruida} m² constr. (anúncios divergem 196–220 — confirmar) · terreno NÃO informado · ${T.dormitorios} quartos (${T.suites} suítes) · ${T.vagas} vagas · ${T.estado}`,
    ],
    ['Preço anunciado (estagnado)', `${brl(T.precoPedidoReal)} — 70+ anúncios em 3 portais com informações divergentes`],
    ['Raio de análise', `${RAIO_PADRAO_M} m`],
    ['Consultora', 'Luciana Borba — RE/MAX Galeria (CRECI 045063-J)'],
    ['Fonte', 'Base ITBI/PMSP em PROD (acm_comparaveis) — dataset congelado dataset.json (laudo v1 de 09/07/2026)'],
    [''],
    [
      'OBJETIVO',
      'Validar, linha a linha, os comparáveis do ACM. A tipologia já vem CONFIRMADA pela guia oficial (uso IPTU) para vendas ≤ 2025; as linhas "casa (provável)" são vendas 2026 sem guia pública — priorize a conferência delas.',
    ],
    [
      'LEITURA DO LAUDO v2 (amostra depurada)',
      `Faixa ITBI homogeneizada (só CASAS): R$ 1.991.167 – 1.992.445, três recortes convergindo. O anúncio atual (${brl(T.precoPedidoReal)}) está ~33,2% ABAIXO da referência — tese de SUBPRECIFICAÇÃO reforçada após a depuração. A validação desta planilha confirma ou derruba essa tese.`,
    ],
    [
      'NOTA — PRÓPRIA RUA',
      'As duas únicas transações ITBI da Rua Dr. Andrade Pertence no período são unidades VERTICAIS (nº 45 = "AP 82" por guia oficial; nº 110 = unidade provável por faixa de lote) e foram EXCLUÍDAS da amostra pela regra R5. Não há fechamento de casa na própria rua no período coberto.',
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
      `Ranking por ADERÊNCIA da metodologia: área construída (50%) + área terreno (20% — inerte só pelo lado do alvo: metragem não informada) + proximidade (30%). Top 3 = ${top3.join(' · ')}.`,
    ],
    ['ABAS', `Top 5 / Top 10 / Top 20 / Todos (${ranked.length}) = mesma lista, recortada. Ofertas ativas e Terrenos = ver notas nas abas.`],
    [''],
    ['LEGENDA DAS COLUNAS'],
    ['Bairro (verificação parcial)', 'Por NOME de logradouro no ViaCEP, restrito aos bairros do raio. Não é o CEP da guia (Story 9.4). "não verificado" = inconclusivo.'],
    ['Mês/Ano venda (ITBI)', 'Competência real da guia (data_referencia da base).'],
    ['Área (m² — guia)', 'Campo area_m2 da guia ITBI ingerida. Presume-se área CONSTRUÍDA; em guias de casa pode haver ambiguidade com terreno — apontar na Observação.'],
    [`Fator FipeZap → ${FIPEZAP_SP_ULTIMA_COMPETENCIA}`, `Deflação a valor presente pela série ${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte} (${FIPEZAP_SP_FONTE.url}). Vendas fora da série (2023) entram SEM ajuste.`],
    ['SQL cadastral', 'Setor/Quadra/Lote — consultável no GeoSampa (geosampa.prefeitura.sp.gov.br).'],
    ['Distância ao alvo', 'APROXIMADA: coordenadas da base geocodificadas por logradouro/CEP (±~200 m). Não usada como evidência.'],
    [''],
    ['PENDÊNCIAS DESTA EMISSÃO (condicionantes do laudo v1)'],
    ['Metragens oficiais', 'Confirmar na matrícula/IPTU a área construída (196 × 220 m²) e a metragem do TERRENO do alvo (não informada em nenhuma fonte).'],
    ['Tipologia (nota técnica)', 'R5: crosscheck por SQL contra as guias oficiais da SF excluiu 57 unidades verticais que o proxy "venda única" deixava passar (a ingestão da base descartou o complemento "AP xx" da guia). Vendas 2026: heurística de lote até a SF publicar o arquivo.'],
    ['Capex Score B', 'O valor de mercado embute −15% de Capex (régua Score B). Para imóvel conservado, dedução conservadora — faixa real tende ao topo. Revisar com a consultora.'],
    ['Ofertas ativas', 'Concorrência à venda excluída desta emissão por decisão de processo — âncora exclusivamente em fechamentos reais.'],
    ['Fatores de liquidez', 'A definir com a consultora — nesta emissão, fechamento = mercado.'],
    [''],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 34 }, { wch: 118 }]
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
  ['Status', 'Deliberadamente excluídas desta emissão (decisão de processo).'],
  ['Motivo', 'O posicionamento do caso 132 é ancorado exclusivamente em fechamentos reais (ITBI). As 3 amostras de preço pedido da apresentação de abril/2026 NÃO entram na estatística.'],
  ['Ação', 'Se a consultora quiser o teto competitivo, levantar sobrados/casas à venda no raio (Fase 2 — re-verificação web).'],
])
wsOfertas['!cols'] = [{ wch: 20 }, { wch: 112 }]
XLSX.utils.book_append_sheet(wb, wsOfertas, 'Ofertas ativas')

const wsTerrenos = XLSX.utils.aoa_to_sheet([
  ['LENTE DE TERRENO — PENDÊNCIA'],
  ['Status', 'Não mensurável nesta emissão.'],
  ['Motivo', 'Nem o alvo (metragem de terreno não informada na apresentação/anúncios) nem a base ITBI (campos da Story 9.4 = 100% NULL) trazem área de terreno.'],
  ['Por que importa', 'Quintal com garagem para 6 veículos sugere lote relevante. As vendas da própria rua (R$ 2,1–2,4M) podem refletir terrenos maiores — sem a metragem, a comparação fica incompleta.'],
  ['Ação', 'Matrícula/IPTU do alvo + guias vizinhas no GeoSampa (SQL na planilha) + backfill ITBI (Story 9.4).'],
])
wsTerrenos['!cols'] = [{ wch: 20 }, { wch: 112 }]
XLSX.utils.book_append_sheet(wb, wsTerrenos, 'Terrenos')

// Grava com fallback -revN (EBUSY = arquivo aberto no Excel).
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
let outPath = path.join(outDir, 'ACM-AndradePertence132-validacao-corretor.xlsx')
for (let rev = 0; ; rev++) {
  const alvo =
    rev === 0 ? outPath : outPath.replace(/\.xlsx$/i, `-rev${rev + 1}.xlsx`)
  try {
    writeFileSync(alvo, buf)
    outPath = alvo
    break
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EBUSY' || rev >= 9) throw err
  }
}
console.log(`Excel gerado: ${outPath}`)
console.log(`Abas: Leia-me, Top 5, Top 10, Top 20, Todos (${ranked.length}), Ofertas ativas, Terrenos`)
