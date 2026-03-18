'use client'

import { Lock, CheckCircle } from 'lucide-react'
import {
  RADIUS_STEPS,
  RADIUS_LABELS,
  RADIUS_COLORS,
  EXPANSION_THRESHOLD,
  type RadiusProgressEntry,
  type RadiusStep,
} from '@/hooks/useRadiusExpansion'

interface RadiusProgressBarProps {
  progress: RadiusProgressEntry[]
  activeRadius: number
  compact?: boolean
}

export function RadiusProgressBar({ progress, activeRadius, compact = false }: RadiusProgressBarProps) {
  return (
    <div className={compact ? 'flex gap-2' : 'flex flex-col gap-3'}>
      {RADIUS_STEPS.map((raio) => {
        const entry = progress.find((p) => p.raio === raio)
        if (!entry) return null

        return (
          <RadiusBar
            key={raio}
            raio={raio}
            percentual={entry.percentual}
            total={entry.total}
            visitados={entry.visitados}
            locked={entry.locked}
            isActive={raio === getNearestStep(activeRadius)}
            isComplete={entry.percentual >= EXPANSION_THRESHOLD}
            compact={compact}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single radius bar
// ---------------------------------------------------------------------------

interface RadiusBarProps {
  raio: RadiusStep
  percentual: number
  total: number
  visitados: number
  locked: boolean
  isActive: boolean
  isComplete: boolean
  compact: boolean
}

function RadiusBar({
  raio,
  percentual,
  total,
  visitados,
  locked,
  isActive,
  isComplete,
  compact,
}: RadiusBarProps) {
  const color = RADIUS_COLORS[raio]
  const label = RADIUS_LABELS[raio]
  const approaching = percentual >= 70 && percentual < EXPANSION_THRESHOLD

  if (compact) {
    return (
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          {locked && <Lock size={10} className="text-gray-400" />}
          {isComplete && <CheckCircle size={10} style={{ color }} />}
          <span className="text-[10px] font-medium text-gray-600">{label}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${approaching ? 'animate-pulse' : ''}`}
            style={{
              width: `${Math.min(percentual, 100)}%`,
              backgroundColor: locked ? '#9CA3AF' : color,
            }}
          />
        </div>
        <span className="text-[10px] text-gray-500">{percentual}%</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg p-3 transition-all ${
        isActive
          ? 'bg-white ring-2 shadow-sm'
          : locked
            ? 'bg-gray-50 opacity-60'
            : 'bg-white ring-1 ring-gray-200'
      }`}
      style={isActive ? { ringColor: color } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {locked ? (
            <Lock size={14} className="text-gray-400" />
          ) : isComplete ? (
            <CheckCircle size={14} style={{ color }} />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: color }} />
          )}
          <span className="text-sm font-semibold" style={{ color: locked ? '#6B7280' : color }}>
            {label}
          </span>
          {isActive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              Ativo
            </span>
          )}
          {isComplete && !locked && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${color}20`, color }}
            >
              Completo
            </span>
          )}
          {locked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              Bloqueado
            </span>
          )}
        </div>
        <span className="text-sm font-bold" style={{ color: locked ? '#9CA3AF' : color }}>
          {percentual}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            approaching ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${Math.min(percentual, 100)}%`,
            backgroundColor: locked ? '#D1D5DB' : color,
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-gray-500">
          {visitados} / {total} edifícios
        </span>
        {approaching && !locked && (
          <span className="text-[10px] font-medium text-amber-600 animate-pulse">
            Quase lá!
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getNearestStep(radius: number): RadiusStep {
  for (const step of RADIUS_STEPS) {
    if (radius <= step) return step
  }
  return 2000
}
