import { create } from 'zustand'

interface MapState {
  // Epicentro
  epicenter: { lat: number; lng: number } | null
  activeRadius: number // metros
  // Raios visíveis
  showRadius500: boolean
  showRadius1000: boolean
  showRadius2000: boolean
  // GPS
  userLocation: { lat: number; lng: number } | null
  // Coverage
  coveragePercent: number
  // Actions
  setEpicenter: (coords: { lat: number; lng: number }) => void
  setActiveRadius: (radius: number) => void
  toggleRadius: (radius: 500 | 1000 | 2000) => void
  setUserLocation: (coords: { lat: number; lng: number } | null) => void
  setCoveragePercent: (percent: number) => void
}

// Epicentro padrão: Rua Alvorada, Moema
const DEFAULT_EPICENTER = { lat: -23.5988, lng: -46.6658 }

export const useMapStore = create<MapState>((set) => ({
  epicenter: DEFAULT_EPICENTER,
  activeRadius: 500,
  showRadius500: true,
  showRadius1000: true,
  showRadius2000: true,
  userLocation: null,
  coveragePercent: 0,

  setEpicenter: (coords) => set({ epicenter: coords }),
  setActiveRadius: (radius) => set({ activeRadius: radius }),
  toggleRadius: (radius) =>
    set((state) => {
      if (radius === 500) return { showRadius500: !state.showRadius500 }
      if (radius === 1000) return { showRadius1000: !state.showRadius1000 }
      return { showRadius2000: !state.showRadius2000 }
    }),
  setUserLocation: (coords) => set({ userLocation: coords }),
  setCoveragePercent: (percent) => set({ coveragePercent: percent }),
}))
