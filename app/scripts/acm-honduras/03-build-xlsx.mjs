/**
 * Gera o Excel de VALIDAÇÃO do corretor — ACM Rua Honduras, 629.
 *
 * Fase 1 (dados já verificados): usa o dataset oficial (honduras-dataset.mjs),
 * geocodifica cada endereço (link Maps + distância informativa) e ordena pela
 * ADERÊNCIA da metodologia (área constr. 50% + terreno 20% + proximidade 30%),
 * reproduzindo o ranking do laudo (self-check do Top 3 antes de gravar).
 *
 * Abas: Leia-me · Top 3 · Top 5 · Top 10 · Todos (23) · Ofertas ativas · Terrenos.
 * Saída: docs/acm/honduras-629/ACM-Honduras629-validacao-corretor.xlsx
 */
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { TARGET, COMPARAVEIS, OFERTAS_ATIVAS, PERIODO_ITBI } from './honduras-dataset.mjs'
import {
  loadEnv,
  adherence as adherenceShared,
  haversineMeters,
  RAIO_PADRAO_M,
} from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIO = RAIO_PADRAO_M

const env = loadEnv()
const MAPBOX = env.MAPBOX_TOKEN || env.NEXT_PUBLIC_MAPBOX_TOKEN

// --- metodologia (cópia única em lib.mjs; paridade testada no vitest) -------
const adherence = (c) => adherenceShared(TARGET, c, RAIO)

// --- geocode (Mapbox) ------------------------------------------------------
async function geocode(query) {
  if (!MAPBOX) return null
  try {
    const r = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX}&country=br&proximity=-46.664,-23.5735&limit=1`,
    ).then((x) => x.json())
    if (r.features?.[0]) {
      const [lng, lat] = r.features[0].center
      return { lat, lng, place: r.features[0].place_name }
    }
  } catch {}
  return null
}
const haversine = (a, b) => Math.round(haversineMeters(a, b))
const mapsLink = (geo, addr) =>
  geo ? `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr + ', São Paulo, SP')}`

// --- formatação ------------------------------------------------------------
const brl = (n) => (n == null ? '—' : `R$ ${n.toLocaleString('pt-BR')}`)
const num = (n) => (n == null ? '—' : n.toLocaleString('pt-BR'))
const svdTxt = (svd, key) => (svd && svd[key] != null ? svd[key] : '—')

// Cabeçalho na ordem pedida pelo usuário.
const HEADER = [
  'Rank', 'Ref. (PMSP)', 'Endereço', 'Bairro',
  'Vendido 2024+?', 'Mês/Ano venda',
  'Dorm (inclui suítes)', 'Suíte', 'Vagas', 'Programa confirmado?',
  'Área constr. (m²)', 'Área terreno (m²)',
  'Valor venda ITBI', 'Valor anúncio/pedido',
  'R$/m² constr.', 'R$/m² terreno',
  'Apenas ITBI?', 'Fonte / Anúncio (ref.)', 'Link anúncio (URL)',
  'SQL cadastral (GeoSampa)', 'Distância ao alvo',
  'Google Maps', 'Confere? (✓/✗/?)', 'Correção', 'Observação do corretor',
]
// índices 0-based p/ hyperlinks (derivados do HEADER p/ resistir a reordenação).
const COL = { url: HEADER.indexOf('Link anúncio (URL)'), maps: HEADER.indexOf('Google Maps') }
const WIDTH = {
  'Rank': 5, 'Ref. (PMSP)': 11, 'Endereço': 30, 'Bairro': 16, 'Vendido 2024+?': 18,
  'Mês/Ano venda': 18, 'Dorm (inclui suítes)': 18, 'Suíte': 7, 'Vagas': 7, 'Programa confirmado?': 40,
  'Área constr. (m²)': 16, 'Área terreno (m²)': 16, 'Valor venda ITBI': 18, 'Valor anúncio/pedido': 20,
  'R$/m² constr.': 14, 'R$/m² terreno': 14, 'Apenas ITBI?': 24, 'Fonte / Anúncio (ref.)': 28,
  'Link anúncio (URL)': 30, 'SQL cadastral (GeoSampa)': 18, 'Distância ao alvo': 20, 'Google Maps': 16,
  'Confere? (✓/✗/?)': 14, 'Correção': 24, 'Observação do corretor': 30,
}

/** Confiança do programa S/V/D (origem laudo Sec.5 — secundária, não ITBI). */
function programaStatus(c) {
  if (!c.svd) return 'Sem dado — confirmar em anúncio'
  if (c.svd.s != null && c.svd.d != null && c.svd.s > c.svd.d)
    return 'Inconsistente (suítes > dorm) — reconferir em anúncio'
  if (c.status === 'anúncio confirmado') return 'Sim — anúncio recuperado'
  return 'Não confirmado (laudo Sec.5 — confirmar em anúncio)'
}

function buildRow(c, rank, geo) {
  const distExato = c.dist != null
  const distVal = distExato ? c.dist : geo ? haversine(TARGET._geo, geo) : null
  const distTxt = distVal == null ? '—' : `${distExato ? '' : '~'}${num(distVal)} m ${distExato ? '(laudo)' : '(geocode)'}`
  const apenasItbi = c.status === 'anúncio confirmado' ? 'ITBI + anúncio recuperado' : 'Só ITBI (off-market)'
  return [
    rank,
    c.ref,
    c.end,
    c.bairro,
    `Sim (ITBI ${PERIODO_ITBI})`,
    '— (confirmar no ITBI)',
    svdTxt(c.svd, 'd'),
    svdTxt(c.svd, 's'),
    svdTxt(c.svd, 'v'),
    programaStatus(c),
    num(c.areaConstruida),
    num(c.areaTerreno),
    brl(c.preco),
    brl(c.precoPedido),
    num(c.m2c),
    num(c.m2t),
    apenasItbi,
    c.fonteRef ?? '—',
    c.anuncioUrl ?? '— (a verificar na web — Fase 2)',
    c.sql ?? '—',
    distTxt,
    'Abrir no Maps',
    '', '', '',
  ]
}

function applyLinks(ws, rows, geos) {
  // rows: array de comparáveis na ordem; +1 pela linha de cabeçalho.
  rows.forEach((c, i) => {
    const r = i + 1
    const mapsCell = XLSX.utils.encode_cell({ r, c: COL.maps })
    if (ws[mapsCell]) ws[mapsCell].l = { Target: mapsLink(geos.get(c.ref ?? c.end), c.end), Tooltip: 'Abrir no Google Maps' }
    if (c.anuncioUrl) {
      const urlCell = XLSX.utils.encode_cell({ r, c: COL.url })
      if (ws[urlCell]) ws[urlCell].l = { Target: c.anuncioUrl }
    }
  })
}

function sheetFromComparaveis(list, geos) {
  const aoa = [HEADER, ...list.map((x) => buildRow(x.c, x.rank, geos.get(x.c.ref)))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = HEADER.map((h) => ({ wch: WIDTH[h] || 14 }))
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(HEADER.length - 1)}1` }
  ws['!freeze'] = { xSplit: 3, ySplit: 1 }
  applyLinks(ws, list.map((x) => x.c), geos)
  return ws
}

