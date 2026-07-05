/**
 * FASE 2 (pós-workflow) — mescla o resultado da re-verificação web
 * (reverify-result.json) com o dataset oficial e gera o Excel RE-VERIFICADO,
 * preservando a estrutura de validação da Fase 1 e adicionando colunas de diff.
 *
 * Rodar após o workflow reverify-web.workflow.mjs:
 *   cd app && node scripts/acm-honduras/04-merge-reverify.mjs
 * Saída: docs/acm/honduras-629/ACM-Honduras629-REVERIFICADO.xlsx
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { TARGET, COMPARAVEIS, OFERTAS_ATIVAS } from './honduras-dataset.mjs'
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

// Divergência de bairro detectada nos textos do workflow.
function bairroWeb(rv) {
  const t = `${rv?.evidencia ?? ''} ${rv?.motivoRejeicao ?? ''}`
  if (/Jardim Paulista/i.test(t)) return '⚠ Portais: Jardim Paulista (laudo diz Jd. América)'
  if (/Jardim Europa/i.test(t)) return 'Jardim Europa (confere)'
  return '—'
}
function reverifStatus(rv) {
  if (!rv) return 'Não re-verificado (off-market ITBI)'
  if (rv.confirmado) return '✓ Confirmado na web'
  if (rv.status === 'nao_encontrado') return '✗ Anúncio não encontrado'
  return '⚠ Não confirmado (ver observação)'
}
function programaWeb(rv) {
  const p = rv?.programaAnuncio
  if (!p) return '—'
  return `${p.dormitorios ?? '—'} / ${p.suites ?? '—'} / ${p.vagas ?? '—'}`
}
function obsWeb(rv) {
  if (!rv) return '—'
  const txt = rv.confirmado ? rv.evidencia : (rv.motivoRejeicao || rv.evidencia || '')
  return (txt || '—').replace(/\s+/g, ' ').slice(0, 480)
}

// --- colunas (Fase 1 + diff Fase 2) ----------------------------------------
const HEADER = [
  'Rank', 'Ref. (PMSP)', 'Endereço', 'Bairro (laudo)',
  'Dorm (inclui suítes)', 'Suíte', 'Vagas', 'Programa confirmado? (laudo)',
  'Área constr. (m²)', 'Área terreno (m²)', 'Valor venda ITBI', 'Valor anúncio/pedido (laudo)',
  'Distância ao alvo', 'SQL cadastral',
  // Fase 2 — re-verificação web
  'Re-verif. (web)', 'Anúncio web (URL)', 'Preço web (atual)', 'Programa web (D/S/V)',
  'Bairro real (web)', 'Observação web',
  // validação do corretor
  'Confere? (✓/✗/?)', 'Correção', 'Observação do corretor',
]
const WIDTH = [5, 11, 30, 16, 18, 7, 7, 28, 16, 16, 18, 22, 20, 16, 26, 34, 18, 18, 38, 60, 14, 24, 30]
const COL_URL = HEADER.indexOf('Anúncio web (URL)')

function programaStatusLaudo(c) {
  if (!c.svd) return 'Sem dado — confirmar em anúncio'
  if (c.svd.s != null && c.svd.d != null && c.svd.s > c.svd.d) return 'Inconsistente (suítes>dorm)'
  if (c.status === 'anúncio confirmado') return 'Sim — anúncio recuperado'
  return 'Não confirmado (laudo Sec.5)'
}

function rowComparavel(c, rank) {
  const rv = byEnd.get(c.end)
  const distTxt = c.dist != null ? `${num(c.dist)} m (laudo)` : '—'
  return [
    rank, c.ref, c.end, c.bairro,
    svdTxt(c.svd, 'd'), svdTxt(c.svd, 's'), svdTxt(c.svd, 'v'), programaStatusLaudo(c),
    num(c.areaConstruida), num(c.areaTerreno), brl(c.preco), brl(c.precoPedido),
    distTxt, c.sql ?? '—',
    reverifStatus(rv), rv?.url ?? '—', rv ? brl(rv.precoAtual) : '—', programaWeb(rv),
    bairroWeb(rv), obsWeb(rv),
    '', '', '',
  ]
}

function sheetComparaveis(list) {
  const aoa = [HEADER, ...list.map((x) => rowComparavel(x.c, x.rank))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = WIDTH.map((w) => ({ wch: w }))
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(HEADER.length - 1)}1` }
  list.forEach((x, i) => {
    const rv = byEnd.get(x.c.end)
    if (rv?.url) {
      const cell = XLSX.utils.encode_cell({ r: i + 1, c: COL_URL })
      if (ws[cell]) ws[cell].l = { Target: rv.url }
    }
  })
  return ws
}

// --- ofertas ---------------------------------------------------------------
const OF_HEADER = ['Endereço', 'Bairro (laudo)', 'Área constr. (m²)', 'Valor anúncio (laudo)', 'Distância',
  'Re-verif. (web)', 'Anúncio web (URL)', 'Preço web (atual)', 'Programa web (D/S/V)', 'Bairro real (web)', 'Observação web', 'Confere?', 'Observação']
function sheetOfertas() {
  const aoa = [OF_HEADER, ...OFERTAS_ATIVAS.map((o) => {
    const rv = byEnd.get(o.end)
    return [o.end, o.bairro, num(o.areaConstruida), brl(o.precoPedido), o.dist != null ? `${num(o.dist)} m` : '—',
      reverifStatus(rv), rv?.url ?? '—', rv ? brl(rv.precoAtual) : '—', programaWeb(rv), bairroWeb(rv), obsWeb(rv), '', '']
  })]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [28, 16, 16, 22, 14, 26, 34, 18, 18, 38, 60, 10, 28].map((w) => ({ wch: w }))
  ws['!autofilter'] = { ref: `A1:M1` }
  OFERTAS_ATIVAS.forEach((o, i) => {
    const rv = byEnd.get(o.end)
    if (rv?.url) { const cell = XLSX.utils.encode_cell({ r: i + 1, c: 6 }); if (ws[cell]) ws[cell].l = { Target: rv.url } }
  })
  return ws
}

// --- Leia-me ---------------------------------------------------------------
function sheetLeiame(conf, total) {
  const rows = [
    ['ACM Rua Honduras, 629 — DOCUMENTO RE-VERIFICADO NA WEB (Fase 2)'],
    ['Imóvel-alvo', `${TARGET.endereco} — ${TARGET.bairro}, ${TARGET.cidade}/${TARGET.uf} · 800m² constr / 1000m² terreno · Score B`],
    ['Base', 'Laudo ACM Honduras v4 (09/06/2026) + re-verificação web jun/2026 (10 itens prioritários).'],
    [''],
    ['RESULTADO DA RE-VERIFICAÇÃO', `${conf}/${total} anúncios confirmados na web. Demais: não encontrados, não confirmados (divergência) ou off-market (ITBI sem anúncio).`],
    [''],
    ['⚠ ACHADO CRÍTICO — BAIRRO', 'Vários endereços que o laudo coloca em "Jardim América" os portais classificam como "Jardim PAULISTA" (Bitencourt 101, Cons. Torres Homem 399, Henrique Martins, Veneza 722/731). São ruas na DIVISA Jd. América / Jd. Paulista. Como o Jardim América stricto sensu tende a R$/m² superior, isso afeta a precificação — VALIDAR o bairro de cada comparável.'],
    [''],
    ['CORREÇÕES DE PROGRAMA (S/V/D) ENCONTRADAS NA WEB'],
    ['R. Cons. Torres Homem, 399', 'Laudo tinha 5 suítes/4 dorm (inconsistente). Anúncio: 4 dorm (todos suítes) / 4 vagas, R$ 8,6M. → corrigir.'],
    ['R. Canadá, 111', 'Anúncio VivaReal (Bossa Nova Sotheby\'s): 5 dorm / 3 suítes, R$ 11,5M pedido. CAVEAT: nº 111 é endereço institucional (SAESP) — confirmar o número exato.'],
    ['Rua Estados Unidos, 691', 'Anúncio ativo (Chaves na Mão): R$ 14,0M (= laudo), 10 quartos/1 suíte/~16 vagas, "casa comercial". Confirmado.'],
    ['Rua Suécia, 526', 'Anúncio ativo (Chaves na Mão): R$ 9,795M (= laudo), 6 dorm/3 suítes/8 vagas, Jardim Europa. Confirmado.'],
    [''],
    ['LIMITAÇÕES DA RE-VERIFICAÇÃO', 'Muitos portais bloquearam fetch direto (HTTP 403/anti-bot) → conclusões por snippets de busca (confiança média). Vários "não confirmado" são por PRECAUÇÃO (página de listagem da rua, não anúncio do número específico). Off-market ITBI raramente tem anúncio. NADA foi inventado (Art. IV).'],
    [''],
    ['LEGENDA Re-verif. (web)', '✓ Confirmado = anúncio do mesmo imóvel achado e verificado. ⚠ Não confirmado = achou algo mas com divergência (bairro/número). ✗ Não encontrado = sem anúncio. "Não re-verificado" = off-market ITBI, fora do lote prioritário.'],
    ['Dorm inclui suítes?', 'SIM (convenção BR). Programa web no formato D / S / V.'],
    ['Documento Fase 1 (validação)', 'ACM-Honduras629-validacao-corretor.xlsx — preserve suas marcações lá; este arquivo agrega a leitura da web.'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 32 }, { wch: 120 }]
  return ws
}

// --- main ------------------------------------------------------------------
const ranked = COMPARAVEIS.map((c) => ({ c, i: adherence(c) }))
  .sort((a, b) => b.i - a.i).map((x, i) => ({ c: x.c, rank: i + 1 }))
const conf = reverif.filter((r) => r.confirmado).length

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, sheetLeiame(conf, reverif.length), 'Leia-me')
XLSX.utils.book_append_sheet(wb, sheetComparaveis(ranked.slice(0, 3)), 'Top 3')
XLSX.utils.book_append_sheet(wb, sheetComparaveis(ranked.slice(0, 5)), 'Top 5')
XLSX.utils.book_append_sheet(wb, sheetComparaveis(ranked.slice(0, 10)), 'Top 10')
XLSX.utils.book_append_sheet(wb, sheetComparaveis(ranked), 'Todos (23)')
XLSX.utils.book_append_sheet(wb, sheetOfertas(), 'Ofertas ativas')

const outDir = resolve(__dirname, '../../../docs/acm/honduras-629')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'ACM-Honduras629-REVERIFICADO.xlsx')
XLSX.writeFile(wb, outPath)
console.log(`Excel re-verificado gerado: ${outPath}`)
console.log(`Confirmados na web: ${conf}/${reverif.length} | Comparáveis Top 5 re-verificados + 5 ofertas`)
