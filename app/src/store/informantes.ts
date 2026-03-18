import { create } from 'zustand'

interface InformantesState {
  selectedInformanteId: string | null
  isInformanteFormOpen: boolean
  informanteFormEdificioId: string | null

  openInformanteForm: (edificioId?: string) => void
  closeInformanteForm: () => void
  selectInformante: (id: string | null) => void
}

export const useInformantesStore = create<InformantesState>((set) => ({
  selectedInformanteId: null,
  isInformanteFormOpen: false,
  informanteFormEdificioId: null,

  openInformanteForm: (edificioId) =>
    set({
      isInformanteFormOpen: true,
      informanteFormEdificioId: edificioId ?? null,
    }),

  closeInformanteForm: () =>
    set({
      isInformanteFormOpen: false,
      informanteFormEdificioId: null,
    }),

  selectInformante: (id) =>
    set({ selectedInformanteId: id }),
}))
