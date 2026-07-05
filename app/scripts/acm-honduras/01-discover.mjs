/**
 * Descoberta read-only para o documento de validação ACM — Rua Honduras, 629.
 *
 * Objetivo (não escreve nada):
 *  1. Achar o consultant_id que detém os ITBI reais (contagem por consultor).
 *  2. Geocodificar "Rua Honduras, 629" (Jardim América/SP).
 *  3. Rodar a RPC fn_comparaveis_no_raio nesse ponto (raio 1000m) por consultor.
 *  4. Cruzar com os 23 endereços do laudo oficial (honduras.fixture) para ver
 *     quais já existem no banco e com que campos (data, coords, url).
 *
 * Acesso via PostgREST + SERVICE_ROLE_KEY (bypassa RLS). DATABASE_URL direto está
 * obsoleto — por isso usamos supabase-js, não SQL direto.
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './lib.mjs'

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

// --- 1) Contagem por consultor / fonte -------------------------------------
async function discoverConsultants() {
  console.log('\n=== 1) acm_comparaveis: contagem por consultor/fonte ===')
  const { data, error } = await supa
    .from('acm_comparaveis')
    .select('consultant_id,fonte,is_venda_real')
    .limit(20000)
  if (error) {
    console.error('  erro:', error.message)
    return null
  }
  const agg = new Map()
  for (const r of data) {
    const key = r.consultant_id ?? 'NULL'
    if (!agg.has(key)) agg.set(key, { total: 0, itbi: 0, venda: 0, fontes: new Set() })
    const a = agg.get(key)
    a.total++
    if (r.fonte === 'itbi') a.itbi++
    if (r.is_venda_real) a.venda++
    a.fontes.add(r.fonte)
  }
  console.log(`  linhas lidas: ${data.length}`)
  const rows = [...agg.entries()].sort((a, b) => b[1].total - a[1].total)
  for (const [cid, a] of rows) {
    console.log(`  consultant_id=${cid}  total=${a.total}  itbi=${a.itbi}  venda_real=${a.venda}  fontes={${[...a.fontes].join(',')}}`)
  }
  // melhor candidato = mais ITBI
  return rows.sort((a, b) => b[1].itbi - a[1].itbi)[0]?.[0] ?? null
}

// --- 2) Geocode Honduras 629 -----------------------------------------------
async function geocodeHonduras() {
  console.log('\n=== 2) Geocode "Rua Honduras, 629" ===')
  const query = 'Rua Honduras, 629, Jardim America, Sao Paulo, SP, Brasil'
  // tenta Google primeiro
  if (googleKey) {
    try {
      const g = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleKey}`,
      ).then((r) => r.json())
      if (g.status === 'OK' && g.results?.[0]) {
        const loc = g.results[0].geometry.location
        console.log(`  [google] ${g.results[0].formatted_address}`)
        console.log(`  lat=${loc.lat} lng=${loc.lng}`)
        return { lat: loc.lat, lng: loc.lng, src: 'google', formatted: g.results[0].formatted_address }
      }
      console.log(`  [google] status=${g.status} ${g.error_message ?? ''}`)
    } catch (e) {
      console.log('  [google] erro:', e.message)
    }
  }
  // fallback Mapbox
  if (mapboxToken) {
    try {
      const m = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=br&limit=1`,
      ).then((r) => r.json())
      if (m.features?.[0]) {
        const [lng, lat] = m.features[0].center
        console.log(`  [mapbox] ${m.features[0].place_name}`)
        console.log(`  lat=${lat} lng=${lng}`)
        return { lat, lng, src: 'mapbox', formatted: m.features[0].place_name }
      }
      console.log('  [mapbox] sem resultado')
    } catch (e) {
      console.log('  [mapbox] erro:', e.message)
    }
  }
  console.log('  NENHUM geocode disponível')
  return null
}

// --- 3) RPC no ponto --------------------------------------------------------
async function runRpc(lat, lng, consultantId) {
  console.log(`\n=== 3) RPC fn_comparaveis_no_raio(lat=${lat}, lng=${lng}, consultant=${consultantId}, raio=1000) ===`)
  const { data, error } = await supa.rpc('fn_comparaveis_no_raio', {
    p_lat: lat,
    p_lng: lng,
    p_consultant_id: consultantId,
    p_raio_metros: 1000,
  })
  if (error) {
    console.error('  erro:', error.message)
    return null
  }
  console.log(`  comparáveis no raio: ${data.length}`)
  data.slice(0, 8).forEach((c, i) => {
    console.log(
      `   ${i + 1}. ${c.endereco} | ${Math.round(c.distancia_m)}m | R$${c.preco} | venda=${c.is_venda_real} | fonte=${c.fonte} | ano=${c.ano_referencia ?? '—'} | url=${c.anuncio_url ? 'sim' : '—'}`,
    )
  })
  return data
}

// --- 4) Cruzar endereços do laudo (fixture) com o banco --------------------
const FIXTURE_ENDERECOS = [
  'R. Maestro Chiaffarelli, 86', 'R. Marechal Bitencourt, 101', 'R. Cons. Torres Homem, 399',
  'R. Henrique Martins', 'R. Canadá, 111', 'R. Groenlândia, 1235', 'R. Chile, 113',
  'R. Cons. Torres Homem, 228', 'R. Marechal Bitencourt, 588', 'R. Holanda, 328',
]
async function crossCheckFixture() {
  console.log('\n=== 4) Endereços do laudo presentes no banco? (ilike por trecho) ===')
  for (const end of FIXTURE_ENDERECOS) {
    const trecho = end.replace(/^R\.\s*/, '').split(',')[0].slice(0, 14)
    const { data, error } = await supa
      .from('acm_comparaveis')
      .select('endereco,fonte,is_venda_real,data_referencia,area_construida_m2')
      .ilike('endereco', `%${trecho}%`)
      .limit(2)
    if (error) { console.log(`  "${trecho}" erro: ${error.message}`); continue }
    if (!data.length) console.log(`  "${trecho}" → AUSENTE`)
    else console.log(`  "${trecho}" → ${data.length} hit(s): ${data.map((d) => `${d.endereco} (${d.fonte}, ${d.data_referencia ?? 's/data'})`).join(' | ')}`)
  }
}

// --- main -------------------------------------------------------------------
;(async () => {
  const bestConsultant = await discoverConsultants()
  const geo = await geocodeHonduras()
  if (geo && bestConsultant) {
    await runRpc(geo.lat, geo.lng, bestConsultant)
  }
  await crossCheckFixture()
  console.log('\n=== fim da descoberta ===')
})().catch((e) => { console.error(e); process.exit(1) })
