/**
 * Parse PostGIS WKB hex or WKT POINT to {lat, lng}
 * Supports: WKT "POINT(lng lat)", EWKT "SRID=4326;POINT(lng lat)", WKB/EWKB hex
 */
export function parseCoordinates(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null

  // WKT format: POINT(lng lat) or SRID=4326;POINT(lng lat)
  const wktMatch = raw.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/)
  if (wktMatch) {
    return { lng: parseFloat(wktMatch[1]), lat: parseFloat(wktMatch[2]) }
  }

  // WKB/EWKB hex format — decode for Point geometry only.
  // Usa DataView (browser + Node) em vez de Buffer (Node-only) para funcionar
  // também no client (a call list e o mapa rodam no browser).
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 42) {
    try {
      const bytes = new Uint8Array(raw.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(raw.substring(i * 2, i * 2 + 2), 16)
      }
      const view = new DataView(bytes.buffer)
      const little = view.getUint8(0) === 1 // 0 = big, 1 = little endian
      const typeWord = view.getUint32(1, little)
      const hasSRID = (typeWord & 0x20000000) !== 0
      const coordOffset = hasSRID ? 9 : 5
      const lng = view.getFloat64(coordOffset, little)
      const lat = view.getFloat64(coordOffset + 8, little)
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    } catch {
      // fall through
    }
  }

  return null
}
