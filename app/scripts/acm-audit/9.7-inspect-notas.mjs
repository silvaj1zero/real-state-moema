/**
 * Story 9.7 — inspeção do campo `notas` (READ-ONLY, temporário).
 * Mostra os primeiros 10 registros ITBI com notas para entender o formato real.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[m[1]] = v
  }
  return env
}

const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await supa
  .from('acm_comparaveis')
  .select('id, notas, endereco, fonte')
  .eq('consultant_id', '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c')
  .eq('fonte', 'itbi')
  .not('notas', 'is', null)
  .limit(10)

if (error) { console.error(error.message); process.exit(1) }

for (const r of data) {
  console.log('ENDERECO:', r.endereco)
  console.log('NOTAS:   ', JSON.stringify(r.notas))
  console.log('---')
}
