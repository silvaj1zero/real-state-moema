'use client'

import type { StatusVarredura } from '@/lib/supabase/types'

interface MapLegendProps {
  counts: Record<StatusVarredura, number>
  total: number
}

const LEGEND_ITEMS: { status: StatusVarredura; label: string; color: string }[] = [
  { status: 'nao_visitado', label: 'Não Visitado', color: '#9CA3AF' },
  { status: 'mapeado', label: 'Mapeado', color: '#3B82F6' },
  { status: 'em_prospeccao', label: 'Prospecção', color: '#EAB308' },
  { status: 'concluido', label: 'Concluído', color: '#22C55E' },
]

export function MapLegend({ counts, total }: MapLegendProps) {
  if (total === 0) return null

  return (
    <div className="absolute bottom-20 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2">
      <div className="flex items-center gap-3">
        {LEGEND_ITEMS.map(({ status, label, color }) => {
          const count = counts[status] || 0
          if (count === 0) return null
          return (
            <div key={status} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-600">{count}</span>
            </div>
          )
        })}
        <span className="text-[10px] text-gray-400 ml-1">| {total}</span>
      </div>
    </div>
  )
}
