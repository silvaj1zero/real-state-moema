import { create } from 'zustand'

export type AcmFilterType = 'todos' | 'anuncio' | 'venda_real'

export type AcmRadiusOption = 500 | 1000 | 2000 | 'moema' | 'vila_olimpia' | 'itaim_bibi' | 'custom'

interface AcmState {
  // Filter: Anúncio / Venda Real / Todos
  filterType: AcmFilterType
  setFilterType: (filter: AcmFilterType) => void

  // Radius selector
  radiusOption: AcmRadiusOption
  customRadius: number
  setRadiusOption: (option: AcmRadiusOption) => void
  setCustomRadius: (meters: number) => void

  // Selected scraped listings for import
  selectedScrapedIds: Set<string>
  toggleScrapedId: (id: string) => void
  selectAllScraped: (ids: string[]) => void
  clearScrapedSelection: () => void

  // Add comparable sheet
  isAddSheetOpen: boolean
  openAddSheet: () => void
  closeAddSheet: () => void
}

export const useAcmStore = create<AcmState>((set) => ({
  filterType: 'todos',
  setFilterType: (filter) => set({ filterType: filter }),

  radiusOption: 500,
  customRadius: 500,
  setRadiusOption: (option) => set({ radiusOption: option }),
  setCustomRadius: (meters) => set({ customRadius: meters }),

  selectedScrapedIds: new Set(),
  toggleScrapedId: (id) =>
    set((state) => {
      const next = new Set(state.selectedScrapedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedScrapedIds: next }
    }),
  selectAllScraped: (ids) => set({ selectedScrapedIds: new Set(ids) }),
  clearScrapedSelection: () => set({ selectedScrapedIds: new Set() }),

  isAddSheetOpen: false,
  openAddSheet: () => set({ isAddSheetOpen: true }),
  closeAddSheet: () => set({ isAddSheetOpen: false }),
}))

/** Get effective radius in meters from store state */
export function getEffectiveRadius(option: AcmRadiusOption, customRadius: number): number {
  if (typeof option === 'number') return option
  if (option === 'custom') return customRadius
  // Bairro filters use large radius + client-side bairro filter
  return 5000
}
