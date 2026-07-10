/**
 * Inspeção read-only: linhas completas de acm_comparaveis na vizinhança do alvo
 * (Rua Dr. Andrade Pertence) para ver QUAIS campos existem de fato no banco.
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../acm-honduras/lib.mjs'

const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data, error } = await supa
  .from('acm_comparaveis')
  .select('*')
  .ilike('endereco', '%ANDRADE PERTENCE%')
  .limit(10)
if (error) throw new Error(error.message)
console.log(`hits ANDRADE PERTENCE: ${data.length}`)
for (const r of data) console.log(JSON.stringify(r, null, 2))

// Estatística de preenchimento dos campos de metodologia na base toda (amostra 1000)
const { data: amostra, error: e2 } = await supa.from('acm_comparaveis').select('*').limit(1000)
if (e2) throw new Error(e2.message)
const campos = Object.keys(amostra[0] ?? {})
console.log('\nPreenchimento (amostra 1000):')
for (const campo of campos) {
  const nn = amostra.filter((r) => r[campo] != null).length
  console.log(`  ${campo}: ${nn}/1000 não-nulos`)
}
