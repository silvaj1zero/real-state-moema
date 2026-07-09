/**
 * Dataset congelado do caso Rua Dr. Andrade Pertence, 113 (Vila Olímpia).
 *
 * Fonte: base ITBI/PMSP em PROD (acm_comparaveis, via RPC fn_comparaveis_no_raio)
 * + data_referencia por id (a RPC só expõe o ano) + bairro real via ViaCEP por
 * logradouro (a base ainda não tem CEP por comparável — Story 9.4).
 *
 * RECORTE DECLARADO (impresso no laudo, Sec. 4 — Art. IV: nenhum critério oculto):
 *   R1. Geográfico — raio 1.000 m do alvo (PostGIS).
 *   R2. Evidência — vendas reais ITBI/PMSP (is_venda_real, fonte='itbi').
 *   R3. Pré-filtro — endereço com VENDA ÚNICA no período (endereços com N vendas
 *       são torres). ATENÇÃO: R3 sozinho NÃO separa casa de apartamento — a
 *       ingestão da base descartou o "Complemento" da guia ("AP 82"), então
 *       unidades avulsas de condomínio parecem endereços de rua (incidente
 *       09-Jul-2026: ~50% da amostra era apartamento). Por isso o R5 é OBRIGATÓRIO.
 *   R4. Classe de valor — R$/m² < 22.000 (piso do Score A na régua da metodologia;
 *       o alvo é Score B/reforma geral — mesma classe).
 *   R5. TIPOLOGIA CONFIRMADA — crosscheck por SQL contra as guias oficiais
 *       "Guias de ITBI pagas" (SF/PMSP): só uso IPTU RESIDÊNCIA/horizontal entra;
 *       APARTAMENTO EM CONDOMÍNIO sai. Vendas sem guia pública (2026) entram por
 *       heurística de lote DECLARADA (unidade condominial tem lote ≥ ~0100).
 *       Requer `tipologia-guias.json` (gerar com 10-backfill-tipologia.mjs do
 *       caso 132). Bônus da guia p/ casas: área de TERRENO real, fração e ACC.
 *
 * Saída: docs/acm/andrade-pertence-113/dataset.json (+ cache ViaCEP auditável).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../acm-honduras/lib.mjs'

const TARGET = {
  endereco: 'Rua Dr. Andrade Pertence, 113',
  bairro: 'Vila Olímpia',
  cep: '04549-020', // ViaCEP (logradouro completo — rua de CEP único)
  cidade: 'São Paulo',
  uf: 'SP',
  areaConstruida: 80,
  areaTerreno: 150,
  dormitorios: 3, // 2 dorm (piso superior) + 1 suíte adaptada (piso inferior)
  suites: 1,
  vagas: 1,
  anoConstrucao: 1974,
  precoPretendido: 1_100_000, // valor referenciado pela proprietária
  // Geocode Mapbox 08-Jul-2026 (01-discover): "Rua Doutor Andrade Pertence 113, São Paulo"
  geo: { lat: -23.604671, lng: -46.675232, fonte: 'mapbox 2026-07-08' },
}

const RAIO_M = 1000
const CONSULTANT = '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c' // detém os ITBI (01-discover)
const TETO_PRECO_M2 = 22_000 // piso do Score A (régua Material Didático 1.2)

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const outDir = path.join(repoRoot, 'docs', 'acm', 'andrade-pertence-113')
mkdirSync(outDir, { recursive: true })
const viacepCachePath = path.join(scriptDir, 'viacep-cache.json')

const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// --- 1) RPC no raio ---------------------------------------------------------
const { data: rpcRows, error } = await supa.rpc('fn_comparaveis_no_raio', {
  p_lat: TARGET.geo.lat,
  p_lng: TARGET.geo.lng,
  p_consultant_id: CONSULTANT,
  p_raio_metros: RAIO_M,
})
if (error) throw new Error(`RPC: ${error.message}`)
console.log(`RPC raio ${RAIO_M}m: ${rpcRows.length} linhas`)

// --- 2) Recorte declarado ---------------------------------------------------
const r2 = rpcRows.filter(
  (r) => r.is_venda_real && r.fonte === 'itbi' && (r.area_m2 ?? 0) > 0 && r.preco > 0,
)
const vendasPorEndereco = new Map()
for (const r of r2) vendasPorEndereco.set(r.endereco, (vendasPorEndereco.get(r.endereco) ?? 0) + 1)
const r3 = r2.filter((r) => vendasPorEndereco.get(r.endereco) === 1)
const excluidosPredio = r2.length - r3.length
const r4 = r3.filter((r) => r.preco / r.area_m2 < TETO_PRECO_M2)
const excluidosClasse = r3.filter((r) => r.preco / r.area_m2 >= TETO_PRECO_M2)
console.log(
  `Recorte: ${r2.length} vendas ITBI → venda única no endereço: ${r3.length} ` +
    `(−${excluidosPredio} em edifícios) → R$/m² < ${TETO_PRECO_M2}: ${r4.length} (−${excluidosClasse.length})`,
)

// --- 3) data_referencia completa por id (RPC só expõe o ano) ----------------
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

// --- 4) Bairro real por logradouro (ViaCEP, cache auditável) ----------------
const PREFIXOS = /^(R|AV|AL|TV|PC|EST|PCA)\s+/i
const HONORIFICOS = /^(DR|DRA|PROF|GAL|MAL|CEL|SEN|DEP|ENG|PE)\s+/i
function logradouroBusca(endereco) {
  let s = endereco.replace(/\s+\d+[A-Z]?$/i, '') // remove número final
  s = s.replace(PREFIXOS, '')
  while (HONORIFICOS.test(s)) s = s.replace(HONORIFICOS, '')
  return s.trim()
}

/**
 * Bairros oficiais que intersectam o círculo de 1 km em torno do alvo (fronteira
 * Vila Olímpia / Moema-Pássaros). A busca ViaCEP é por NOME de logradouro (a base
 * não tem CEP por comparável — Story 9.4) e nomes de rua se repetem pela cidade;
 * um match fora desta lista é homônimo de outra região → 'não verificado'.
 */
