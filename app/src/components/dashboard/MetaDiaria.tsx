'use client'

import { cn } from '@/lib/utils'
import type { MetaDiariaKPIs } from '@/hooks/useDashboard'
import { EmptyState } from './EmptyState'

// ---------------------------------------------------------------------------
// Circular progress ring (SVG)
// ---------------------------------------------------------------------------

interface CircularProgressProps {
  percentual: number
  size?: number
  strokeWidth?: number
}

function CircularProgress({ percentual, size = 96, strokeWidth = 8 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percentual, 100) / 100) * circumference

  // Color by percentage: <40% red, 40-80% yellow, >80% green
  const color = percentual < 40 ? '#EF4444' : percentual < 80 ? '#EAB308' : '#22C55E'

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Motivational message
// ---------------------------------------------------------------------------

function getMotivationalMessage(percentual: number, v1s: number, meta: number): string {
  if (v1s === 0) return 'Hora de prospectar!'
  if (percentual >= 100) return 'Meta batida! Excelente!'
  if (percentual >= 80) return 'Quase la! Falta pouco!'
  if (percentual >= 60) return 'Bom ritmo, continue!'
  if (percentual >= 40) return 'Voce consegue!'
  return `Faltam ${meta - v1s} V1s para a meta`
}

// ---------------------------------------------------------------------------
// MetaDiaria component — daily goal "5 V1s/dia"
// ---------------------------------------------------------------------------

interface MetaDiariaProps {
  kpis: MetaDiariaKPIs
  className?: string
}

export function MetaDiaria({ kpis, className }: MetaDiariaProps) {
  const { v1sAgendadasHoje, meta, percentual } = kpis

  // Color for text
  const textColor = percentual < 40 ? 'text-red-500' : percentual < 80 ? 'text-yellow-600' : 'text-green-600'

  if (meta === 0) {
    return <EmptyState section="meta" className={className} />
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm p-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Meta Diaria
        </h3>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          V1s hoje
        </span>
      </div>

      {/* Circular progress + number */}
      <div className="flex items-center justify-center gap-4">
        <div className="relative">
          <CircularProgress percentual={percentual} size={88} strokeWidth={7} />
          {/* Center number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-xl font-bold', textColor)}>
              {v1sAgendadasHoje}
            </span>
            <span className="text-[9px] text-gray-400">
              / {meta}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', textColor)}>
            {percentual}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {getMotivationalMessage(percentual, v1sAgendadasHoje, meta)}
          </p>
        </div>
      </div>
    </div>
  )
}
