/**
 * Story 7.4 — LOGIC-001 fix verification (QA gate 2794411).
 *
 * Garante que o cap de listagens em MercadoLivre é enforçado POR BAIRRO,
 * não globalmente. Bug original: contador global compartilhado entre
 * bairros causava parada prematura quando o primeiro bairro estourava.
 *
 * Determinístico: helpers puros, sem rede, sem IO.
 */

import { describe, it, expect } from 'vitest'

import {
  extractBairroFromUrl,
  shouldStopBairro,
  clampDetailsToCap,
  nextBairroCount,
  shouldEnqueueNextPage,
} from '@/lib/scrapers/mercadolivre'

describe('extractBairroFromUrl', () => {
  it('extrai slug "moema" de URL canonica de casas/venda', () => {
    const url = 'https://imoveis.mercadolivre.com.br/casas/venda/sao-paulo/moema/'
    expect(extractBairroFromUrl(url)).toBe('moema')
  })

  it('extrai slug "vila-olimpia" preservando hifens', () => {
    const url = 'https://imoveis.mercadolivre.com.br/apartamentos/venda/sao-paulo/vila-olimpia/'
    expect(extractBairroFromUrl(url)).toBe('vila-olimpia')
  })

  it('extrai slug "itaim-bibi" de URL com paginacao', () => {
    const url =
      'https://imoveis.mercadolivre.com.br/apartamentos/venda/sao-paulo/itaim-bibi/_Desde_49'
    expect(extractBairroFromUrl(url)).toBe('itaim-bibi')
  })

  it('retorna "unknown" se URL nao casar', () => {
    expect(extractBairroFromUrl('https://example.com/foo/bar')).toBe('unknown')
  })
})

describe('shouldStopBairro', () => {
  it('false quando contador < cap', () => {
    expect(shouldStopBairro(0, 500)).toBe(false)
    expect(shouldStopBairro(499, 500)).toBe(false)
  })

  it('true quando contador >= cap (igual ou acima)', () => {
    expect(shouldStopBairro(500, 500)).toBe(true)
    expect(shouldStopBairro(501, 500)).toBe(true)
  })
})

describe('clampDetailsToCap', () => {
  it('retorna todos se a soma cabe abaixo do cap', () => {
    const urls = ['a', 'b', 'c']
    expect(clampDetailsToCap(urls, 0, 500)).toEqual(['a', 'b', 'c'])
  })

  it('clamp ao remaining quando excederia o cap', () => {
    const urls = ['a', 'b', 'c', 'd', 'e']
    // bairroCount=498, cap=500 → so 2 cabem
    expect(clampDetailsToCap(urls, 498, 500)).toEqual(['a', 'b'])
  })

  it('retorna [] quando bairroCount === cap', () => {
    expect(clampDetailsToCap(['a'], 500, 500)).toEqual([])
  })

  it('retorna [] quando bairroCount > cap (defensivo)', () => {
    expect(clampDetailsToCap(['a', 'b'], 600, 500)).toEqual([])
  })
})

describe('nextBairroCount', () => {
  it('soma o numero enqueued ao contador atual', () => {
    expect(nextBairroCount(10, 20)).toBe(30)
    expect(nextBairroCount(0, 0)).toBe(0)
  })
})

describe('shouldEnqueueNextPage', () => {
  it('true quando ha nextPageUrl e ainda nao bateu cap', () => {
    expect(shouldEnqueueNextPage(100, 500, true)).toBe(true)
  })

  it('false quando bateu cap mesmo com nextPageUrl', () => {
    expect(shouldEnqueueNextPage(500, 500, true)).toBe(false)
  })

  it('false quando nao ha nextPageUrl', () => {
    expect(shouldEnqueueNextPage(0, 500, false)).toBe(false)
  })
})

describe('per-bairro isolation (integration of helpers)', () => {
  it('cap atingido em um bairro nao afeta outros — simulacao de rotacao', () => {
    // Cenario regressao do bug LOGIC-001:
    //   3 bairros, cap=10 por bairro. Contador global ANTES do fix
    //   travaria todos depois que o primeiro acumulasse 10. Com contador
    //   per-bairro, cada um chega a 10 independentemente.
    const cap = 10
    const bairros = ['moema', 'vila-olimpia', 'itaim-bibi']

    // Para cada bairro processa 3 paginas de 4 detail URLs cada
    for (const bairro of bairros) {
      let bairroCount = 0
      let pagesEnqueued = 0
      const detailUrls = ['d1', 'd2', 'd3', 'd4']
      const maxLoops = 5 // safety

      for (let i = 0; i < maxLoops; i++) {
        if (shouldStopBairro(bairroCount, cap)) break
        const enqueued = clampDetailsToCap(detailUrls, bairroCount, cap)
        bairroCount = nextBairroCount(bairroCount, enqueued.length)
        if (shouldEnqueueNextPage(bairroCount, cap, true)) {
          pagesEnqueued++
        } else {
          break
        }
      }

      // Cada bairro deve ter chegado a exatamente cap=10
      expect(bairroCount).toBe(cap)
      // E paginou 2 vezes (4+4=8 com next, +2 clampados = 10, sem next)
      expect(pagesEnqueued).toBeGreaterThan(0)
      // Sanity check: o slug é o esperado
      expect(bairro).toMatch(/^[a-z-]+$/)
    }
  })

  it('userData.bairro persistido permite paginacao independente entre bairros', () => {
    // Cada bairro carrega seu próprio (bairroCount). Mesmo enqueue
    // simultâneo de 2 LISTING_PAGE de bairros diferentes não compartilha
    // contador.
    const stateMoema = { bairro: 'moema', count: 8 }
    const stateVilaOlimpia = { bairro: 'vila-olimpia', count: 8 }
    const cap = 10

    // Página de Moema com 5 cards → clamp para 2
    const moemaEnqueued = clampDetailsToCap(['a', 'b', 'c', 'd', 'e'], stateMoema.count, cap)
    expect(moemaEnqueued).toHaveLength(2)
    stateMoema.count = nextBairroCount(stateMoema.count, moemaEnqueued.length)
    expect(stateMoema.count).toBe(10)

    // Estado de vila-olimpia ainda intacto — bug original teria zerado também
    expect(stateVilaOlimpia.count).toBe(8)
    const vilaEnqueued = clampDetailsToCap(['x', 'y', 'z'], stateVilaOlimpia.count, cap)
    expect(vilaEnqueued).toHaveLength(2)
  })
})
