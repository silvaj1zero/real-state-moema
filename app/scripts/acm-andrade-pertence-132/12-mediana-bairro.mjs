/**
 * PROTÓTIPO — Mediana de R$/m² por bairro a partir do ITBI/PMSP em PROD.
 * Objetivo: medir a DISPERSÃO de nível entre bairros vizinhos e confrontar com a
 * premissa do índice de cidade (FipeZap "SP Total"), que é usado só p/ deflação
 * temporal. Se os bairros do raio divergem muito entre si, o índice de cidade é
 * grosseiro demais para NÍVEL (ainda que aceitável p/ MOVIMENTO temporal).
 *
 * Não filtra tipologia (mede o mercado do bairro como um todo, casa+apto) —
 * apples-to-apples com o FipeZap residencial, que é dominado por apartamentos.
 * Rodar de `app/`:  npx -y tsx scripts/acm-andrade-pertence-132/12-mediana-bairro.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../acm-honduras/lib.mjs'
import {
  FIPEZAP_SP_VENDA_RESIDENCIAL,
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
} from '../../src/lib/acm/data/fipezapSpVendaResidencial.ts'

const TARGET = { lat: -23.604158, lng: -46.676145 }
const RAIO_M = 1500
const CONSULTANT = '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const viacepCachePath = path.join(scriptDir, '..', 'acm-andrade-pertence', 'viacep-cache.json')
const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const median = (a) => {
  if (a.length === 0) return 0
  const s = [...a].sort((x, y) => x - y)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

const { data: rpcRows, error } = await supa.rpc('fn_comparaveis_no_raio', {
  p_lat: TARGET.lat,
  p_lng: TARGET.lng,
  p_consultant_id: CONSULTANT,
  p_raio_metros: RAIO_M,
})
if (error) throw new Error(`RPC: ${error.message}`)
const r2 = rpcRows.filter(
  (r) => r.is_venda_real && r.fonte === 'itbi' && (r.area_m2 ?? 0) > 0 && r.preco > 0,
)
console.log(`RPC raio ${RAIO_M}m: ${rpcRows.length} linhas → ITBI válidas: ${r2.length}`)

// data_referencia por id (p/ deflação temporal)
const ids = r2.map((r) => r.comparavel_id)
const dataPorId = new Map()
for (let i = 0; i < ids.length; i += 100) {
  const { data, error: e } = await supa
    .from('acm_comparaveis')
    .select('id,data_referencia')
    .in('id', ids.slice(i, i + 100))
  if (e) throw new Error(`data_referencia: ${e.message}`)
  for (const row of data) dataPorId.set(row.id, row.data_referencia)
}

// bairro por logradouro (mesma lógica do 04-build-dataset)
const PREFIXOS = /^(R|AV|AL|TV|PC|EST|PCA)\s+/i
const HONORIFICOS = /^(DR|DRA|PROF|GAL|MAL|CEL|SEN|DEP|ENG|PE)\s+/i
const logradouroBusca = (endereco) => {
  let s = endereco.replace(/\s+\d+[A-Z]?$/i, '').replace(PREFIXOS, '')
  while (HONORIFICOS.test(s)) s = s.replace(HONORIFICOS, '')
  return s.trim()
}
const BAIRROS_NO_RAIO = new Set([
  'Vila Olímpia', 'Vila Uberabinha', 'Moema', 'Indianópolis',
  'Vila Nova Conceição', 'Cidade Monções', 'Itaim Bibi', 'Brooklin Novo',
])
const BAIRRO_NORMALIZADO = { 'Vila Uberabinha': 'Vila Olímpia', Indianópolis: 'Moema' }
const normalizaBairro = (b) => (b == null ? null : (BAIRRO_NORMALIZADO[b] ?? b))
const viacepCache = existsSync(viacepCachePath) ? JSON.parse(readFileSync(viacepCachePath, 'utf8')) : {}
async function bairroViaCep(logradouro) {
  if (logradouro.length < 3) return null
  if (logradouro in viacepCache) return viacepCache[logradouro]
  let resultado = null
  try {
    const res = await fetch(`https://viacep.com.br/ws/SP/${encodeURIComponent('São Paulo')}/${encodeURIComponent(logradouro)}/json/`)
    if (res.ok) {
      const lista = await res.json()
      const bairros = [...new Set((Array.isArray(lista) ? lista : []).map((v) => v.bairro))]
      const plausiveis = bairros.filter((b) => BAIRROS_NO_RAIO.has(b))
      resultado = plausiveis.length === 1 ? plausiveis[0] : null
    }
  } catch { /* rede — deixa null */ }
  viacepCache[logradouro] = resultado
  await new Promise((r) => setTimeout(r, 130))
  return resultado
}
const logradouros = [...new Set(r2.map((r) => logradouroBusca(r.endereco)))]
console.log(`ViaCEP: ${logradouros.length} logradouros (cache compartilhado)...`)
for (const l of logradouros) await bairroViaCep(l)
writeFileSync(viacepCachePath, JSON.stringify(viacepCache, null, 2))

