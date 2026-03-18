import { create } from 'zustand'

interface ReferralsState {
  isReferralFormOpen: boolean
  referralFormParceiroNome: string | null
  referralFormParceiroFranquia: string | null
  isPartnerFormOpen: boolean
  selectedReferralId: string | null

  // Filters
  statusFilter: string[]
  direcaoFilter: 'enviado' | 'recebido' | null

  openReferralForm: (parceiroNome: string, parceiroFranquia: string | null) => void
  closeReferralForm: () => void
  openPartnerForm: () => void
  closePartnerForm: () => void
  selectReferral: (id: string | null) => void
  setStatusFilter: (statuses: string[]) => void
  setDirecaoFilter: (direcao: 'enviado' | 'recebido' | null) => void
  resetFilters: () => void
}

export const useReferralsStore = create<ReferralsState>((set) => ({
  isReferralFormOpen: false,
  referralFormParceiroNome: null,
  referralFormParceiroFranquia: null,
  isPartnerFormOpen: false,
  selectedReferralId: null,
  statusFilter: [],
  direcaoFilter: null,

  openReferralForm: (parceiroNome, parceiroFranquia) =>
    set({
      isReferralFormOpen: true,
      referralFormParceiroNome: parceiroNome,
      referralFormParceiroFranquia: parceiroFranquia,
    }),

  closeReferralForm: () =>
    set({
      isReferralFormOpen: false,
      referralFormParceiroNome: null,
      referralFormParceiroFranquia: null,
    }),

  openPartnerForm: () => set({ isPartnerFormOpen: true }),
  closePartnerForm: () => set({ isPartnerFormOpen: false }),
  selectReferral: (id) => set({ selectedReferralId: id }),
  setStatusFilter: (statuses) => set({ statusFilter: statuses }),
  setDirecaoFilter: (direcao) => set({ direcaoFilter: direcao }),
  resetFilters: () => set({ statusFilter: [], direcaoFilter: null }),
}))