// --- ofertas ativas --------------------------------------------------------
const OFERTA_HEADER = ['Endereço', 'Bairro', 'Área constr. (m²)', 'Dorm', 'Suíte', 'Vagas', 'Valor anúncio (pedido)', 'R$/m² constr.', 'Distância ao alvo', 'Fonte / Anúncio (ref.)', 'Link anúncio (URL)', 'Google Maps', 'Confere?', 'Observação']
function sheetOfertas(geos) {
  const aoa = [OFERTA_HEADER, ...OFERTAS_ATIVAS.map((o) => {
    const geo = geos.get('OF:' + o.end)
    const distVal = o.dist != null ? o.dist : geo ? haversine(TARGET._geo, geo) : null
    const distTxt = distVal == null ? '—' : `${o.dist != null ? '' : '~'}${num(distVal)} m`
    return [o.end, o.bairro, num(o.areaConstruida), svdTxt(o.svd, 'd'), svdTxt(o.svd, 's'), svdTxt(o.svd, 'v'), brl(o.precoPedido), num(o.m2c), distTxt, o.fonteRef, o.anuncioUrl ?? '— (a verificar na web — Fase 2)', 'Abrir no Maps', '', '']
  })]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = OFERTA_HEADER.map((h, i) => ({ wch: [28, 14, 16, 6, 6, 6, 20, 14, 18, 26, 30, 16, 10, 28][i] || 14 }))
  ws['!autofilter'] = { ref: `A1:N1` }
  OFERTAS_ATIVAS.forEach((o, i) => {
    const cell = XLSX.utils.encode_cell({ r: i + 1, c: 11 })
    if (ws[cell]) ws[cell].l = { Target: mapsLink(geos.get('OF:' + o.end), o.end), Tooltip: 'Abrir no Google Maps' }
  })
  return ws
}

