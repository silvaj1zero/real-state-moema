/**
 * Geometria geodésica compartilhada — implementação canônica ÚNICA de haversine
 * (Story 9.9; antes havia 3 cópias: fisbo/callListOrder, apify e scripts ACM).
 * A cópia dos scripts (`scripts/acm-honduras/lib.mjs`) espelha esta e é presa
 * por teste de paridade em `src/lib/acm/scriptsParity.test.ts`.
 */

export const EARTH_RADIUS_M = 6_371_000

export interface LatLng {
  lat: number
  lng: number
}

/** Distância haversine em metros entre dois pontos lat/lng. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}
