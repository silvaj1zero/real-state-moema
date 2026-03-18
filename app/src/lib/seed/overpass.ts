// OSM Overpass API client for seed data
// Story 1.7: Seed Data — Pré-carga de Edifícios (VETO PV #1)
// Fonte primária: 16.595 edifícios verificados no raio 2km de Moema

interface OverpassElement {
  id: number
  type: string
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassBuilding {
  id: number
  type: string
  lat: number
  lng: number
  name: string | null
  address: string | null
  housenumber: string | null
  street: string | null
  suburb: string | null
  postcode: string | null
  buildingType: string | null
}

export async function fetchBuildingsFromOverpass(
  lat: number,
  lng: number,
  radiusMeters: number = 2000
): Promise<OverpassBuilding[]> {
  const query = `[out:json][timeout:60];(way["building"](around:${radiusMeters},${lat},${lng});relation["building"](around:${radiusMeters},${lat},${lng}););out center qt;`

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`)
  }

  const data = await response.json()
  const elements = data.elements || []

  return elements
    .filter((el: OverpassElement) => el.center?.lat && el.center?.lon)
    .map((el: OverpassElement) => ({
      id: el.id,
      type: el.type,
      lat: el.center!.lat,
      lng: el.center!.lon,
      name: el.tags?.name || null,
      address: formatAddress(el.tags),
      housenumber: el.tags?.['addr:housenumber'] || null,
      street: el.tags?.['addr:street'] || null,
      suburb: el.tags?.['addr:suburb'] || null,
      postcode: el.tags?.['addr:postcode'] || null,
      buildingType: el.tags?.building || null,
    }))
}

function formatAddress(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null
  const parts = []
  if (tags['addr:street']) parts.push(tags['addr:street'])
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber'])
  if (parts.length === 0) return null
  return parts.join(', ')
}
