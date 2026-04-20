import { create } from 'zustand'

export type SearchMode = 'radius' | 'buildings'
export type TipoTransacao = 'venda' | 'aluguel'
export type SearchStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed'

export interface SearchFilters {
  quartos_min: number | null
  quartos_max: number | null
  suites_min: number | null
  banheiros_min: number | null
  banheiros_max: number | null
  area_min: number | null
  area_max: number | null
  preco_min: number | null
  preco_max: number | null
}

interface SearchState {
  // Mode
  searchMode: SearchMode
  // Geographic
  center: { lat: number; lng: number } | null
  radius: number
  selectedEdificioIds: Set<string>
  // Filters
  filters: SearchFilters
  tipo_transacao: TipoTransacao
  selectedPortals: Set<string>
  fisbo_only: boolean
  // Search state
  currentSearchId: string | null
  searchStatus: SearchStatus
  // Actions
  setSearchMode: (mode: SearchMode) => void
  setCenter: (center: { lat: number; lng: number } | null) => void
  setRadius: (radius: number) => void
  toggleEdificio: (id: string) => void
  updateFilters: (partial: Partial<SearchFilters>) => void
  setTipoTransacao: (tipo: TipoTransacao) => void
  togglePortal: (portal: string) => void
  setFisboOnly: (value: boolean) => void
  startSearch: (searchId: string) => void
  setSearchStatus: (status: SearchStatus) => void
  resetFilters: () => void
}

const DEFAULT_FILTERS: SearchFilters = {
  quartos_min: null,
  quartos_max: null,
  suites_min: null,
  banheiros_min: null,
  banheiros_max: null,
  area_min: null,
  area_max: null,
  preco_min: null,
  preco_max: null,
}

export const useSearchStore = create<SearchState>((set) => ({
  searchMode: 'radius',
  center: null,
  radius: 500,
  selectedEdificioIds: new Set(),
  filters: { ...DEFAULT_FILTERS },
  tipo_transacao: 'venda',
  selectedPortals: new Set(['zap', 'olx', 'vivareal']),
  fisbo_only: false,
  currentSearchId: null,
  searchStatus: 'idle',

  setSearchMode: (searchMode) => set({ searchMode }),

  setCenter: (center) => set({ center }),

  setRadius: (radius) => set({ radius }),

  toggleEdificio: (id) =>
    set((state) => {
      const next = new Set(state.selectedEdificioIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedEdificioIds: next }
    }),

  updateFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  setTipoTransacao: (tipo_transacao) => set({ tipo_transacao }),

  togglePortal: (portal) =>
    set((state) => {
      const next = new Set(state.selectedPortals)
      if (next.has(portal)) {
        if (next.size > 1) next.delete(portal)
      } else {
        next.add(portal)
      }
      return { selectedPortals: next }
    }),

  setFisboOnly: (fisbo_only) => set({ fisbo_only }),

  startSearch: (searchId) =>
    set({ currentSearchId: searchId, searchStatus: 'pending' }),

  setSearchStatus: (searchStatus) => set({ searchStatus }),

  resetFilters: () =>
    set({
      filters: { ...DEFAULT_FILTERS },
      tipo_transacao: 'venda',
      selectedPortals: new Set(['zap', 'olx', 'vivareal']),
      fisbo_only: false,
    }),
}))
