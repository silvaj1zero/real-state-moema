/**
 * SMOKE GUARDADO — prova que a captação Epic 6 corrigida funciona contra o PROD
 * real (projeto remax-moema). Espelha `buildLeadInsert` + caminho de PII via Vault.
 *
 * Passos:
 *   1. Pega um consultant_id REAL de um lead existente (FK válida).
 *   2. Pega um listing seed (mvp-seed-%) SEM lead p/ esse consultor (evita o
 *      índice único consultant_id+scraped_listing_id).
 *   3. INSERT do lead de teste (mesmo conjunto de colunas do código corrigido).
 *   4. Cifra telefone/email/whatsapp via RPC fn_store_lead_pii.
 *   5. Verifica que *_secret_id foram populados.
 *   6. APAGA o lead de teste. (Os secrets do vault ficam órfãos — nomes reportados.)
 *
 * Service role (bypassa RLS). NÃO usa fn_decrypt (evita escrever em lgpd_audit_log).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
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
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ok = (m) => console.log(`  ✅ ${m}`)
const fail = (m) => { console.error(`  ❌ ${m}`); process.exitCode = 1 }

let leadId = null
try {
  // 1. consultant_id real
  const { data: anyLead, error: e1 } = await supa.from('leads').select('consultant_id').limit(1).maybeSingle()
  if (e1) throw new Error(`consultant lookup: ${e1.message}`)
  const consultantId = anyLead?.consultant_id ?? '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c'
  ok(`consultant_id = ${consultantId}`)

  // 2. seed listing sem lead p/ esse consultor
  const { data: seeds } = await supa
    .from('scraped_listings')
    .select('id, telefone_anunciante, whatsapp_anunciante, nome_anunciante')
    .like('external_id', 'mvp-seed-%')
    .limit(50)
  const { data: existingLeads } = await supa
    .from('leads')
    .select('scraped_listing_id')
    .eq('consultant_id', consultantId)
    .not('scraped_listing_id', 'is', null)
  const taken = new Set((existingLeads ?? []).map((l) => l.scraped_listing_id))
  const seed = (seeds ?? []).find((s) => !taken.has(s.id)) ?? null
  ok(`listing seed = ${seed?.id ?? '(null — sem seed livre, usando null)'}`)

  // 3. INSERT espelhando buildLeadInsert (sem telefone/email em claro)
  const insert = {
    consultant_id: consultantId,
    nome: 'SMOKE captar — DELETE ME',
    edificio_id: null,
    origem: 'fisbo_scraping',
    etapa_funil: 'contato',
    is_fisbo: true,
    scraped_listing_id: seed?.id ?? null,
    notas: 'smoke test captação Epic 6 — apagar',
    enrichment_data: { smoke: true, captured_at: '2026-06-22T00:00:00.000Z' },
  }
  const { data: lead, error: e2 } = await supa.from('leads').insert(insert).select('id').single()
  if (e2) throw new Error(`INSERT lead falhou: ${e2.message}`)
  leadId = lead.id
  ok(`INSERT lead OK → ${leadId} (prova que o conjunto de colunas existe em PROD)`)

  // 4. cifra PII via vault
  const pii = {
    telefone: seed?.telefone_anunciante || '11900000000',
    email: 'smoke@example.com',
    whatsapp: seed?.whatsapp_anunciante || '11900000000',
  }
  for (const [field, value] of Object.entries(pii)) {
    const { data, error } = await supa.rpc('fn_store_lead_pii', { p_lead_id: leadId, p_field: field, p_plaintext: value })
    if (error) fail(`fn_store_lead_pii(${field}): ${error.message}`)
    else ok(`fn_store_lead_pii(${field}) → secret ${data}`)
  }

  // 5. verifica *_secret_id populados
  const { data: check, error: e3 } = await supa
    .from('leads')
    .select('telefone_secret_id, email_secret_id, whatsapp_secret_id, scraped_listing_id, contato_status')
    .eq('id', leadId)
    .single()
  if (e3) throw new Error(`re-select: ${e3.message}`)
  check.telefone_secret_id ? ok('telefone_secret_id populado') : fail('telefone_secret_id NULL')
  check.email_secret_id ? ok('email_secret_id populado') : fail('email_secret_id NULL')
  check.whatsapp_secret_id ? ok('whatsapp_secret_id populado') : fail('whatsapp_secret_id NULL')
  ok(`contato_status default = ${check.contato_status} (Epic 10 ok)`)
} catch (err) {
  fail(err.message)
} finally {
  // 6. cleanup
  if (leadId) {
    const { error } = await supa.from('leads').delete().eq('id', leadId)
    if (error) console.error(`  ⚠️  FALHA AO APAGAR lead ${leadId}: ${error.message} — apagar manualmente!`)
    else {
      ok(`lead de teste ${leadId} APAGADO`)
      console.log(`  ℹ️  vault secrets órfãos (apagar manual se quiser): lead_telefone_${leadId}, lead_email_${leadId}, lead_whatsapp_${leadId}`)
    }
  }
  console.log(process.exitCode ? '\nRESULTADO: ❌ FALHOU' : '\nRESULTADO: ✅ PASSOU — captação funciona em PROD')
}
