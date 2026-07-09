/**
 * Descoberta read-only para a ACM — Rua Dr. Andrade Pertence, 113 (Vila Olímpia).
 *
 * Mesmo protocolo do caso Honduras (scripts/acm-honduras/01-discover.mjs):
 *  1. Contagem de acm_comparaveis por consultor/fonte (achar quem detém ITBI real).
 *  2. Geocodificar o alvo (Google → fallback Mapbox).
 *  3. RPC fn_comparaveis_no_raio no ponto (raio 1000 m).
 *  4. Amostrar campos de metodologia (data_referencia, área, coords) dos hits.
 *
 * Não escreve nada no banco.
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../acm-honduras/lib.mjs'

const ALVO = {
  descricao: 'Rua Dr. Andrade Pertence, 113 — Vila Olímpia, São Paulo/SP',
  geocodeQuery: 'Rua Doutor Andrade Pertence, 113, Vila Olimpia, Sao Paulo, SP, Brasil',
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
    console.log(
      `  consultant_id=${cid}  total=${a.total}  itbi=${a.itbi}  venda_real=${a.venda}  fontes={${[...a.fontes].join(',')}}`,
    )
  }
  return rows.sort((a, b) => b[1].itbi - a[1].itbi)[0]?.[0] ?? null
}

async function geocodeAlvo() {
  console.log(`\n=== 2) Geocode "${ALVO.descricao}" ===`)
  if (googleKey) {
    try {
      const g = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(ALVO.geocodeQuery)}&key=${googleKey}`,
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
  if (mapboxToken) {
    try {
      const m = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(ALVO.geocodeQuery)}.json?access_token=${mapboxToken}&country=br&limit=3`,
      ).then((r) => r.json())
      if (m.features?.length) {
        for (const f of m.features) console.log(`  [mapbox] candidato: ${f.place_name}`)
        const [lng, lat] = m.features[0].center
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

async function runRpc(lat, lng, consultantId, raio) {
  console.log(
    `\n=== 3) RPC fn_comparaveis_no_raio(lat=${lat}, lng=${lng}, consultant=${consultantId}, raio=${raio}) ===`,
  )
  const { data, error } = await supa.rpc('fn_comparaveis_no_raio', {
    p_lat: lat,
    p_lng: lng,
    p_consultant_id: consultantId,
    p_raio_metros: raio,
  })
  if (error) {
    console.error('  erro:', error.message)
    return null
  }
  console.log(`  comparáveis no raio ${raio}m: ${data.length}`)
  data.slice(0, 30).forEach((c, i) => {
    console.log(
      `   ${i + 1}. ${c.endereco} | ${Math.round(c.distancia_m)}m | R$${c.preco} | ` +
        `AC=${c.area_construida_m2 ?? '—'}m² AT=${c.area_terreno_m2 ?? '—'}m² | venda=${c.is_venda_real} | ` +
        `fonte=${c.fonte} | data=${c.data_referencia ?? c.ano_referencia ?? '—'} | tipo=${c.tipo ?? '—'}`,
    )
  })
  return data
}

;(async () => {
  const bestConsultant = await discoverConsultants()
  const geo = await geocodeAlvo()
  if (geo && bestConsultant) {
    const hits = await runRpc(geo.lat, geo.lng, bestConsultant, 1000)
    if (!hits || hits.length < 5) await runRpc(geo.lat, geo.lng, bestConsultant, 2000)
  }
  console.log('\n=== fim da descoberta ===')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