// --- Leia-me ---------------------------------------------------------------
function sheetLeiame(rankedCount, top3) {
  const rows = [
    ['DOCUMENTO DE VALIDAÇÃO DE COMPARÁVEIS — ACM'],
    ['Imóvel-alvo', `${TARGET.endereco} — ${TARGET.bairro}, ${TARGET.cidade}/${TARGET.uf}`],
    ['Programa do alvo', `${TARGET.areaConstruida} m² constr. · ${TARGET.areaTerreno} m² terreno · ${TARGET.dormitorios} dorm · ${TARGET.suites} suítes · ${TARGET.vagas} vagas · Score ${TARGET.scoreAlvo}`],
    ['Raio de análise', `${RAIO} m`],
    ['Período das vendas (ITBI/PMSP)', PERIODO_ITBI],
    ['Consultora', 'Luciana Borba — RE/MAX Galeria (CRECI 045063-J)'],
    ['Fonte', 'Laudo ACM Rua Honduras v4 (emitido 09/06/2026) + honduras.fixture.ts'],
    [''],
    ['OBJETIVO', 'Permitir que o corretor VALIDE, linha a linha, os comparáveis usados no ACM: confirmar endereço, dados, valor e relevância. Marque "Confere?" com ✓ / ✗ / ? e use "Correção" e "Observação".'],
    [''],
    ['ORDENAÇÃO', `Ranking por ADERÊNCIA da metodologia: área construída (50%) + área terreno (20%) + proximidade (30%). Mesma ordem do laudo. Top 3 = ${top3.join(' · ')}.`],
    ['ABAS', 'Top 3 / Top 5 / Top 10 / Todos (23) = mesma lista, recortada. Ofertas ativas = concorrência à venda (NÃO vendas). Terrenos = ver nota na aba.'],
    [''],
    ['LEGENDA DAS COLUNAS'],
    ['Vendido 2024+?', `Todos os ${rankedCount} comparáveis são vendas ITBI/PMSP no período ${PERIODO_ITBI}.`],
    ['Mês/Ano venda', 'O laudo não detalha a data por item — confirmar no extrato ITBI/SQL. Campo deixado p/ preenchimento.'],
    ['Dorm/Suíte/Vagas — ORIGEM', 'Coluna "S/V/D" do laudo (Sec. 5). NÃO vêm do ITBI (o ITBI/PMSP não traz programa de quartos) — são dado SECUNDÁRIO/enriquecido. Por isso a coluna "Programa confirmado?".'],
    ['Dorm inclui suítes?', 'SIM. Convenção BR: dormitórios = total de quartos, JÁ INCLUINDO as suítes (subconjunto com banheiro privativo). Dorm e Suíte são colunas separadas, mas dorm engloba as suítes.'],
    ['Programa confirmado?', '"Sim — anúncio recuperado" (Top 5 com anúncio): mais confiável. "Não confirmado (laudo Sec.5)": confirmar em anúncio na Fase 2. "Inconsistente": ex. Torres Homem 399 = 5 suítes/4 dorm (impossível) → reconferir.'],
    ['Área terreno / Distância', 'Oficiais (laudo) apenas nos Top 5. Demais: distância "~" é aproximada por geocode (informativa, não usada no ranking).'],
    ['Valor venda ITBI', 'Valor real de transação registrado no ITBI/PMSP.'],
    ['Valor anúncio/pedido', 'Preço pedido recuperado em anúncio (só quando existe). Ex.: Bitencourt 101 R$ 19,99M→17M (-15%); Torres Homem 399 R$ 8,6M→7,7M (-10%).'],
    ['Apenas ITBI?', '"Só ITBI (off-market)" = sem anúncio indexável. "ITBI + anúncio recuperado" = há anúncio confirmando características/pedido.'],
    ['SQL cadastral', 'Setor/Quadra/Lote — consultável no GeoSampa (geosampa.prefeitura.sp.gov.br). Preenchido nos Top 5; demais via ITBImap.'],
    ['Link anúncio (URL)', 'O laudo traz a referência/portal, não a URL completa. A Fase 2 (re-verificação na web) preenche/atualiza as URLs e o status.'],
    ['Google Maps', 'Link clicável (pin por geocode do endereço; confirmar o número exato).'],
    [''],
    ['FASE 2 — RE-VERIFICAÇÃO NA WEB', 'Ver docs/acm/honduras-629/WORKFLOW-revalidacao-web.md. Roda depois: reconfere URLs/preços/status na internet e gera um relatório de diferenças, preservando suas marcações de validação.'],
    ['Gerado em', 'preencher na exportação'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 34 }, { wch: 110 }]
  return ws
}

