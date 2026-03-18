import { describe, it, expect } from 'vitest'
import { relativeTime, FEED_TYPE_CONFIG, DEFAULT_FILTERS } from './useFeed'

describe('relativeTime', () => {
  it('should show "agora" for just now', () => {
    expect(relativeTime(new Date().toISOString())).toBe('agora')
  })

  it('should show minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(relativeTime(fiveMinAgo)).toBe('há 5min')
  })

  it('should show hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(twoHoursAgo)).toBe('há 2h')
  })

  it('should show "ontem"', () => {
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(yesterday)).toBe('ontem')
  })

  it('should show days', () => {
    const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(threeDays)).toBe('3 dias atrás')
  })
})

describe('FEED_TYPE_CONFIG', () => {
  it('should have 8 event types', () => {
    expect(Object.keys(FEED_TYPE_CONFIG)).toHaveLength(8)
  })

  it('should have color and icon for each type', () => {
    for (const config of Object.values(FEED_TYPE_CONFIG)) {
      expect(config.color).toMatch(/^#/)
      expect(config.icon).toBeTruthy()
      expect(config.label).toBeTruthy()
    }
  })
})

describe('DEFAULT_FILTERS', () => {
  it('should default to semana + nao lidos + alta+media', () => {
    expect(DEFAULT_FILTERS.periodo).toBe('semana')
    expect(DEFAULT_FILTERS.apenasNaoLidos).toBe(true)
    expect(DEFAULT_FILTERS.prioridades).toEqual(['alta', 'media'])
    expect(DEFAULT_FILTERS.tipos).toEqual([])
  })
})