// deflação FipeZap
const idxPorMes = new Map(FIPEZAP_SP_VENDA_RESIDENCIAL.map((p) => [p.mes, p.indice]))
const idxRef = idxPorMes.get(FIPEZAP_SP_ULTIMA_COMPETENCIA)

// monta registros
const regs = r2.map((r) => {
  const dataRef = dataPorId.get(r.comparavel_id) ?? null
  const mes = dataRef ? dataRef.slice(0, 7) : null
  const idxVenda = mes ? idxPorMes.get(mes) : null
  const fator = idxVenda ? idxRef / idxVenda : 1
  const m2 = r.preco / r.area_m2
  return {
    bairro: normalizaBairro(viacepCache[logradouroBusca(r.endereco)] ?? null) ?? 'não verificado',
    ano: mes ? mes.slice(0, 4) : null,
    m2,
    m2Def: m2 * fator,
  }
})

// agrupa por bairro
const grupos = new Map()
for (const g of regs) {
  const lista = grupos.get(g.bairro) ?? []
  lista.push(g)
  grupos.set(g.bairro, lista)
}
const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
console.log(`\n=== MEDIANA R$/m² POR BAIRRO (ITBI, raio ${RAIO_M}m, todas tipologias) ===`)
console.log('Bairro                | n   | mediana bruta | mediana defl. 2026-06 | média defl.')
const linhas = [...grupos.entries()].sort((a, b) => b[1].length - a[1].length)
for (const [bairro, lista] of linhas) {
  const med = median(lista.map((x) => x.m2))
  const medDef = median(lista.map((x) => x.m2Def))
  const avgDef = mean(lista.map((x) => x.m2Def))
  console.log(`${bairro.padEnd(21)} | ${String(lista.length).padStart(3)} | ${fmt(med).padStart(13)} | ${fmt(medDef).padStart(21)} | ${fmt(avgDef).padStart(11)}`)
}
const todos = regs.map((x) => x.m2Def)
console.log(`\nGLOBAL (raio ${RAIO_M}m): n=${regs.length} | mediana defl.=${fmt(median(todos))} | média defl.=${fmt(mean(todos))}`)
const verificados = regs.filter((x) => x.bairro !== 'não verificado')
console.log(`Cobertura de bairro: ${verificados.length}/${regs.length} (${Math.round((verificados.length / regs.length) * 100)}%)`)

// teste temporal: Moema por ano (bruto) vs movimento FipeZap SP
console.log(`\n=== TESTE TEMPORAL — Moema R$/m² por ano (bruto) vs FipeZap SP ===`)
const moema = regs.filter((x) => x.bairro === 'Moema' && x.ano)
const porAno = new Map()
for (const g of moema) (porAno.get(g.ano) ?? porAno.set(g.ano, []).get(g.ano)).push(g.m2)
const anos = [...porAno.keys()].sort()
const fipeAno = (ano) => {
  const pts = FIPEZAP_SP_VENDA_RESIDENCIAL.filter((p) => p.mes.startsWith(ano)).map((p) => p.indice)
  return pts.length ? mean(pts) : null
}
let baseMoema = null, baseFipe = null
console.log('Ano  | n  | mediana Moema | var. Moema | var. FipeZap SP')
for (const ano of anos) {
  const med = median(porAno.get(ano))
  const fipe = fipeAno(ano)
  // base = primeiro ano com n significativo E ponto FipeZap (evita 2023 n=1 fora da série)
  if (baseMoema == null && fipe != null && porAno.get(ano).length >= 5) { baseMoema = med; baseFipe = fipe }
  const varM = ((med / baseMoema - 1) * 100).toFixed(1)
  const varF = fipe && baseFipe ? ((fipe / baseFipe - 1) * 100).toFixed(1) : '—'
  console.log(`${ano} | ${String(porAno.get(ano).length).padStart(2)} | ${fmt(med).padStart(13)} | ${String(varM).padStart(9)}% | ${String(varF).padStart(13)}%`)
}
