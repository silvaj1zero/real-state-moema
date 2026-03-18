'use client'

import { useInformantesByEdificio } from '@/hooks/useInformantes'
import { useInformantesStore } from '@/store/informantes'
import type { FuncaoInformante } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Color/label maps
// ---------------------------------------------------------------------------

const QUALIDADE_COLORS: Record<string, string> = {
  frio: '#9CA3AF',
  morno: '#F97316',
  quente: '#EF4444',
}

const QUALIDADE_LABELS: Record<string, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
}

const FUNCAO_LABELS: Record<FuncaoInformante, string> = {
  zelador: 'Zelador',
  porteiro: 'Porteiro',
  gerente_predial: 'Gerente',
  comerciante: 'Comerciante',
  sindico: 'Sindico',
  outro: 'Outro',
}

// ---------------------------------------------------------------------------
// InformanteList — shows informantes linked to a building in building card
// ---------------------------------------------------------------------------

interface InformanteListProps {
  edificioId: string
  maxVisible?: number
  className?: string
}

export function InformanteList({
  edificioId,
  maxVisible = 2,
  className,
}: InformanteListProps) {
  const { informantes, isLoading } = useInformantesByEdificio(edificioId)
  const selectInformante = useInformantesStore((s) => s.selectInformante)

  if (isLoading) {
    return (
      <div className={cn('py-2', className)}>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (informantes.length === 0) {
    return null
  }

  const visibleInformantes = informantes.slice(0, maxVisible)
  const hasMore = informantes.length > maxVisible

  return (
    <div className={cn('space-y-2', className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
          Informantes
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full font-semibold">
          {informantes.length}
        </span>
      </div>

      {/* Informante items */}
      <div className="space-y-1.5">
        {visibleInformantes.map((informante) => (
          <button
            key={informante.id}
            onClick={() => selectInformante(informante.id)}
            className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            {/* Info */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate block">
                {informante.nome}
              </span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Funcao badge */}
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                {FUNCAO_LABELS[informante.funcao]}
              </span>

              {/* Qualidade chip — color-coded */}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded text-white font-medium"
                style={{
                  backgroundColor:
                    QUALIDADE_COLORS[informante.qualidade_relacao],
                }}
              >
                {QUALIDADE_LABELS[informante.qualidade_relacao]}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* "Ver todos" link */}
      {hasMore && (
        <button
          onClick={() => {
            // TODO: navigate to full informantes view for this building
          }}
          className="text-xs text-[#003DA5] font-medium hover:underline"
        >
          Ver todos ({informantes.length})
        </button>
      )}
    </div>
  )
}
