/**
 * Mapbox Geocoding helper (Story 3.4, AC4)
 *
 * Geocodes addresses to coordinates using Mapbox Geocoding API.
 * Bbox restricted to Moema and surroundings.
 */

const MAPBOX_GEOCODING_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

// Bounding box: Moema + surroundings (SW lng,lat to NE lng,lat)
const MOEMA_BBOX = '-46.68,-23.62,-46.63,-23.57'

export interface GeocodingResult {
  lat: number
  lng: number
  placeName: string
  confidence: number // relevance 0-1
}

function getMapboxToken(): string {
  const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) throw new Error('Missing MAPBOX_TOKEN env var')
  return token
}

/** Geocode a single address */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const token = getMapboxToken()
  const encoded = encodeURIComponent(address)
  const url = `${MAPBOX_GEOCODING_BASE}/${encoded}.json?country=br&bbox=${MOEMA_BBOX}&limit=1&access_token=${token}`

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`Geocoding failed for "${address}": ${res.status}`)
    return null
  }

  const data = await res.json()
  const feature = data.features?.[0]
  if (!feature) return null

  const [lng, lat] = feature.center
  return {
    lat,
    lng,
    placeName: feature.place_name,
    confidence: feature.relevance ?? 0,
  }
}

/** Batch geocode with rate limiting (100ms between requests — Mapbox free tier 600 req/min) */
export async function batchGeocode(
  addresses: { id: string; address: string }[],
  delayMs = 100,
): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>()

  for (const item of addresses) {
    const result = await geocodeAddress(item.address)
    if (result) {
      results.set(item.id, result)
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return results
}
