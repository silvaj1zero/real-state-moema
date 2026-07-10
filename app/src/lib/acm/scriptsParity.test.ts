/**
 * Paridade scripts ↔ metodologia canônica (Story 9.9).
 *
 * Os scripts one-off (`scripts/acm-honduras/`) não conseguem importar os módulos
 * .ts do app (Node puro, sem transpiler), então mantêm uma cópia-espelho em
 * `scripts/acm-honduras/lib.mjs`. Este teste é o cadeado: se os pesos/fórmulas
 * canônicos de `methodology.ts`/`geo.ts` mudarem, ele quebra apontando o espelho.
 */
import { describe, it, expect } from 'vitest'
import { adherenceIndex, RAIO_PADRAO_M } from './methodology'
import { haversineMeters } from '@/lib/geo'
import { haversineMeters as fisboHaversine } from '@/lib/fisbo/callListOrder'
import {
  adherence as scriptAdherence,
  haversineMeters as scriptHaversine,
  RAIO_PADRAO_M as SCRIPT_RAIO,
} from '../../../scripts/acm-honduras/lib.mjs'
import { HONDURAS_TARGET, HONDURAS_COMPARAVEIS } from './honduras.fixture'

describe('paridade scripts ↔ canônico (Story 9.9)', () => {
  it('raio padrão idêntico', () => expect(SCRIPT_RAIO).toBe(RAIO_PADRAO_M))

  it('aderência do lib.mjs = adherenceIndex() para os 23 comparáveis Honduras', () => {
    for (const c of HONDURAS_COMPARAVEIS) {
      const canonico = adherenceIndex(HONDURAS_TARGET, c).indice
      const script = scriptAdherence(HONDURAS_TARGET, {
        areaConstruida: c.areaConstruida,
        areaTerreno: c.areaTerreno ?? null,
        dist: c.distancia ?? null,
      })
      expect(script).toBeCloseTo(canonico, 12)
    }
  })

  const AMOSTRA: Array<[{ lat: number; lng: number }, { lat: number; lng: number }]> = [
    // Honduras 629 → pontos próximos (escala do raio de análise)
    [{ lat: -23.57354, lng: -46.664088 }, { lat: -23.5735, lng: -46.664 }],
    [{ lat: -23.57354, lng: -46.664088 }, { lat: -23.58, lng: -46.67 }],
    // Moema → Vila Olímpia (escala do mercado-alvo)
    [{ lat: -23.6015, lng: -46.6656 }, { lat: -23.5955, lng: -46.6855 }],
  ]

  it('haversine do lib.mjs = geo.ts (canônico) na amostra', () => {
    for (const [a, b] of AMOSTRA) {
      expect(scriptHaversine(a, b)).toBeCloseTo(haversineMeters(a, b), 6)
    }
  })

  // apify.haversineDistance também delega ao canônico, mas importá-lo aqui
  // puxaria crawlee no jsdom — a delegação dele é 1 linha, coberta por tsc/lint.
  it('fisbo re-exporta o haversine canônico', () => {
    for (const [a, b] of AMOSTRA) {
      expect(fisboHaversine(a, b)).toBe(haversineMeters(a, b))
    }
  })
})
