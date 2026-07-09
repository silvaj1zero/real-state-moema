/**
 * Story 9.4 — cobertura NULL pós-backfill (READ-ONLY).
 * Compara com baseline 9.0 (100% NULL nos campos de metodologia).
 *
 * Uso (de `app/`):
 *   node scripts/acm-audit/9.4-sink-coverage.mjs
 *
 * Exit 1 se metas mínimas (sql_cadastral / area_construida_m2) não forem batidas.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '../../.env.local')
  const raw = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    env[m[1]] = v
  }
  return env
}

const FIELDS = [
  'area_construida_m2',
  'area_terreno_m2',
  'sql_cadastral',
  'padrao_iptu',
  'tipo',
  'ano_construcao',
  'testada_m',
  'valor_venal',
  'dormitorios',
  'suites',
  'vagas',
  // ampliação R5 — colunas podem não existir ainda
  'complemento',
  'uso_iptu',
  'fracao_ideal',
]

/** Metas §2 de docs/acm/9.4-sink-ac3-verification.md (max % NULL). */
const METAS = {
  sql_cadastral: 5,
  area_construida_m2: 5,
}

const CONSULTANT = process.env.ACM_CONSULTANT_ID || '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c'

const env = loadEnv()
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function countExact(filter) {
  let q = supa
    .from('acm_comparaveis')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_id', CONSULTANT)
    .eq('fonte', 'itbi')
  if (filter) q = filter(q)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function main() {
  console.log('=== Story 9.4 sink coverage (READ-ONLY) ===')
  console.log(`consultant=${CONSULTANT}`)

  const total = await countExact()
  console.log(`total ITBI: ${total}`)
  if (total === 0) {
    console.error('Nenhuma linha ITBI — abort')
    process.exit(1)
  }

  console.log('\nCampo                      NULL%     meta')
  console.log('------------------------- --------  ----')
  let fail = false
  const rows = []

  for (const field of FIELDS) {
    try {
      const nNull = await countExact((q) => q.is(field, null))
      const pct = Math.round((nNull / total) * 1000) / 10
      const meta = METAS[field]
      const metaStr = meta != null ? `≤${meta}%` : '—'
      const bad = meta != null && pct > meta
      if (bad) fail = true
      const mark = bad ? 'FAIL' : ' ok '
      console.log(`${field.padEnd(25)} ${String(pct).padStart(6)}%  ${metaStr.padEnd(6)} ${mark}`)
      rows.push({ field, pct, meta: meta ?? null, ok: !bad })
    } catch (e) {
      console.log(`${field.padEnd(25)}   n/a   (coluna ausente? ${e.message})`)
      rows.push({ field, pct: null, meta: METAS[field] ?? null, ok: null, error: e.message })
    }
  }

  console.log('\nBaseline 9.0: 100% NULL em todos os campos de metodologia.')
  console.log(fail ? '\nEXIT 1 — metas mínimas não batidas' : '\nEXIT 0 — metas mínimas OK (ou sem meta)')
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
