import { describe, it, expect, beforeEach } from 'vitest'
import { useMapStore } from './map'

describe('useMapStore', () => {
  beforeEach(() => {
    useMapStore.setState({
      epicenter: { lat: -23.5988, lng: -46.6658 },
      activeRadius: 500,
      showRadius500: true,
      showRadius1000: true,
      showRadius2000: true,
      userLocation: null,
      coveragePercent: 0,
    })
  })

  it('should have default epicenter at Rua Alvorada', () => {
    const { epicenter } = useMapStore.getState()
    expect(epicenter?.lat).toBeCloseTo(-23.5988, 3)
    expect(epicenter?.lng).toBeCloseTo(-46.6658, 3)
  })

  it('should toggle radius visibility', () => {
    useMapStore.getState().toggleRadius(500)
    expect(useMapStore.getState().showRadius500).toBe(false)

    useMapStore.getState().toggleRadius(500)
    expect(useMapStore.getState().showRadius500).toBe(true)
  })

  it('should update epicenter', () => {
    const newCoords = { lat: -23.6000, lng: -46.6700 }
    useMapStore.getState().setEpicenter(newCoords)
    expect(useMapStore.getState().epicenter).toEqual(newCoords)
  })

  it('should set user location from GPS', () => {
    const gpsCoords = { lat: -23.5990, lng: -46.6660 }
    useMapStore.getState().setUserLocation(gpsCoords)
    expect(useMapStore.getState().userLocation).toEqual(gpsCoords)
  })

  it('should update coverage percent', () => {
    useMapStore.getState().setCoveragePercent(42)
    expect(useMapStore.getState().coveragePercent).toBe(42)
  })

  it('should default active radius to 500m', () => {
    expect(useMapStore.getState().activeRadius).toBe(500)
  })
})
