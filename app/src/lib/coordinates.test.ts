import { describe, it, expect } from 'vitest'
import { parseCoordinates } from './coordinates'

/** Codifica lng/lat em EWKB hex (Point + SRID 4326, little-endian) — como o PostGIS. */
function toEwkbHex(lng: number, lat: number): string {
  const bytes = new Uint8Array(25)
  const view = new DataView(bytes.buffer)
  view.setUint8(0, 1) // little-endian
  view.setUint32(1, 0x20000001, true) // type: Point + SRID flag
  view.setUint32(5, 4326, true) // SRID
  view.setFloat64(9, lng, true)
  view.setFloat64(17, lat, true)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('parseCoordinates', () => {
  it('faz parse de WKT POINT(lng lat)', () => {
    expect(parseCoordinates('POINT(-46.66 -23.6)')).toEqual({ lng: -46.66, lat: -23.6 })
  })

  it('faz parse de EWKT com SRID', () => {
    expect(parseCoordinates('SRID=4326;POINT(-46.675792 -23.605077)')).toEqual({
      lng: -46.675792,
      lat: -23.605077,
    })
  })

  it('faz parse de EWKB hex (browser-safe, sem Buffer)', () => {
    const hex = toEwkbHex(-46.66, -23.6)
    const result = parseCoordinates(hex)
    expect(result).not.toBeNull()
    expect(result!.lng).toBeCloseTo(-46.66, 6)
    expect(result!.lat).toBeCloseTo(-23.6, 6)
  })

  it('retorna null para entrada vazia/garbage', () => {
    expect(parseCoordinates(null)).toBeNull()
    expect(parseCoordinates('')).toBeNull()
    expect(parseCoordinates('not-a-point')).toBeNull()
  })
})
