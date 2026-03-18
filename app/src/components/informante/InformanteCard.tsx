'use client'

import { useInformantesStore } from '@/store/informantes'
import type { InformanteWithEdificios } from '@/hooks/useInformantes'
import type { FuncaoInformante } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Color maps
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
// Utility: format "ha X dias"
// ---------------------------------------------------------------------------

function formatDaysAgo(dateStr: string | null): string | null {
  if (!dateStr) return null

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  if (days === 0) return 'Hoje'
  if (days === 1) return 'ha 1 dia'
  return `ha ${days} dias`
}

// ---------------------------------------------------------------------------
// InformanteCard — card displayed in building detail
// ---------------------------------------------------------------------------

interface InformanteCardProps {
  informante: InformanteWithEdificios
  /** ISO date string of last gentileza action */
  lastGentilezaDate?: string | null
  className?: string
}

export function InformanteCard({
  informante,
  lastGentilezaDate,
  className,
}: InformanteCardProps) {
  const selectInformante = useInformantesStore((s) => s.selectInformante)

  const linkedBuildingsCount = informante.informantes_edificios?.length ?? 0
  const lastGentilezaAgo = formatDaysAgo(lastGentilezaDate ?? null)

  return (
    <button
      onClick={() => selectInformante(informante.id)}
      className={cn(
        'w-full text-left p-3 rounded-xl bg-white border border-gray-200 shadow-sm',
        'hover:shadow-md transition-shadow',
        className,
      )}
    >
      {/* Top row: nome + funcao badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">
          {informante.nome}
        </h4>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium whitespace-nowrap shrink-0">
          {FUNCAO_LABELS[informante.funcao]}
        </span>
      </div>

      {/* Middle row: qualidade chip + linked buildings count */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[9px] px-2 py-0.5 rounded-full text-white font-medium"
          style={{ backgroundColor: QUALIDADE_COLORS[informante.qualidade_relacao] }}
        >
          {QUALIDADE_LABELS[informante.qualidade_relacao]}
        </span>
        {linkedBuildingsCount > 1 && (
          <span className="text-[10px] text-gray-400">
            {linkedBuildingsCount} edificios
          </span>
        )}
      </div>

      {/* Bottom row: last gentileza */}
      {lastGentilezaAgo && (
        <p className="text-[10px] text-gray-400">
          Ultima gentileza: {lastGentilezaAgo}
        </p>
      )}
    </button>
  )
}
