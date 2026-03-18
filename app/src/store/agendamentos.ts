import { create } from 'zustand'
import type { TipoAgendamento } from '@/lib/supabase/types'

interface AgendamentosState {
  // Schedule modal state
  isScheduleModalOpen: boolean
  scheduleModalLeadId: string | null
  scheduleModalTipo: TipoAgendamento | null

  openScheduleModal: (leadId: string, tipo: 'v1' | 'v2') => void
  closeScheduleModal: () => void
}

export const useAgendamentosStore = create<AgendamentosState>((set) => ({
  isScheduleModalOpen: false,
  scheduleModalLeadId: null,
  scheduleModalTipo: null,

  openScheduleModal: (leadId, tipo) =>
    set({
      isScheduleModalOpen: true,
      scheduleModalLeadId: leadId,
      scheduleModalTipo: tipo,
    }),

  closeScheduleModal: () =>
    set({
      isScheduleModalOpen: false,
      scheduleModalLeadId: null,
      scheduleModalTipo: null,
    }),
}))
