/**
 * Crosscheck de TIPOLOGIA (read-only) — Top 10 do caso 132.
 *
 * Suspeita do operador (Google Maps): R BALUARTE 230 e AV PAVAO 139 parecem
 * edifícios. O proxy R3 ("venda única no endereço") olhou só o RESULTADO da RPC
 * (raio + consultor). Aqui vasculhamos a TABELA INTEIRA por prefixo de endereço:
 *  - endereço de prédio tende a ter OUTRAS guias (outras unidades) na base;
 *  - também imprimimos SQL (setor.quadra.lote) e notas para conferência GeoSampa.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { loadEnv, adherence } from '../acm-honduras/lib.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(scriptDir, '..', '..', '..', 'docs', 'acm', 'andrade-pertence-132')
const dataset = JSON.parse(readFileSync(path.join(outDir, 'dataset.json'), 'utf8'))

const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Top 10 pela aderência (mesma conta do laudo — área 50% + terreno 0 + prox 30%)
const T = { areaConstruida: dataset.target.areaConstruida, areaTerreno: 0 }
const top10 = dataset.comparaveis
  .map((c) => ({ c, ad: adherence(T, { areaConstruida: c.areaConstruida, areaTerreno: null, dist: c.distancia }) }))
  .sort((a, b) => b.ad - a.ad)
  .slice(0, 10)

for (const { c, ad } of top10) {
  // Prefixo do endereço (rua + número exato) na TABELA INTEIRA, sem filtro de raio/consultor.
  const { data, error } = await supa
    .from('acm_comparaveis')
    .select('endereco,area_m2,preco,data_referencia,is_venda_real,fonte,consultant_id,notas')
    .ilike('endereco', `${c.endereco}%`)
  if (error) throw new Error(error.message)
  const linhas = data.filter((r) => r.endereco === c.endereco || r.endereco.startsWith(`${c.endereco} `))
  console.log(`\n=== ${c.endereco}  (ader=${ad.toFixed(3)} | ${c.areaConstruida}m² | R$${c.preco} | ${c.dataVenda} | SQL ${c.sqlCadastral ?? '—'})`)
  console.log(`  guias na base inteira com este endereço: ${linhas.length}`)
  for (const r of linhas) {
    const sql = r.notas?.match(/SQL\s+(\w+)/)?.[1] ?? '—'
    console.log(
    `   - ${r.endereco} | ${r.area_m2}m² | R$${r.preco} | ${r.data_referencia} | SQL ${sql}`,
    )
  }
}
