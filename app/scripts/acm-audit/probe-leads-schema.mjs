/**
 * READ-ONLY: introspecta o schema REAL de `leads` em PROD (projeto remax-moema)
 * para resolver a dívida #1/#3 do handoff 20260622 (captação Epic 6 ⟂ PII cifrada).
 *
 * 1. Lê o OpenAPI do PostgREST (GET /rest/v1/) → colunas exatas de `leads`.
 * 2. Verifica se as RPCs de vault existem (fn_store_lead_pii / fn_decrypt_lead_pii).
 * Não escreve nada. Mesmo padrão de carregamento de env de 9.0-data-audit.mjs.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

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
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }

// 1. OpenAPI → colunas de leads
const specRes = await fetch(`${url}/rest/v1/`, { headers })
const spec = await specRes.json()
const leadsProps = spec?.definitions?.leads?.properties ?? spec?.components?.schemas?.leads?.properties
console.log('=== COLUNAS REAIS DE `leads` EM PROD ===')
if (leadsProps) {
  for (const [col, def] of Object.entries(leadsProps)) {
    console.log(`  ${col.padEnd(28)} ${def.format || def.type || ''}`)
  }
} else {
  console.log('  (não encontrado no OpenAPI — keys disponíveis:', Object.keys(spec?.definitions ?? spec?.components?.schemas ?? {}).slice(0, 20), ')')
}

// 2. PII-relevant: existência das colunas-chave
const cols = leadsProps ? Object.keys(leadsProps) : []
const check = (c) => (cols.includes(c) ? '✅ existe' : '❌ ausente')
console.log('\n=== COLUNAS-CHAVE PII / CAPTAÇÃO ===')
for (const c of [
  'telefone', 'email', 'notas', 'enrichment_data',
  'telefone_encrypted', 'email_encrypted',
  'telefone_secret_id', 'email_secret_id', 'whatsapp_secret_id', 'nome_secret_id',
  'lgpd_status', 'contato_status', 'contato_status_at', 'contato_notas', 'scraped_listing_id',
]) {
  console.log(`  ${c.padEnd(22)} ${check(c)}`)
}

// 3. RPCs de vault — existem em PROD?
console.log('\n=== RPCs DE VAULT ===')
async function probeRpc(name, body) {
  const r = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const txt = await r.text()
  // 404 PGRST202 = função não existe; outros = existe mas argumentos/validação
  const exists = !(r.status === 404 || txt.includes('PGRST202'))
  console.log(`  ${name.padEnd(24)} ${exists ? '✅ existe' : '❌ ausente'} (HTTP ${r.status}) ${txt.slice(0, 120)}`)
}
await probeRpc('fn_store_lead_pii', { p_lead_id: '00000000-0000-0000-0000-000000000000', p_field: 'telefone', p_plaintext: 'x' })
await probeRpc('fn_decrypt_lead_pii', { p_lead_id: '00000000-0000-0000-0000-000000000000', p_field: 'telefone' })