// --- main ------------------------------------------------------------------
;(async () => {
  console.log('Geocodificando alvo e comparáveis (Mapbox)...')
  TARGET._geo = await geocode(TARGET.geocodeQuery)
  if (!TARGET._geo) { console.error('Falha ao geocodificar o alvo — abortando.'); process.exit(1) }
  console.log(`  alvo: ${TARGET._geo.lat},${TARGET._geo.lng} (${TARGET._geo.place})`)

  // Gate de sanidade: todos os comparáveis estão no raio de 1.000 m. Geocode que
  // cair > 1.300 m (rua homônima em outra cidade) é descartado → distância "—" e
  // link Maps cai p/ busca por endereço (texto). Evita publicar distância errada.
  const GATE = 1300
  const reliable = (g) => (g && haversine(TARGET._geo, g) <= GATE ? g : null)
  const geos = new Map()
  let descartados = 0
  for (const c of COMPARAVEIS) {
    const g = reliable(await geocode(`${c.end}, ${c.bairro}, São Paulo, SP, Brasil`))
    if (!g) descartados++
    geos.set(c.ref, g)
  }
  for (const o of OFERTAS_ATIVAS) {
    geos.set('OF:' + o.end, reliable(await geocode(`${o.end}, ${o.bairro}, São Paulo, SP, Brasil`)))
  }
  console.log(`  geocode confiável: ${[...geos.values()].filter(Boolean).length}/${geos.size} (${descartados} comparáveis sem geocode confiável → distância aproximada "—")`)

  // Ranking por aderência (fiel ao laudo).
  const ranked = COMPARAVEIS
    .map((c) => ({ c, indice: adherence(c) }))
    .sort((a, b) => b.indice - a.indice)
    .map((x, i) => ({ c: x.c, rank: i + 1, indice: x.indice }))

  const top3 = ranked.slice(0, 3).map((x) => x.c.end)
  const ESPERADO = ['R. Maestro Chiaffarelli, 86', 'R. Marechal Bitencourt, 101', 'R. Cons. Torres Homem, 399']
  const ok = JSON.stringify(top3) === JSON.stringify(ESPERADO)
  console.log(`  Top 3: ${top3.join(' · ')}  → ${ok ? 'CONFERE com o laudo ✓' : 'DIVERGE ✗'}`)
  if (!ok) { console.error('Ranking divergente do laudo — abortando p/ não publicar número errado.'); process.exit(1) }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetLeiame(ranked.length, top3), 'Leia-me')
  XLSX.utils.book_append_sheet(wb, sheetFromComparaveis(ranked.slice(0, 3), geos), 'Top 3')
  XLSX.utils.book_append_sheet(wb, sheetFromComparaveis(ranked.slice(0, 5), geos), 'Top 5')
  XLSX.utils.book_append_sheet(wb, sheetFromComparaveis(ranked.slice(0, 10), geos), 'Top 10')
  XLSX.utils.book_append_sheet(wb, sheetFromComparaveis(ranked, geos), 'Todos (23)')
  XLSX.utils.book_append_sheet(wb, sheetOfertas(geos), 'Ofertas ativas')
  // Terrenos: o laudo exclui terrenos por critério (Sec. 4) → vazio + nota.
  const wsTerr = XLSX.utils.aoa_to_sheet([
    ['LISTA DE TERRENOS (ao final)'],
    ['Status', 'Nenhum terreno na amostra.'],
    ['Motivo', 'O laudo ACM Honduras filtra "Casa unifamiliar horizontal" e EXCLUI apartamento, comercial e TERRENO (Laudo, Seção 4). Logo, não há comparáveis do tipo terreno.'],
    ['Ótica de terreno', 'A avaliação por terra existe (Seção 8 do laudo): R$/m² de terreno por faixa de lote — <500 m²: R$ 15.380; 500–800 m²: R$ 13.090; >800 m² (perfil do alvo): R$ 8.704. Co-âncora de terreno do alvo ≈ R$ 10,0M.'],
    ['Ação do corretor', 'Se desejar incluir terrenos puros vendidos no raio, sinalizar — exige nova extração ITBI (tipo = terreno), fora do escopo deste laudo.'],
  ])
  wsTerr['!cols'] = [{ wch: 20 }, { wch: 110 }]
  XLSX.utils.book_append_sheet(wb, wsTerr, 'Terrenos')

  const outDir = resolve(__dirname, '../../../docs/acm/honduras-629')
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, 'ACM-Honduras629-validacao-corretor.xlsx')
  XLSX.writeFile(wb, outPath)
  console.log(`\nExcel gerado: ${outPath}`)
  console.log(`Abas: Leia-me, Top 3, Top 5, Top 10, Todos (23), Ofertas ativas, Terrenos`)
})().catch((e) => { console.error(e); process.exit(1) })
