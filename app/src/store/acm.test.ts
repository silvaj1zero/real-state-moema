import { describe, it, expect, beforeEach } from 'vitest'
import { useAcmStore, getEffectiveRadius } from './acm'

describe('useAcmStore', () => {
  beforeEach(() => {
    useAcmStore.setState({
      filterType: 'todos',
      radiusOption: 500,
      customRadius: 500,
      selectedScrapedIds: new Set(),
      isAddSheetOpen: false,
    })
  })

  it('should default to "todos" filter', () => {
    expect(useAcmStore.getState().filterType).toBe('todos')
  })

  it('should toggle filter type', () => {
    useAcmStore.getState().setFilterType('venda_real')
    expect(useAcmStore.getState().filterType).toBe('venda_real')

    useAcmStore.getState().setFilterType('anuncio')
    expect(useAcmStore.getState().filterType).toBe('anuncio')
  })

  it('should default radius to 500m', () => {
    expect(useAcmStore.getState().radiusOption).toBe(500)
  })

  it('should change radius option', () => {
    useAcmStore.getState().setRadiusOption(1000)
    expect(useAcmStore.getState().radiusOption).toBe(1000)

    useAcmStore.getState().setRadiusOption('moema')
    expect(useAcmStore.getState().radiusOption).toBe('moema')
  })

  it('should set custom radius', () => {
    useAcmStore.getState().setCustomRadius(750)
    expect(useAcmStore.getState().customRadius).toBe(750)
  })

  it('should toggle scraped listing selection', () => {
    const store = useAcmStore.getState()
    store.toggleScrapedId('abc')
    expect(useAcmStore.getState().selectedScrapedIds.has('abc')).toBe(true)

    useAcmStore.getState().toggleScrapedId('abc')
    expect(useAcmStore.getState().selectedScrapedIds.has('abc')).toBe(false)
  })

  it('should select all scraped listings', () => {
    useAcmStore.getState().selectAllScraped(['a', 'b', 'c'])
    const ids = useAcmStore.getState().selectedScrapedIds
    expect(ids.size).toBe(3)
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(true)
    expect(ids.has('c')).toBe(true)
  })

  it('should clear scraped selection', () => {
    useAcmStore.getState().selectAllScraped(['a', 'b'])
    useAcmStore.getState().clearScrapedSelection()
    expect(useAcmStore.getState().selectedScrapedIds.size).toBe(0)
  })

  it('should open and close add sheet', () => {
    expect(useAcmStore.getState().isAddSheetOpen).toBe(false)
    useAcmStore.getState().openAddSheet()
    expect(useAcmStore.getState().isAddSheetOpen).toBe(true)
    useAcmStore.getState().closeAddSheet()
    expect(useAcmStore.getState().isAddSheetOpen).toBe(false)
  })
})

describe('getEffectiveRadius', () => {
  it('should return numeric radius directly', () => {
    expect(getEffectiveRadius(500, 500)).toBe(500)
    expect(getEffectiveRadius(1000, 500)).toBe(1000)
    expect(getEffectiveRadius(2000, 500)).toBe(2000)
  })

  it('should return custom radius for "custom" option', () => {
    expect(getEffectiveRadius('custom', 750)).toBe(750)
    expect(getEffectiveRadius('custom', 1200)).toBe(1200)
  })

  it('should return 5000m for bairro options', () => {
    expect(getEffectiveRadius('moema', 500)).toBe(5000)
    expect(getEffectiveRadius('vila_olimpia', 500)).toBe(5000)
    expect(getEffectiveRadius('itaim_bibi', 500)).toBe(5000)
  })
})
