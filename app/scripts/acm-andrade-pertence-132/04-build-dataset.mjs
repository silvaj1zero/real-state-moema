/**
 * Dataset congelado do caso Rua Dr. Andrade Pertence, 132 (Vila Olímpia) —
 * imóvel do Rodolpho, anunciado a R$ 1.495.000 (apresentação RE/MAX 14-Abr-2026).
 *
 * Mesmo protocolo do caso 113 (scripts/acm-andrade-pertence/04-build-dataset.mjs):
 * base ITBI/PMSP em PROD via RPC + data_referencia por id + bairro via ViaCEP
 * (cache compartilhado com o caso 113 — mesma vizinhança).
 *
 * RECORTE DECLARADO (Art. IV):
 *   R1. Geográfico — raio 1.000 m do alvo (PostGIS).
 *   R2. Evidência — vendas reais ITBI/PMSP.
 *   R3. Pré-filtro — endereço com venda única no período (exclui torres). NÃO
 *       separa casa de apartamento sozinho: a ingestão da base descartou o
 *       "Complemento" da guia ("AP 82") — incidente 09-Jul-2026, ~50% da amostra
 *       era apartamento. R5 é OBRIGATÓRIO.
 *   R4. Classe de valor — R$/m² < 22.000 (piso do Score A na régua).
 *   R5. TIPOLOGIA CONFIRMADA — crosscheck por SQL contra as guias oficiais da
 *       SF/PMSP (uso IPTU): só RESIDÊNCIA/horizontal; vendas 2026 sem guia
 *       pública entram por heurística de lote declarada (lote ≥ ~0100 = unidade
 *       condominial). Requer `tipologia-guias.json` (10-backfill-tipologia.mjs).
 *       Bônus da guia p/ casas confirmadas: área de TERRENO real, fração e ACC.
 *
 * DADOS DO ALVO: apresentação "Apresentação Vila Olimpia Rodolfo New.pdf".
 * A pedido do operador, a ANÁLISE da apresentação (3 amostras de preço pedido,
 * fator oferta, sugestão 1.290.000) é DESCONSIDERADA — só entram os fatos do
 * imóvel e o preço anunciado. Área de TERRENO não é informada em nenhuma fonte
 * → null (nunca inventada).
 *
 * Saída: docs/acm/andrade-pertence-132/dataset.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../acm-honduras/lib.mjs'

const TARGET = {
  endereco: 'Rua Dr. Andrade Pertence, 132',
  bairro: 'Vila Olímpia',
  cep: '04549-020',
  cidade: 'São Paulo',
  uf: 'SP',
  proprietario: 'Rodolpho',
  areaConstruida: 220, // apresentação (anúncios divergem 196–220 — condicionante)
  areaTerreno: null, // NÃO informado na apresentação/anúncios — nunca inventado
  dormitorios: 4, // 3 dorm no superior + suíte na edícula (PCD)
  suites: 2, // 1 suíte ampla (superior) + 1 suíte edícula
  vagas: 6,
  anoConstrucao: null, // não informado
  estado: 'conservado — pronto para morar (apresentação)',
  precoPretendido: 1_495_000, // preço anunciado/estagnado (70+ anúncios, 3 portais)
  precoPedidoReal: 1_495_000,
  geo: { lat: -23.604158, lng: -46.676145, fonte: 'mapbox 2026-07-09' },
}

const RAIO_M = 1000
const CONSULTANT = '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c'
const TETO_PRECO_M2 = 22_000

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const outDir = path.join(repoRoot, 'docs', 'acm', 'andrade-pertence-132')
mkdirSync(outDir, { recursive: true })
// Cache ViaCEP compartilhado com o caso 113 (mesma vizinhança de logradouros).
const viacepCachePath = path.join(scriptDir, '..', 'acm-andrade-pertence', 'viacep-cache.json')

const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: rpcRows, error } = await supa.rpc('fn_comparaveis_no_raio', {
  p_lat: TARGET.geo.lat,
  p_lng: TARGET.geo.lng,
  p_consultant_id: CONSULTANT,
  p_raio_metros: RAIO_M,
})
if (error) throw new Error(`RPC: ${error.message}`)
console.log(`RPC raio ${RAIO_M}m: ${rpcRows.length} linhas`)

const r2 = rpcRows.filter(
  (r) => r.is_venda_real && r.fonte === 'itbi' && (r.area_m2 ?? 0) > 0 && r.preco > 0,
)
const vendasPorEndereco = new Map()
for (const r of r2) vendasPorEndereco.set(r.endereco, (vendasPorEndereco.get(r.endereco) ?? 0) + 1)
const r3 = r2.filter((r) => vendasPorEndereco.get(r.endereco) === 1)
const r4 = r3.filter((r) => r.preco / r.area_m2 < TETO_PRECO_M2)
const excluidosClasse = r3.filter((r) => r.preco / r.area_m2 >= TETO_PRECO_M2)
console.log(
  `Recorte: ${r2.length} vendas ITBI → venda única: ${r3.length} → R$/m² < ${TETO_PRECO_M2}: ${r4.length}`,
)

const ids = r4.map((r) => r.comparavel_id)
const dataPorId = new Map()
for (let i = 0; i < ids.length; i += 100) {
  const lote = ids.slice(i, i + 100)
  const { data, error: e } = await supa
    .from('acm_comparaveis')
    .select('id,data_referencia,notas')
    .in('id', lote)
  if (e) throw new Error(`data_referencia: ${e.message}`)
  for (const row of data) dataPorId.set(row.id, row)
}

// --- Bairro por logradouro (mesma lógica/whitelist do caso 113) -------------
const PREFIXOS = /^(R|AV|AL|TV|PC|EST|PCA)\s+/i
const HONORIFICOS = /^(DR|DRA|PROF|GAL|MAL|CEL|SEN|DEP|ENG|PE)\s+/i
function logradouroBusca(endereco) {
  let s = endereco.replace(/\s+\d+[A-Z]?$/i, '')
  s = s.replace(PREFIXOS, '')
  while (HONORIFICOS.test(s)) s = s.replace(HONORIFICOS, '')
  return s.trim()
}
const BAIRROS_NO_RAIO = new Set([
  'Vila Olímpia',
  'Vila Uberabinha',
  'Moema',
  'Indianópolis',
  'Vila Nova Conceição',
  'Cidade Monções',
  'Itaim Bibi',
  'Brooklin Novo',
])
const BAIRRO_NORMALIZADO = { 'Vila Uberabinha': 'Vila Olímpia', Indianópolis: 'Moema' }
const normalizaBairro = (b) => (b == null ? null : (BAIRRO_NORMALIZADO[b] ?? b))

const viacepCache = existsSync(viacepCachePath)
  ? JSON.parse(readFileSync(viacepCachePath, 'utf8'))
  : {}
async function bairroViaCep(logradouro) {
  if (logradouro.length < 3) return null
  if (logradouro in viacepCache) return viacepCache[logradouro]
  let resultado = null
  try {
    const res = await fetch(
      `https://viacep.com.br/ws/SP/${encodeURIComponent('São Paulo')}/${encodeURIComponent(logradouro)}/json/`,
    )
    if (res.ok) {
      const lista = await res.json()
      const bairros = [...new Set((Array.isArray(lista) ? lista : []).map((v) => v.bairro))]
      const plausiveis = bairros.filter((b) => BAIRROS_NO_RAIO.has(b))
      resultado = plausiveis.length === 1 ? plausiveis[0] : null
      if (plausiveis.length !== 1)
        console.warn(`  ViaCEP inconclusivo "${logradouro}": [${bairros.join(' | ') || 'sem resultado'}]`)
    }
  } catch (e) {
    console.warn(`  ViaCEP falhou "${logradouro}": ${e.message}`)
  }
  viacepCache[logradouro] = resultado
  await new Promise((r) => setTimeout(r, 150))
  return resultado
}
const logradouros = [...new Set(r4.map((r) => logradouroBusca(r.endereco)))]
console.log(`ViaCEP: resolvendo bairro de ${logradouros.length} logradouros (cache compartilhado)...`)
for (const l of logradouros) await bairroViaCep(l)
writeFileSync(viacepCachePath, JSON.stringify(viacepCache, null, 2))

// --- R5: tipologia pela guia oficial (backfill 10-backfill-tipologia.mjs) ----
// A ingestão da base descartou o "Complemento" da guia ("AP 82"...), então
// unidades de condomínio parecem endereços de rua com venda única (fura o R3).
// tipologia-guias.json = crosscheck por SQL contra os arquivos oficiais da SF.
const tipologiaPath = path.join(outDir, 'tipologia-guias.json')
const tipologia = existsSync(tipologiaPath)
  ? JSON.parse(readFileSync(tipologiaPath, 'utf8'))
  : null
const tipologiaPorSql = new Map(
  (tipologia?.itens ?? []).map((t) => [String(t.sqlCadastral ?? ''), t]),
)
if (!tipologia) {
  console.warn('AVISO: tipologia-guias.json ausente — R5 não aplicado (rode 10-backfill-tipologia).')
}

// --- Override de VERIFICAÇÃO VISUAL (R5b) ----------------------------------
// Vendas 2023/2026 sem guia pública entram como "casa (provável)" por heurística
// de lote (R5). Quando a inspeção do Google Street View (dez/2024) confirma que o
// endereço é EDIFÍCIO/torre, a heurística é corrigida para 'apartamento' — fonte
// mais forte que o chute de lote. Fato verificado, não invenção (Art. IV).
// Registrado por SQL cadastral (chave estável). Operador: zero — 2026-07-09.
const VERIFICACAO_VISUAL = {
  '4117800485': 'AV COTOVIA 726', // edifício residencial (Street View dez/2024)
  '4115900611': 'AV PAVAO 700', // edifício residencial (Street View dez/2024)
}
const CONFIANCA_VISUAL = 'Street View dez/2024 — edifício confirmado (verificação visual do operador, 2026-07-09)'

const preComparaveis = r4
  .map((r) => {
    const extra = dataPorId.get(r.comparavel_id) ?? {}
    const sql = extra.notas?.match(/SQL\s+(\w+)/)?.[1] ?? null
    const dataRef = extra.data_referencia ?? null
    let tip = sql ? (tipologiaPorSql.get(sql) ?? null) : null
    if (sql && VERIFICACAO_VISUAL[sql]) {
      tip = { ...(tip ?? {}), tipologia: 'apartamento', confianca: CONFIANCA_VISUAL }
    }
    const casaConfirmada = tip?.tipologia === 'casa'
    return {
      id: r.comparavel_id,
      endereco: r.endereco,
      areaConstruida: r.area_m2,
      // Terreno REAL da guia oficial — só para casa confirmada (fração ideal 1).
      areaTerreno:
        casaConfirmada && tip?.guia?.fracaoIdeal === 1 && (tip?.guia?.areaTerrenoGuia ?? 0) > 0
          ? tip.guia.areaTerrenoGuia
          : null,
      anoConstrucao: casaConfirmada ? (tip?.guia?.anoConstrucaoIptu ?? null) : null,
      preco: r.preco,
      precoM2: Math.round((r.preco / r.area_m2) * 100) / 100,
      distancia: Math.round(r.distancia_m),
      dataReferencia: dataRef,
      dataVenda: dataRef ? dataRef.slice(0, 7) : null,
      bairroReal: normalizaBairro(viacepCache[logradouroBusca(r.endereco)] ?? null),
      sqlCadastral: sql,
      tipologia: tip?.tipologia ?? 'não classificado',
      tipologiaConfianca: tip?.confianca ?? '—',
      lat: r.latitude ?? null,
      lng: r.longitude ?? null,
      fonte: 'ITBI/PMSP',
    }
  })
  .sort((a, b) => a.distancia - b.distancia)

const comparaveis = tipologia
  ? preComparaveis.filter((c) => c.tipologia.startsWith('casa'))
  : preComparaveis
const excluidosTipologia = preComparaveis.filter((c) => !c.tipologia.startsWith('casa'))
console.log(
  `R5 tipologia: ${comparaveis.length} casas (${comparaveis.filter((c) => c.tipologia === 'casa').length} por guia + ${comparaveis.filter((c) => c.tipologia !== 'casa').length} por heurística) | excluídos: ${excluidosTipologia.length}`,
)

const dataset = {
  geradoEm: new Date().toISOString(),
  target: TARGET,
  recorte: {
    raioM: RAIO_M,
    consultantId: CONSULTANT,
    regras: [
      `R1 Geográfico — raio ${RAIO_M} m do alvo (PostGIS fn_comparaveis_no_raio)`,
      "R2 Evidência — vendas reais ITBI/PMSP (is_venda_real=true, fonte='itbi')",
      'R3 Tipologia (proxy) — endereço com venda única no período (endereços com N vendas = edifícios verticais; campo tipo 100% NULL até a Story 9.4)',
      `R4 Classe de valor — R$/m² < ${TETO_PRECO_M2.toLocaleString('pt-BR')} (piso do Score A na régua)`,
      'R5 Tipologia CONFIRMADA — uso IPTU da guia oficial (SF/PMSP) por SQL: só RESIDÊNCIA/horizontal; APARTAMENTO EM CONDOMÍNIO excluído. Guias 2026 sem arquivo público: heurística de lote declarada ("casa (provável)")',
    ],
    funil: {
      rpcNoRaio: rpcRows.length,
      vendasItbiValidas: r2.length,
      aposVendaUnica: r3.length,
      aposClasseValor: r4.length,
      aposTipologiaGuia: comparaveis.length,
    },
    excluidosTipologia: excluidosTipologia.map((c) => ({
      endereco: c.endereco,
      tipologia: c.tipologia,
      confianca: c.tipologiaConfianca,
      areaConstruida: c.areaConstruida,
      preco: c.preco,
    })),
    excluidosClasseValor: excluidosClasse.map((r) => ({
      endereco: r.endereco,
      areaConstruida: r.area_m2,
      preco: r.preco,
      precoM2: Math.round(r.preco / r.area_m2),
    })),
  },
  avisos: [
    'Área de TERRENO do alvo não informada na apresentação/anúncios — confirmar na matrícula/IPTU.',
    'Área construída do alvo com divergência nos anúncios (196–220 m²) — usada a da apresentação (220 m²); confirmar na matrícula/IPTU.',
    'areaTerreno dos comparáveis: preenchida pela GUIA OFICIAL para casas confirmadas (fração ideal 1); vendas 2026 sem guia pública seguem sem terreno.',
    'Coordenadas dos comparáveis geocodificadas por logradouro/CEP na ingestão — distâncias aproximadas (±~200 m).',
    'Tipologia (R5): confirmada por guia oficial exceto vendas 2026 ("casa (provável)" por heurística de lote) — conferir na planilha Fase 1.',
    'bairroReal é verificação PARCIAL (logradouro via ViaCEP restrito aos bairros do raio).',
    'Sem fatores de liquidez elicitados: fechamento = mercado nesta emissão.',
  ],
  comparaveis,
}

const outPath = path.join(outDir, 'dataset.json')
writeFileSync(outPath, JSON.stringify(dataset, null, 2))
console.log(`\nDataset: ${outPath}`)
console.log(`Comparáveis: ${comparaveis.length}`)
const bairros = new Map()
for (const c of comparaveis) bairros.set(c.bairroReal ?? 'não verificado', (bairros.get(c.bairroReal ?? 'não verificado') ?? 0) + 1)
console.log('Bairros:', [...bairros.entries()].map(([b, n]) => `${b}:${n}`).join(' '))
// Vendas na própria rua do alvo (candidatas ao guard-rail 9.8 por proximidade de geocode)
for (const c of comparaveis.filter((c) => c.endereco.includes('ANDRADE PERTENCE'))) {
  console.log(`Mesma rua: ${c.endereco} | ${c.areaConstruida}m² | R$${c.preco} | ${c.distancia}m | ${c.dataVenda}`)
}
