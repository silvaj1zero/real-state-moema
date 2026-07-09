/** Geocode read-only do alvo — Rua Dr. Andrade Pertence, 132 (Mapbox). */
import { loadEnv } from '../acm-honduras/lib.mjs'

const env = loadEnv()
const token = env.MAPBOX_TOKEN || env.NEXT_PUBLIC_MAPBOX_TOKEN
const query = 'Rua Doutor Andrade Pertence, 132, Vila Olimpia, Sao Paulo, SP, Brasil'
const r = await fetch(
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=br&limit=3`,
).then((x) => x.json())
for (const f of r.features ?? []) {
  console.log(`${f.place_name} → lat=${f.center[1]} lng=${f.center[0]}`)
}
