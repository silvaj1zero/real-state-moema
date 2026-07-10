/**
 * Story 9.0 — Auditoria de dados ACM (READ-ONLY). NÃO escreve nada no banco.
 *
 * Responde:
 *  AC1: a RPC fn_comparaveis_no_raio VIVA em PROD retorna latitude/longitude por
 *       comparável? (resolve a contradição do escopo: arquivo de migration tem as
 *       colunas, mas pode não estar aplicada).
 *  AC2: %NULL dos campos da metodologia nas linhas ITBI de Moema.
 *  AC3: disponibilidade de dado para distinguir apartamento × casa (campo `tipo`).
 *  AC4: amostra real de 1 alvo + raio (geocode de endereço real de Moema → RPC).
 *
 * Acesso via PostgREST + SERVICE_ROLE_KEY (bypassa RLS). Mesmo padrão de
 * app/scripts/acm-honduras/01-discover.mjs. Não inventa coordenadas: o centro do
 * raio vem de geocode real (Google/Mapbox) de um endereço de Moema.
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[m[1]] = v
  }
  return env
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const googleKey = env.GOOGLE_API_KEY
const mapboxToken = env.MAPBOX_TOKEN || env.NEXT_PUBLIC_MAPBOX_TOKEN
if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}
const supa = createClient(url, serviceKey, { auth: { persistSession: false } })

// Campos da metodologia a medir cobertura NULL (Story 8.1 + 8.7)
const METHOD_FIELDS = [
  'area_construida_m2', 'area_terreno_m2', 'preco_m2_terreno', 'testada_m',
  'ano_construcao', 'padrao_iptu', 'valor_venal', 'tipo', 'sql_cadastral',
  'dormitorios', 'suites', 'vagas', 'score', 'preco_pedido', 'desagio_percent',
  'status_anuncio', 'data_referencia', 'coordinates', 'scraped_listing_id',
]

async function pickItbiConsultant() {
  console.log('\n=== consultor com mais ITBI ===')
  const { data, error } = await supa
    .from('acm_comparaveis')
    .select('consultant_id,fonte')
    .limit(20000)
  if (error) { console.error('  erro:', error.message); return null }
  const agg = new Map()
  for (const r of data) {
    const k = r.consultant_id ?? 'NULL'
    if (!agg.has(k)) agg.set(k, { total: 0, itbi: 0 })
    agg.get(k).total++
    if (r.fonte === 'itbi') agg.get(k).itbi++
  }
  const rows = [...agg.entries()].sort((a, b) => b[1].itbi - a[1].itbi)
  for (const [cid, a] of rows) console.log(`  ${cid}  total=${a.total}  itbi=${a.itbi}`)
  return rows[0]?.[0] ?? null
}

async function nullCoverage(consultantId) {
  console.log(`\n=== AC2: cobertura NULL (linhas ITBI do consultor ${consultantId}) ===`)
  const { data, error } = await supa
    .from('acm_comparaveis')
    .select(['id', 'fonte', 'endereco', ...METHOD_FIELDS].join(','))
    .eq('consultant_id', consultantId)
    .eq('fonte', 'itbi')
    .limit(20000)
  if (error) { console.error('  erro:', error.message); return null }
  const n = data.length
  console.log(`  linhas ITBI: ${n}`)
  const cov = {}
  for (const f of METHOD_FIELDS) {
    const nulls = data.filter((r) => r[f] === null || r[f] === undefined || r[f] === '').length
    const pct = n ? Math.round((nulls / n) * 1000) / 10 : 0
    cov[f] = { nulls, pct }
    console.log(`  ${f.padEnd(20)} NULL ${String(nulls).padStart(5)} / ${n}  (${pct}%)`)
  }
  return { n, cov, sample: data.slice(0, 3) }
}

async function tipoBreakdown(consultantId) {
  console.log('\n=== AC3: distribuição de `tipo` (apto × casa) ===')
  const { data, error } = await supa
    .from('acm_comparaveis')
    .select('tipo,fonte')
    .eq('consultant_id', consultantId)
    .limit(20000)
  if (error) { console.error('  erro:', error.message); return null }
  const agg = new Map()
  for (const r of data) {
    const k = r.tipo ?? 'NULL'
    agg.set(k, (agg.get(k) ?? 0) + 1)
  }
  const rows = [...agg.entries()].sort((a, b) => b[1] - a[1])
  for (const [t, c] of rows) console.log(`  tipo=${String(t).padEnd(24)} ${c}`)
  return rows
}

async function geocodeMoema() {
  console.log('\n=== AC4: geocode de endereço real de Moema (centro do raio) ===')
  const query = 'Alameda dos Maracatins, Moema, Sao Paulo, SP, Brasil'
  if (googleKey) {
    try {
      const g = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleKey}`).then((r) => r.json())
      if (g.status === 'OK' && g.results?.[0]) {
        const loc = g.results[0].geometry.location
        console.log(`  [google] ${g.results[0].formatted_address} → ${loc.lat},${loc.lng}`)
        return { lat: loc.lat, lng: loc.lng, src: 'google' }
      }
      console.log(`  [google] status=${g.status}`)
    } catch (e) { console.log('  [google] erro:', e.message) }
  }
  if (mapboxToken) {
    try {
      const m = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=br&limit=1`).then((r) => r.json())
      if (m.features?.[0]) {
        const [lng, lat] = m.features[0].center
        console.log(`  [mapbox] ${m.features[0].place_name} → ${lat},${lng}`)
        return { lat, lng, src: 'mapbox' }
      }
    } catch (e) { console.log('  [mapbox] erro:', e.message) }
  }
  console.log('  NENHUM geocode disponível (sem GOOGLE_API_KEY/MAPBOX_TOKEN)')
  return null
}

async function rpcLiveTest(lat, lng, consultantId) {
  console.log(`\n=== AC1+AC4: RPC fn_comparaveis_no_raio viva (lat=${lat}, lng=${lng}, raio=1000) ===`)
  const { data, error } = await supa.rpc('fn_comparaveis_no_raio', {
    p_lat: lat, p_lng: lng, p_consultant_id: consultantId, p_raio_metros: 1000,
  })
  if (error) {
    console.error('  RPC erro:', error.message)
    console.log('  → AC1: a RPC viva NÃO está no contrato esperado (provável migration não aplicada).')
    return null
  }
  console.log(`  comparáveis no raio: ${data.length}`)
  if (data.length) {
    const c = data[0]
    const keys = Object.keys(c)
    const hasLat = keys.includes('latitude'), hasLng = keys.includes('longitude'), hasUrl = keys.includes('anuncio_url')
    console.log(`  colunas retornadas (${keys.length}): ${keys.join(', ')}`)
    console.log(`  → AC1: latitude=${hasLat} longitude=${hasLng} anuncio_url=${hasUrl}`)
    const withCoords = data.filter((x) => x.latitude != null && x.longitude != null).length
    console.log(`  → comparáveis com lat/lng não-nulo: ${withCoords}/${data.length} (destrava pins do mapa 9.3?)`)
    data.slice(0, 5).forEach((x, i) => console.log(`   ${i + 1}. ${x.endereco} | ${Math.round(x.distancia_m)}m | lat=${x.latitude ?? '—'} lng=${x.longitude ?? '—'} | score=${x.score ?? '—'} | sql=${x.sql_cadastral ?? '—'}`))
  }
  return data
}

;(async () => {
  const cid = await pickItbiConsultant()
  if (!cid) { console.error('sem consultor ITBI'); process.exit(1) }
  await nullCoverage(cid)
  await tipoBreakdown(cid)
  const geo = await geocodeMoema()
  if (geo) await rpcLiveTest(geo.lat, geo.lng, cid)
  console.log('\n=== fim da auditoria 9.0 ===')
})().catch((e) => { console.error(e); process.exit(1) })
