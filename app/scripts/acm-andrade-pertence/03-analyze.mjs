/**
 * Análise read-only da amostra RPC para o alvo Rua Dr. Andrade Pertence, 113.
 * Objetivo: entender a composição (áreas, competências, endereços repetidos =
 * prédios) antes de declarar o recorte do laudo. Não escreve no banco.
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnv, adherence } from '../acm-honduras/lib.mjs'

const TARGET = { areaConstruida: 80, areaTerreno: 150 }
const ALVO_GEO = { lat: -23.604671, lng: -46.675232 } // geocode 01-discover (Mapbox)
const CONSULTANT = '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c'

const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ViaCEP: bairro real da rua do alvo
try {
  const via = await fetch(
    'https://viacep.com.br/ws/SP/Sao%20Paulo/Andrade%20Pertence/json/',
  ).then((r) => r.json())
  console.log('=== ViaCEP "Andrade Pertence" (São Paulo/SP) ===')
  for (const v of Array.isArray(via) ? via : []) {
    console.log(`  ${v.logradouro} | CEP ${v.cep} | bairro=${v.bairro}`)
  }
} catch (e) {
  console.log('ViaCEP falhou:', e.message)
}

const { data, error } = await supa.rpc('fn_comparaveis_no_raio', {
  p_lat: ALVO_GEO.lat,
  p_lng: ALVO_GEO.lng,
  p_consultant_id: CONSULTANT,
  p_raio_metros: 1000,
})
if (error) throw new Error(error.message)

console.log(`\n=== RPC: ${data.length} linhas ===`)
console.log('colunas:', Object.keys(data[0]).join(', '))

const rows = data.filter((r) => r.is_venda_real && (r.area_m2 ?? 0) > 0 && r.preco > 0)
console.log(`vendas reais com área: ${rows.length}`)

// Distribuição por competência
const porMes = new Map()
for (const r of rows) {
  const mes = (r.data_referencia ?? '').slice(0, 7) || 's/data'
  porMes.set(mes, (porMes.get(mes) ?? 0) + 1)
}
console.log('\nCompetências:', [...porMes.entries()].sort().map(([m, n]) => `${m}:${n}`).join(' '))

// Distribuição de área
const faixas = [
  [0, 60],
  [60, 100],
  [100, 150],
  [150, 250],
  [250, 400],
  [400, Infinity],
]
console.log('\nÁreas (m²):')
for (const [a, b] of faixas) {
  const n = rows.filter((r) => r.area_m2 >= a && r.area_m2 < b).length
  console.log(`  ${a}–${b === Infinity ? '∞' : b}: ${n}`)
}

// Endereços repetidos (prédios) vs únicos (possíveis casas)
const porEndereco = new Map()
for (const r of rows) porEndereco.set(r.endereco, (porEndereco.get(r.endereco) ?? 0) + 1)
const unicos = [...porEndereco.entries()].filter(([, n]) => n === 1)
console.log(`\nEndereços distintos: ${porEndereco.size} | com venda única: ${unicos.length}`)

// Mediana R$/m² da amostra toda
const med = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
console.log(`Mediana R$/m² (todos): ${med(rows.map((r) => r.preco / r.area_m2)).toFixed(0)}`)

// Top 15 por aderência (área 50% / terreno 20% [sempre 0 aqui] / proximidade 30%)
const ranked = rows
  .map((r) => ({
    r,
    ad: adherence(TARGET, {
      areaConstruida: r.area_m2,
      areaTerreno: null,
      dist: r.distancia_m,
    }),
  }))
  .sort((a, b) => b.ad - a.ad)
console.log('\nTop 15 por aderência:')
ranked.slice(0, 15).forEach(({ r, ad }, i) => {
  console.log(
    `  ${i + 1}. ${r.endereco} | ${r.area_m2}m² | ${Math.round(r.distancia_m)}m | R$${r.preco} | ` +
      `${(r.preco / r.area_m2).toFixed(0)}/m² | ${r.data_referencia} | ader=${ad.toFixed(3)} | vendas no endereço=${porEndereco.get(r.endereco)}`,
  )
})

// Vendas únicas no endereço com área 60–250 m² (proxy de casa/sobrado)
const casasProxy = ranked.filter(
  ({ r }) => porEndereco.get(r.endereco) === 1 && r.area_m2 >= 60 && r.area_m2 <= 250,
)
console.log(`\nProxy "casa" (venda única no endereço, 60–250 m²): ${casasProxy.length}`)
casasProxy.slice(0, 25).forEach(({ r, ad }, i) => {
  console.log(
    `  ${i + 1}. ${r.endereco} | ${r.area_m2}m² | ${Math.round(r.distancia_m)}m | R$${r.preco} | ` +
      `${(r.preco / r.area_m2).toFixed(0)}/m² | ${r.data_referencia} | ader=${ad.toFixed(3)}`,
  )
})
