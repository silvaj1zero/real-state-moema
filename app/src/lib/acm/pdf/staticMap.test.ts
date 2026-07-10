import { describe, it, expect } from 'vitest'
import { buildStaticMapUrl, circlePolygon, resolveStaticMapImage } from './staticMap'

const CENTER = { lat: -23.5732, lng: -46.6688 } // Jardim América aprox.

describe('circlePolygon', () => {
  it('anel fechado (primeiro = último ponto)', () => {
    const ring = circlePolygon(CENTER, 1000, 16)
    expect(ring).toHaveLength(17)
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })
  it('raio maior → pontos mais distantes do centro', () => {
    const r1 = circlePolygon(CENTER, 500, 8)
    const r2 = circlePolygon(CENTER, 1000, 8)
    const d1 = Math.abs(r1[2][1] - CENTER.lat)
    const d2 = Math.abs(r2[2][1] - CENTER.lat)
    expect(d2).toBeGreaterThan(d1)
  })
})

describe('buildStaticMapUrl', () => {
  it('sem token → null (fallback gracioso)', () => {
    expect(buildStaticMapUrl({ token: null, center: CENTER, radiusMeters: 1000 })).toBeNull()
    expect(buildStaticMapUrl({ token: '  ', center: CENTER, radiusMeters: 1000 })).toBeNull()
  })

  it('com token → URL Mapbox light-v11 com geojson e auto', () => {
    const url = buildStaticMapUrl({ token: 'pk.test', center: CENTER, radiusMeters: 1000 })!
    expect(url).toContain('https://api.mapbox.com/styles/v1/mapbox/light-v11/static/')
    expect(url).toContain('geojson(')
    expect(url).toContain('/auto/')
    expect(url).toContain('access_token=pk.test')
    expect(url).toContain('@2x')
  })

  it('inclui pins na ordem (alvo grande vermelho + comparáveis)', () => {
    const url = buildStaticMapUrl({
      token: 'pk.test',
      center: CENTER,
      radiusMeters: 1000,
      markers: [
        { lat: -23.57, lng: -46.66, label: 1, color: '#003DA5' },
        { lat: CENTER.lat, lng: CENTER.lng, color: '#DC1431', size: 'l' },
      ],
    })!
    expect(url).toContain('pin-s-1+003DA5(-46.66,-23.57)')
    expect(url).toContain(`pin-l+DC1431(${CENTER.lng},${CENTER.lat})`)
  })

  it('retina:false remove @2x', () => {
    const url = buildStaticMapUrl({
      token: 'pk.test',
      center: CENTER,
      radiusMeters: 1000,
      retina: false,
    })!
    expect(url).not.toContain('@2x')
  })
})

describe('resolveStaticMapImage — degradação graciosa', () => {
  const toDataUrl = async () => 'data:image/png;base64,AAAA'

  it('url null → null', async () => {
    expect(await resolveStaticMapImage(null)).toBeNull()
  })

  it('fetch ok → data URL embutível', async () => {
    const fetchImpl = (async () => ({ ok: true, blob: async () => new Blob() })) as unknown as typeof fetch
    expect(await resolveStaticMapImage('https://x', { fetchImpl, toDataUrl })).toBe(
      'data:image/png;base64,AAAA',
    )
  })

  it('resposta não-ok (rate-limit/4xx) → null (não aborta)', async () => {
    const fetchImpl = (async () => ({ ok: false, blob: async () => new Blob() })) as unknown as typeof fetch
    expect(await resolveStaticMapImage('https://x', { fetchImpl, toDataUrl })).toBeNull()
  })

  it('fetch lança (offline) → null (não aborta)', async () => {
    const fetchImpl = (async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await resolveStaticMapImage('https://x', { fetchImpl, toDataUrl })).toBeNull()
  })
})
