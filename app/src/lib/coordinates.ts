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

  // WKB hex format — decode for Point geometry only
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 42) {
    try {
      const buf = Buffer.from(raw, 'hex')
      const endian = buf[0] // 0 = big, 1 = little
      const readDouble = endian === 1
        ? (offset: number) => buf.readDoubleLE(offset)
        : (offset: number) => buf.readDoubleBE(offset)
      const typeWord = endian === 1 ? buf.readUInt32LE(1) : buf.readUInt32BE(1)
      const hasSRID = (typeWord & 0x20000000) !== 0
      const coordOffset = hasSRID ? 9 : 5
      const lng = readDouble(coordOffset)
      const lat = readDouble(coordOffset + 8)
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    } catch {
      // fall through
    }
  }

  return null
}
