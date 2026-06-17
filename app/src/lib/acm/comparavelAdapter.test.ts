import { describe, it, expect } from 'vitest'
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import { comparavelToLaudoSource, buildAcmMapMarkers, fonteLabel } from './comparavelAdapter'

function row(over: Partial<ComparavelNoRaio> = {}): ComparavelNoRaio {
  return {
    comparavel_id: 'c',
    endereco: 'R. X, 1',
    area_m2: 400,
    preco: 5_000_000,
    preco_m2: 12_500,
    is_venda_real: true,
    fonte: 'itbi' as ComparavelNoRaio['fonte'],
    distancia_m: 200,
    ...over,
  }
}

describe('comparavelToLaudoSource — mapeia campos da RPC (Story 8.7)', () => {
  it('mapeia lat/lng/anuncio_url quando presentes', () => {
    const s = comparavelToLaudoSource(row({ latitude: -23.6, longitude: -46.67, anuncio_url: 'https://x/y' }))
    expect(s.lat).toBe(-23.6)
    expect(s.lng).toBe(-46.67)
    expect(s.anuncioUrl).toBe('https://x/y')
    expect(s.statusAnuncio).toBe('anúncio confirmado') // tem URL → confirmado
  })
  it('ausentes → null e off-market (nunca inventado)', () => {
    const s = comparavelToLaudoSource(row())
    expect(s.lat).toBeNull()
    expect(s.lng).toBeNull()
    expect(s.anuncioUrl).toBeNull()
    expect(s.statusAnuncio).toBe('off-market')
  })
  it('fonte itbi → ITBImap; SQL no fonteAnuncio', () => {
    const s = comparavelToLaudoSource(row({ sql_cadastral: '1604608684' }))
    expect(s.fonte).toBe('ITBImap')
    expect(s.fonteAnuncio).toContain('1604608684')
  })
  it('fonteLabel tolera valor fora do union', () => {
    expect(fonteLabel('itbi')).toBe('ITBImap')
    expect(fonteLabel('desconhecida')).toBe('Desconhecida')
  })
})

describe('buildAcmMapMarkers — pins por Top N', () => {
  const target = { lat: -23.6, lng: -46.67 }
  const ranking = [
    { endereco: 'A' }, { endereco: 'B' }, { endereco: 'C' }, { endereco: 'D' }, { endereco: 'E' }, { endereco: 'F' },
  ]
  const src = ranking.map((r, i) => ({
    endereco: r.endereco, areaConstruida: 400, preco: 5e6, lat: -23.6 + i / 1000, lng: -46.67 + i / 1000,
  }))

  it('alvo vermelho grande + Top3 dourado numerado + Top4-5 laranja + demais azuis', () => {
    const m = buildAcmMapMarkers(target, ranking, src as never)
    expect(m[0]).toMatchObject({ color: '#DC1431', size: 'l' }) // alvo
    const top3 = m.filter((x) => x.color === 'D4A843')
    const top45 = m.filter((x) => x.color === 'F97316')
    const outros = m.filter((x) => x.color === '2563EB')
    expect(top3.map((x) => x.label)).toEqual([1, 2, 3])
    expect(top45.map((x) => x.label)).toEqual([4, 5])
    expect(outros).toHaveLength(1) // F
  })
  it('ignora comparáveis sem coords', () => {
    const semCoords = [{ endereco: 'A', areaConstruida: 400, preco: 5e6, lat: null, lng: null }]
    const m = buildAcmMapMarkers(target, ranking, semCoords as never)
    expect(m).toHaveLength(1) // só o alvo
  })
  it('limita o número de "outros" (URL da Static API)', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ endereco: `Z${i}`, areaConstruida: 400, preco: 5e6, lat: -23.6, lng: -46.67 }))
    const m = buildAcmMapMarkers(target, [], many as never, { maxOutros: 10 })
    expect(m.filter((x) => x.color === '2563EB')).toHaveLength(10)
  })
  it('n<5: ranking curto numera só o que existe, sem Top 4-5 (Story 9.3)', () => {
    const shortRanking = [{ endereco: 'A' }, { endereco: 'B' }]
    const shortSrc = shortRanking.map((r, i) => ({
      endereco: r.endereco, areaConstruida: 400, preco: 5e6, lat: -23.6 + i / 1000, lng: -46.67 + i / 1000,
    }))
    const m = buildAcmMapMarkers(target, shortRanking, shortSrc as never)
    expect(m.filter((x) => x.color === 'D4A843').map((x) => x.label)).toEqual([1, 2]) // Top 3 (só 2)
    expect(m.filter((x) => x.color === 'F97316')).toHaveLength(0) // sem Top 4-5
    expect(m[0]).toMatchObject({ color: '#DC1431', size: 'l' }) // alvo presente
  })
})
