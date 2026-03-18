import { create } from 'zustand'

interface LeadsState {
  selectedLeadId: string | null
  isLeadFormOpen: boolean
  leadFormEdificioId: string | null

  openLeadForm: (edificioId: string) => void
  closeLeadForm: () => void
  selectLead: (id: string | null) => void
}

export const useLeadsStore = create<LeadsState>((set) => ({
  selectedLeadId: null,
  isLeadFormOpen: false,
  leadFormEdificioId: null,

  openLeadForm: (edificioId) =>
    set({ isLeadFormOpen: true, leadFormEdificioId: edificioId }),

  closeLeadForm: () =>
    set({ isLeadFormOpen: false, leadFormEdificioId: null }),

  selectLead: (id) =>
    set({ selectedLeadId: id }),
}))
