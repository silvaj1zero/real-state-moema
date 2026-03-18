'use client'

import { useState } from 'react'
import { Lock, CheckCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import {
  RADIUS_STEPS,
  RADIUS_LABELS,
  RADIUS_COLORS,
  EXPANSION_THRESHOLD,
  useRadiusProgress,
  type RadiusStep,
  type RadiusProgressEntry,
} from '@/hooks/useRadiusExpansion'
import { useMapStore } from '@/store/map'

interface RadiusDashboardProps {
  consultantId: string | null
}

export function RadiusDashboard({ consultantId }: RadiusDashboardProps) {
  const epicenter = useMapStore((s) => s.epicenter)
  const activeRadius = useMapStore((s) => s.activeRadius)

  const { progress, isLoading } = useRadiusProgress(epicenter, consultantId, activeRadius)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <MapPin size={14} className="text-[#003DA5]" />
          Territorio
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[80px] rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <MapPin size={14} className="text-[#003DA5]" />
        Territorio
      </h3>

      {/* KPI Cards — 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        {RADIUS_STEPS.map((raio) => {
          const entry = progress.find((p) => p.raio === raio)
          if (!entry) return null
          return (
            <RadiusKPICard
              key={raio}
              entry={entry}
              isActive={raio === getNearestStep(activeRadius)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Card per radius (165x80px target)
// ---------------------------------------------------------------------------

interface RadiusKPICardProps {
  entry: RadiusProgressEntry
  isActive: boolean
}

function RadiusKPICard({ entry, isActive }: RadiusKPICardProps) {
  const [expanded, setExpanded] = useState(false)
  const { raio, percentual, total, visitados, locked } = entry
  const color = RADIUS_COLORS[raio]
  const label = RADIUS_LABELS[raio]
  const isComplete = percentual >= EXPANSION_THRESHOLD

  // Bar color based on thresholds (AC5)
  const barColor =
    locked
      ? '#D1D5DB'
      : percentual >= EXPANSION_THRESHOLD
        ? '#22C55E'
        : percentual >= 50
          ? '#EAB308'
          : '#EF4444'

  // Status label
  const statusLabel = locked
    ? 'Bloqueado'
    : isComplete
      ? 'Completo'
      : isActive
        ? 'Ativo'
        : 'Desbloqueado'

  const statusColor = locked
    ? 'text-gray-400'
    : isComplete
      ? 'text-green-600'
      : isActive
        ? 'text-blue-600'
        : 'text-gray-500'

  return (
    <div className="flex flex-col">
      <button
        onClick={() => !locked && setExpanded(!expanded)}
        disabled={locked}
        className={`rounded-xl p-2.5 text-left transition-all min-h-[80px] flex flex-col justify-between ${
          isActive
            ? 'bg-white ring-2 shadow-sm'
            : locked
              ? 'bg-gray-50 opacity-50'
              : 'bg-white ring-1 ring-gray-200'
        }`}
        style={isActive ? { '--tw-ring-color': color } as React.CSSProperties : undefined}
      >
        {/* Radius label + icon */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold" style={{ color: locked ? '#9CA3AF' : color }}>
            {label}
          </span>
          {locked && <Lock size={10} className="text-gray-400" />}
          {isComplete && !locked && <CheckCircle size={10} style={{ color: '#22C55E' }} />}
          {!locked && !isComplete && (
            expanded ? <ChevronUp size={10} className="text-gray-400" /> : <ChevronDown size={10} className="text-gray-400" />
          )}
        </div>

        {/* Main number */}
        <div className="mt-1">
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: locked ? '#D1D5DB' : color }}
          >
            {percentual}
            <span className="text-sm">%</span>
          </span>
        </div>

        {/* Status label */}
        <span className={`text-[10px] font-medium ${statusColor} mt-0.5`}>{statusLabel}</span>

        {/* Mini progress bar */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(percentual, 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>

        {/* Count */}
        <span className="text-[10px] text-gray-400 mt-0.5">
          {visitados}/{total}
        </span>
      </button>

      {/* Expanded: street-level breakdown */}
      {expanded && !locked && (
        <StreetBreakdown raio={raio} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Street breakdown when card is tapped/expanded
// ---------------------------------------------------------------------------

function StreetBreakdown({ raio }: { raio: RadiusStep }) {
  const epicenter = useMapStore((s) => s.epicenter)
  const color = RADIUS_COLORS[raio]

  // Simple placeholder — the data is available via useNextBlockSuggestion
  // For the dashboard, we show a condensed version
  if (!epicenter) return null

  return (
    <div className="mt-1 bg-gray-50 rounded-lg p-2 text-[11px] text-gray-500">
      <p className="font-medium text-gray-700 mb-1" style={{ color }}>
        Raio {RADIUS_LABELS[raio]} — detalhes
      </p>
      <p>
        Toque no mapa para ver os edifícios deste raio. A sugestão de próximo bloco
        aparece no painel lateral.
      </p>
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
