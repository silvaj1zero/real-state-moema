import { create } from 'zustand'
import type { StatusVarredura } from '@/lib/supabase/types'

interface FilterState {
  activeStatuses: Set<StatusVarredura>
  toggleStatus: (status: StatusVarredura) => void
  showAll: () => void
  isVisible: (status: StatusVarredura) => boolean
}

const ALL_STATUSES: StatusVarredura[] = ['nao_visitado', 'mapeado', 'em_prospeccao', 'concluido']

export const useFilterStore = create<FilterState>((set, get) => ({
  activeStatuses: new Set(ALL_STATUSES),

  toggleStatus: (status) =>
    set((state) => {
      const next = new Set(state.activeStatuses)
      if (next.has(status)) {
        if (next.size > 1) next.delete(status) // keep at least 1
      } else {
        next.add(status)
      }
      return { activeStatuses: next }
    }),

  showAll: () => set({ activeStatuses: new Set(ALL_STATUSES) }),

  isVisible: (status) => get().activeStatuses.has(status),
}))
