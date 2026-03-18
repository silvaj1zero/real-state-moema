import { create } from 'zustand'
import type { EtapaFunil } from '@/lib/supabase/types'

interface FunnelState {
  // Active tab in mobile funnel view
  activeTab: EtapaFunil
  setActiveTab: (tab: EtapaFunil) => void

  // Transition modal state
  transitionModalOpen: boolean
  transitionModalLeadId: string | null
  transitionModalFromEtapa: EtapaFunil | null
  transitionModalTargetEtapa: EtapaFunil | null

  openTransitionModal: (
    leadId: string,
    fromEtapa: EtapaFunil,
    targetEtapa: EtapaFunil
  ) => void
  closeTransitionModal: () => void
}

export const useFunnelStore = create<FunnelState>((set) => ({
  activeTab: 'contato',
  setActiveTab: (tab) => set({ activeTab: tab }),

  transitionModalOpen: false,
  transitionModalLeadId: null,
  transitionModalFromEtapa: null,
  transitionModalTargetEtapa: null,

  openTransitionModal: (leadId, fromEtapa, targetEtapa) =>
    set({
      transitionModalOpen: true,
      transitionModalLeadId: leadId,
      transitionModalFromEtapa: fromEtapa,
      transitionModalTargetEtapa: targetEtapa,
    }),

  closeTransitionModal: () =>
    set({
      transitionModalOpen: false,
      transitionModalLeadId: null,
      transitionModalFromEtapa: null,
      transitionModalTargetEtapa: null,
    }),
}))