const BAIRROS_NO_RAIO = new Set([
  'Vila Olímpia',
  'Vila Uberabinha', // denominação ViaCEP de parte da Vila Olímpia
  'Moema',
  'Indianópolis', // denominação ViaCEP de parte de Moema
  'Vila Nova Conceição',
  'Cidade Monções',
  'Itaim Bibi',
  'Brooklin Novo',
])

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
      // Só afirma bairro quando resta exatamente 1 candidato plausível no raio.
      resultado = plausiveis.length === 1 ? plausiveis[0] : null
      if (plausiveis.length !== 1)
        console.warn(`  ViaCEP inconclusivo "${logradouro}": [${bairros.join(' | ') || 'sem resultado'}]`)
    }
  } catch (e) {
    console.warn(`  ViaCEP falhou "${logradouro}": ${e.message}`)
  }
  viacepCache[logradouro] = resultado
  await new Promise((r) => setTimeout(r, 150)) // cortesia de rate
  return resultado
}

/** Denominações ViaCEP → nome de mercado (mesma região oficial). */
const BAIRRO_NORMALIZADO = {
  'Vila Uberabinha': 'Vila Olímpia',
  Indianópolis: 'Moema',
}
const normalizaBairro = (b) => (b == null ? null : (BAIRRO_NORMALIZADO[b] ?? b))

const logradouros = [...new Set(r4.map((r) => logradouroBusca(r.endereco)))]
console.log(`ViaCEP: resolvendo bairro de ${logradouros.length} logradouros...`)
for (const l of logradouros) await bairroViaCep(l)
writeFileSync(viacepCachePath, JSON.stringify(viacepCache, null, 2))

// --- 5) Montagem do dataset --------------------------------------------------
// --- R5: tipologia pela guia oficial (backfill 10-backfill-tipologia.mjs) ----
// A ingestão da base descartou o "Complemento" da guia ("AP 82"...), então
// unidades de condomínio parecem endereços de rua com venda única (fura o R3).
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

const preComparaveis = r4
  .map((r) => {
    const extra = dataPorId.get(r.comparavel_id) ?? {}
    const sql = extra.notas?.match(/SQL\s+(\w+)/)?.[1] ?? null
    const dataRef = extra.data_referencia ?? null
    const tip = sql ? (tipologiaPorSql.get(sql) ?? null) : null
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
      `R4 Classe de valor — R$/m² < ${TETO_PRECO_M2.toLocaleString('pt-BR')} (piso do Score A na régua; alvo é Score B/reforma geral)`,
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
    'areaTerreno dos comparáveis: preenchida pela GUIA OFICIAL para casas confirmadas (fração ideal 1); vendas 2026 sem guia pública seguem sem terreno.',
    'Coordenadas dos comparáveis geocodificadas por logradouro/CEP na ingestão — distâncias aproximadas (±~200 m).',
    'Tipologia (R5): confirmada por guia oficial exceto vendas 2026 ("casa (provável)" por heurística de lote) — conferir na planilha Fase 1.',
    'bairroReal é verificação PARCIAL: por nome de logradouro (ViaCEP) restrita aos bairros que intersectam o raio — não por CEP da guia (Story 9.4). Inconclusivo → "não verificado".',
    'Sem fatores de liquidez elicitados com a consultora: valor de fechamento = valor de mercado nesta emissão.',
  ],
  comparaveis,
}

const outPath = path.join(outDir, 'dataset.json')
writeFileSync(outPath, JSON.stringify(dataset, null, 2))
console.log(`\nDataset: ${outPath}`)
console.log(`Comparáveis: ${comparaveis.length}`)
const meses = new Map()
for (const c of comparaveis) meses.set(c.dataVenda ?? 's/data', (meses.get(c.dataVenda ?? 's/data') ?? 0) + 1)
console.log('Competências:', [...meses.entries()].sort().map(([m, n]) => `${m}:${n}`).join(' '))
const bairros = new Map()
for (const c of comparaveis) bairros.set(c.bairroReal ?? 'não verificado', (bairros.get(c.bairroReal ?? 'não verificado') ?? 0) + 1)
console.log('Bairros:', [...bairros.entries()].map(([b, n]) => `${b}:${n}`).join(' '))
