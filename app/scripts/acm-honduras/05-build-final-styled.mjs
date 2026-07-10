/**
 * ARQUIVO ÚNICO FINAL — ACM Rua Honduras, 629 (Fase 1 + Fase 2 + validação).
 * Gera um xlsx estilizado com exceljs:
 *   - Cores condicionais (verde=confirmado, amarelo=não confirmado/pendente,
 *     vermelho=divergência/inconsistência, cinza=não re-verificado).
 *   - Dropdown de validação (✓/✗/?) na coluna "Confere?".
 *   - Abas: Leia-me · Top 3 · Top 5 · Top 10 · Todos (23) · Ofertas ativas · Terrenos.
 *
 * Rodar: cd app && node scripts/acm-honduras/05-build-final-styled.mjs
 * Saída: docs/acm/honduras-629/ACM-Honduras629-VALIDACAO-FINAL.xlsx
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import ExcelJS from 'exceljs'
import { TARGET, COMPARAVEIS, OFERTAS_ATIVAS, PERIODO_ITBI } from './honduras-dataset.mjs'
import { adherence as adherenceShared, RAIO_PADRAO_M } from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIO = RAIO_PADRAO_M
let reverif
try {
  reverif = JSON.parse(readFileSync(resolve(__dirname, 'reverify-result.json'), 'utf8'))
} catch (err) {
  console.error(
    'reverify-result.json ausente ou inválido — rode antes a Fase 2 ' +
      '(reverify-web.workflow.mjs) para gerar o resultado da re-verificação.\n' +
      `Detalhe: ${err.message}`,
  )
  process.exit(1)
}
const byEnd = new Map(reverif.map((r) => [r.endereco, r]))

// --- aderência (cópia única em lib.mjs; paridade testada no vitest) ---------
const adherence = (c) => adherenceShared(TARGET, c, RAIO)

const brl = (n) => (n == null ? '—' : `R$ ${n.toLocaleString('pt-BR')}`)
const num = (n) => (n == null ? '—' : n.toLocaleString('pt-BR'))
const svdTxt = (svd, k) => (svd && svd[k] != null ? svd[k] : '—')
const mapsLink = (addr) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr + ', São Paulo, SP')}`

function bairroWeb(rv) {
  const t = `${rv?.evidencia ?? ''} ${rv?.motivoRejeicao ?? ''}`
  if (/Jardim Paulista/i.test(t)) return '⚠ Portais: Jardim Paulista (laudo diz Jd. América)'
  if (/Jardim Europa/i.test(t)) return 'Jardim Europa'
  return '—'
}
const reverifStatus = (rv) =>
  !rv ? 'Não re-verificado (off-market ITBI)'
    : rv.confirmado ? '✓ Confirmado na web'
    : rv.status === 'nao_encontrado' ? '✗ Anúncio não encontrado'
    : '⚠ Não confirmado (ver observação)'
const programaWeb = (rv) => {
  const p = rv?.programaAnuncio
  return p ? `${p.dormitorios ?? '—'} / ${p.suites ?? '—'} / ${p.vagas ?? '—'}` : '—'
}
const obsWeb = (rv) => {
  if (!rv) return '—'
  const txt = rv.confirmado ? rv.evidencia : rv.motivoRejeicao || rv.evidencia || ''
  return (txt || '—').replace(/\s+/g, ' ').slice(0, 500)
}
const programaStatusLaudo = (c) =>
  !c.svd ? 'Sem dado — confirmar em anúncio'
    : c.svd.s != null && c.svd.d != null && c.svd.s > c.svd.d ? 'Inconsistente (suítes>dorm)'
    : c.status === 'anúncio confirmado' ? 'Sim — anúncio recuperado'
    : 'Não confirmado (laudo Sec.5)'

// --- paleta ----------------------------------------------------------------
const FILL = {
  header: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } },
  green: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } },
  yellow: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } },
  red: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } },
  gray: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
  bannerR: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } },
}
const FONT = {
  green: { color: { argb: 'FF006100' } },
  yellow: { color: { argb: 'FF9C6500' } },
  red: { color: { argb: 'FF9C0006' } },
  gray: { color: { argb: 'FF7F7F7F' } },
}
const semaforoReverif = (txt) =>
  txt.startsWith('✓') ? 'green' : txt.startsWith('✗') ? 'red' : txt.startsWith('⚠') ? 'yellow' : 'gray'
const semaforoPrograma = (txt) =>
  txt.startsWith('Sim') ? 'green' : txt.startsWith('Inconsistente') ? 'red' : 'yellow'

// --- colunas ---------------------------------------------------------------
const COLS = [
  { h: 'Rank', w: 6 }, { h: 'Ref. (PMSP)', w: 11 }, { h: 'Endereço', w: 30 }, { h: 'Bairro (laudo)', w: 15 },
  { h: 'Dorm (inclui suítes)', w: 12 }, { h: 'Suíte', w: 7 }, { h: 'Vagas', w: 7 }, { h: 'Programa confirmado? (laudo)', w: 26 },
  { h: 'Área constr. (m²)', w: 14 }, { h: 'Área terreno (m²)', w: 14 }, { h: 'Valor venda ITBI', w: 17 }, { h: 'Valor anúncio/pedido (laudo)', w: 20 },
  { h: 'Distância ao alvo', w: 16 }, { h: 'SQL cadastral', w: 14 },
  { h: 'Re-verif. (web)', w: 26 }, { h: 'Anúncio web (URL)', w: 22 }, { h: 'Preço web (atual)', w: 17 }, { h: 'Programa web (D/S/V)', w: 17 },
  { h: 'Bairro real (web)', w: 36 }, { h: 'Observação web', w: 70 }, { h: 'Google Maps', w: 14 },
  { h: 'Confere? (✓/✗/?)', w: 14 }, { h: 'Correção', w: 22 }, { h: 'Observação do corretor', w: 28 },
]
const IDX = Object.fromEntries(COLS.map((c, i) => [c.h, i + 1])) // 1-based (exceljs)

function rowComparavel(c, rank) {
  const rv = byEnd.get(c.end)
  return {
    Rank: rank, Ref: c.ref, end: c.end, bairro: c.bairro,
    d: svdTxt(c.svd, 'd'), s: svdTxt(c.svd, 's'), v: svdTxt(c.svd, 'v'), progLaudo: programaStatusLaudo(c),
    areaC: num(c.areaConstruida), areaT: num(c.areaTerreno), venda: brl(c.preco), pedido: brl(c.precoPedido),
    dist: c.dist != null ? `${num(c.dist)} m (laudo)` : '—', sql: c.sql ?? '—',
    reverif: reverifStatus(rv), url: rv?.url ?? null, precoWeb: rv ? brl(rv.precoAtual) : '—', progWeb: programaWeb(rv),
    bairroW: bairroWeb(rv), obsW: obsWeb(rv), maps: mapsLink(c.end),
  }
}

function addComparaveisSheet(wb, title, list) {
  const ws = wb.addWorksheet(title, { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] })
  ws.columns = COLS.map((c) => ({ header: c.h, key: c.h, width: c.w }))
  // header style
  const hr = ws.getRow(1)
  hr.eachCell((cell) => { cell.fill = FILL.header; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { wrapText: true, vertical: 'middle' } })
  hr.height = 30
  list.forEach(({ c, rank }) => {
    const r = rowComparavel(c, rank)
    const row = ws.addRow([
      r.Rank, r.Ref, r.end, r.bairro, r.d, r.s, r.v, r.progLaudo, r.areaC, r.areaT, r.venda, r.pedido,
      r.dist, r.sql, r.reverif, '', r.precoWeb, r.progWeb, r.bairroW, r.obsW, '', '', '', '',
    ])
    row.alignment = { vertical: 'top' }
    // links
    if (r.url) row.getCell(IDX['Anúncio web (URL)']).value = { text: 'Abrir anúncio', hyperlink: r.url }
    else row.getCell(IDX['Anúncio web (URL)']).value = '—'
    row.getCell(IDX['Google Maps']).value = { text: 'Abrir no Maps', hyperlink: r.maps }
    row.getCell(IDX['Anúncio web (URL)']).font = { color: { argb: 'FF0563C1' }, underline: true }
    row.getCell(IDX['Google Maps']).font = { color: { argb: 'FF0563C1' }, underline: true }
    // semáforos
    const svR = semaforoReverif(r.reverif)
    paint(row.getCell(IDX['Re-verif. (web)']), svR)
    const svP = semaforoPrograma(r.progLaudo)
    paint(row.getCell(IDX['Programa confirmado? (laudo)']), svP)
    if (r.bairroW.startsWith('⚠')) paint(row.getCell(IDX['Bairro real (web)']), 'red')
    // dropdown de validação
    row.getCell(IDX['Confere? (✓/✗/?)']).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"✓,✗,?"'], showErrorMessage: false,
    }
  })
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } }
  ws.getColumn(IDX['Observação web']).alignment = { wrapText: true, vertical: 'top' }
  return ws
}
function paint(cell, sem) { cell.fill = FILL[sem]; cell.font = FONT[sem] }

// --- ofertas ---------------------------------------------------------------
function addOfertasSheet(wb) {
  const OF = ['Endereço', 'Bairro (laudo)', 'Área constr. (m²)', 'Valor anúncio (laudo)', 'Distância',
    'Re-verif. (web)', 'Anúncio web (URL)', 'Preço web (atual)', 'Programa web (D/S/V)', 'Bairro real (web)', 'Observação web', 'Google Maps', 'Confere? (✓/✗/?)', 'Observação']
  const W = [28, 15, 14, 20, 12, 26, 22, 17, 17, 36, 70, 14, 14, 26]
  const ws = wb.addWorksheet('Ofertas ativas', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = OF.map((h, i) => ({ header: h, key: h, width: W[i] }))
  const hr = ws.getRow(1)
  hr.eachCell((cell) => { cell.fill = FILL.header; cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; cell.alignment = { wrapText: true, vertical: 'middle' } })
  hr.height = 30
  OFERTAS_ATIVAS.forEach((o) => {
    const rv = byEnd.get(o.end)
    const reverif = reverifStatus(rv), bw = bairroWeb(rv)
    const row = ws.addRow([o.end, o.bairro, num(o.areaConstruida), brl(o.precoPedido), o.dist != null ? `${num(o.dist)} m` : '—',
      reverif, '', rv ? brl(rv.precoAtual) : '—', programaWeb(rv), bw, obsWeb(rv), '', '', ''])
    row.alignment = { vertical: 'top' }
    if (rv?.url) row.getCell(7).value = { text: 'Abrir anúncio', hyperlink: rv.url }
    else row.getCell(7).value = '—'
    row.getCell(12).value = { text: 'Abrir no Maps', hyperlink: mapsLink(o.end) }
    row.getCell(7).font = { color: { argb: 'FF0563C1' }, underline: true }
    row.getCell(12).font = { color: { argb: 'FF0563C1' }, underline: true }
    paint(row.getCell(6), semaforoReverif(reverif))
    if (bw.startsWith('⚠')) paint(row.getCell(10), 'red')
    row.getCell(13).dataValidation = { type: 'list', allowBlank: true, formulae: ['"✓,✗,?"'], showErrorMessage: false }
  })
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: OF.length } }
  ws.getColumn(11).alignment = { wrapText: true, vertical: 'top' }
}

// --- Leia-me + Terrenos ----------------------------------------------------
function addLeiame(wb, conf, total, top3) {
  const ws = wb.addWorksheet('Leia-me')
  ws.columns = [{ width: 34 }, { width: 120 }]
  const add = (a, b, opt = {}) => {
    const row = ws.addRow([a, b])
    if (opt.title) { row.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1F3864' } } }
    if (opt.bold) row.getCell(1).font = { bold: true }
    if (opt.banner) { row.getCell(1).fill = FILL.bannerR; row.getCell(2).fill = FILL.bannerR; row.getCell(1).font = { bold: true, color: { argb: 'FF9C0006' } } }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.alignment = { vertical: 'top' }
  }
  add('ACM Rua Honduras, 629 — VALIDAÇÃO (arquivo único: Fase 1 + Fase 2)', '', { title: true })
  add('Imóvel-alvo', `${TARGET.endereco} — ${TARGET.bairro}, ${TARGET.cidade}/${TARGET.uf} · 800 m² constr / 1000 m² terreno · 4 dorm · 2 suítes · 10 vagas · Score B`)
  add('Fonte', 'Laudo ACM Honduras v4 (Luciana Borba, RE/MAX Galeria, 09/06/2026) + re-verificação web jun/2026')
  add('Período ITBI', PERIODO_ITBI)
  add('', '')
  add('COMO VALIDAR', 'Em cada aba, use o dropdown "Confere? (✓/✗/?)" e os campos "Correção"/"Observação". Priorize as células coloridas (ver legenda) — são os pontos que exigem atenção.', { bold: true })
  add('', '')
  add('LEGENDA DE CORES', '', { bold: true })
  const g = ws.addRow(['Verde', 'Confirmado na web / programa consistente']); g.getCell(1).fill = FILL.green; g.getCell(1).font = FONT.green
  const y = ws.addRow(['Amarelo', 'Não confirmado ou pendente de confirmação (atenção)']); y.getCell(1).fill = FILL.yellow; y.getCell(1).font = FONT.yellow
  const r = ws.addRow(['Vermelho', 'Divergência (bairro) ou inconsistência (programa) — revisar']); r.getCell(1).fill = FILL.red; r.getCell(1).font = FONT.red
  const gr = ws.addRow(['Cinza', 'Não re-verificado (off-market ITBI, fora do lote prioritário)']); gr.getCell(1).fill = FILL.gray; gr.getCell(1).font = FONT.gray
  add('', '')
  add('RE-VERIFICAÇÃO WEB', `${conf}/${total} anúncios confirmados (Canadá 111, Estados Unidos 691, Suécia 526). Top 5 comparáveis + 5 ofertas foram re-verificados; os 18 ITBI off-market não.`)
  add('⚠ ACHADO CRÍTICO — BAIRRO', 'Bitencourt 101, Cons. Torres Homem 399, Henrique Martins, Veneza 722/731: o laudo diz "Jardim América", mas os portais classificam como "Jardim PAULISTA" (ruas na divisa). Jd. América stricto sensu tende a R$/m² superior → VALIDAR o bairro de cada um (afeta a precificação).', { banner: true })
  add('CORREÇÃO DE PROGRAMA', 'Cons. Torres Homem 399: laudo tinha 5 suítes/4 dorm (impossível); anúncio = 4 dorm/4 suítes/4 vagas. Canadá 111: 5 dorm/3 suítes (mas nº 111 é endereço institucional — confirmar).')
  add('Dorm inclui suítes?', 'SIM (convenção BR): dormitórios = total, já inclui as suítes. Programa web no formato D / S / V.')
  add('Limitações', 'Portais bloqueiam fetch (HTTP 403) → muitas conclusões por snippet (confiança média). "Não confirmado" muitas vezes é precaução (página de listagem da rua, não anúncio do nº). Nada inventado (Art. IV).')
  add('Ranking', `Por aderência da metodologia (área 50% + terreno 20% + proximidade 30%) — mesma ordem do laudo. Top 3 = ${top3.join(' · ')}.`)
  ws.getRow(1).height = 22
}
function addTerrenos(wb) {
  const ws = wb.addWorksheet('Terrenos')
  ws.columns = [{ width: 22 }, { width: 120 }]
  const head = ws.addRow(['LISTA DE TERRENOS (ao final)', '']); head.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF1F3864' } }
  const rows = [
    ['Status', 'Nenhum terreno na amostra.'],
    ['Motivo', 'O laudo ACM Honduras filtra "Casa unifamiliar horizontal" e EXCLUI apartamento, comercial e TERRENO (Laudo, Seção 4).'],
    ['Ótica de terreno', 'Existe avaliação por terra (Seção 8): R$/m² de terreno por faixa — <500 m²: R$ 15.380; 500–800 m²: R$ 13.090; >800 m² (perfil do alvo): R$ 8.704. Co-âncora de terreno ≈ R$ 10,0M.'],
    ['Ação do corretor', 'Para incluir terrenos puros vendidos no raio, sinalizar — exige nova extração ITBI (tipo = terreno), fora do escopo deste laudo.'],
  ]
  rows.forEach(([a, b]) => { const row = ws.addRow([a, b]); row.getCell(1).font = { bold: true }; row.getCell(2).alignment = { wrapText: true, vertical: 'top' } })
}

// --- main ------------------------------------------------------------------
const ranked = COMPARAVEIS.map((c) => ({ c, i: adherence(c) }))
  .sort((a, b) => b.i - a.i).map((x, i) => ({ c: x.c, rank: i + 1 }))
const top3 = ranked.slice(0, 3).map((x) => x.c.end)
const ESPERADO = ['R. Maestro Chiaffarelli, 86', 'R. Marechal Bitencourt, 101', 'R. Cons. Torres Homem, 399']
if (JSON.stringify(top3) !== JSON.stringify(ESPERADO)) { console.error('Ranking divergente do laudo — abortando.'); process.exit(1) }
const conf = reverif.filter((r) => r.confirmado).length

const wb = new ExcelJS.Workbook()
wb.creator = 'ACM Honduras 629 — validação'
addLeiame(wb, conf, reverif.length, top3)
addComparaveisSheet(wb, 'Top 3', ranked.slice(0, 3))
addComparaveisSheet(wb, 'Top 5', ranked.slice(0, 5))
addComparaveisSheet(wb, 'Top 10', ranked.slice(0, 10))
addComparaveisSheet(wb, 'Todos (23)', ranked)
addOfertasSheet(wb)
addTerrenos(wb)

const outDir = resolve(__dirname, '../../../docs/acm/honduras-629')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'ACM-Honduras629-VALIDACAO-FINAL.xlsx')
await wb.xlsx.writeFile(outPath)
console.log(`Arquivo único gerado: ${outPath}`)
console.log(`Abas: Leia-me, Top 3, Top 5, Top 10, Todos (23), Ofertas ativas, Terrenos`)
console.log(`Cores condicionais + dropdown ✓/✗/? aplicados. Top 3 confere com o laudo ✓.`)
