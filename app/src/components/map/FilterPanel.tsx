'use client'

import { useFilterStore } from '@/store/filters'
import type { StatusVarredura } from '@/lib/supabase/types'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  counts: Record<StatusVarredura, number>
}

const FILTERS: { status: StatusVarredura; label: string; color: string }[] = [
  { status: 'nao_visitado', label: 'Não Visitado', color: '#9CA3AF' },
  { status: 'mapeado', label: 'Mapeado', color: '#3B82F6' },
  { status: 'em_prospeccao', label: 'Em Prospecção', color: '#EAB308' },
  { status: 'concluido', label: 'Concluído', color: '#22C55E' },
]

export function FilterPanel({ isOpen, onClose, counts }: FilterPanelProps) {
  const { activeStatuses, toggleStatus, showAll } = useFilterStore()

  if (!isOpen) return null

  return (
    <div className="absolute top-12 right-12 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-52">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">Filtros</span>
        <div className="flex items-center gap-2">
          <button onClick={showAll} className="text-[10px] text-[#003DA5] font-medium">
            Todos
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      {FILTERS.map(({ status, label, color }) => (
        <button
          key={status}
          onClick={() => toggleStatus(status)}
          className="flex items-center gap-3 w-full py-2 px-1 hover:bg-gray-50 rounded"
        >
          <div
            className="w-4 h-4 rounded-full border-2"
            style={{
              borderColor: color,
              backgroundColor: activeStatuses.has(status) ? color : 'transparent',
            }}
          />
          <span className="text-sm text-gray-700 flex-1 text-left">{label}</span>
          <span className="text-xs text-gray-400">{counts[status] || 0}</span>
        </button>
      ))}
    </div>
  )
}
