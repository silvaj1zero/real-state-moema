'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import {
  useFunnelDiagnostico,
  useDiagnosticoMatrix,
  type DiagnosticoPeriod,
  type StageTransitionRate,
} from '@/hooks/useDiagnostico'
import { DiagnosticoCard } from './DiagnosticoCard'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Period selector options
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: { value: DiagnosticoPeriod | 'all'; label: string }[] = [
  { value: 'all', label: 'Todo per\u00edodo' },
  { value: 'ultima_semana', label: '\u00daltima semana' },
  { value: 'ultimo_mes', label: '\u00daltimo m\u00eas' },
  { value: 'ultimos_3_meses', label: '\u00daltimos 3 meses' },
]

// ---------------------------------------------------------------------------
// Funnel stage labels for display
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<string, string> = {
  contato: 'Contato',
  v1_agendada: 'V1 Agendada',
  v1_realizada: 'V1 Realizada',
  v2_agendada: 'V2 Agendada',
  v2_realizada: 'V2 Realizada',
  representacao: 'Exclusividade',
  venda: 'Venda',
}

// ---------------------------------------------------------------------------
// Rate color helper
// ---------------------------------------------------------------------------

function getRateColor(rate: number): string {
  if (rate >= 50) return 'text-green-600'
  if (rate >= 30) return 'text-yellow-600'
  return 'text-red-600'
}

function getRateBgColor(rate: number): string {
  if (rate >= 50) return 'bg-green-500'
  if (rate >= 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ---------------------------------------------------------------------------
// FunnelDiagnostico — Visual diagnostic page
// ---------------------------------------------------------------------------

interface FunnelDiagnosticoProps {
  className?: string
}

export function FunnelDiagnostico({ className }: FunnelDiagnosticoProps) {
  const user = useAuthStore((s) => s.user)
  const [period, setPeriod] = useState<DiagnosticoPeriod | 'all'>('ultimo_mes')
  const [selectedTransition, setSelectedTransition] = useState<StageTransitionRate | null>(null)

  const activePeriod = period === 'all' ? undefined : period

  const { diagnostico, isLoading } = useFunnelDiagnostico(
    user?.id ?? null,
    activePeriod
  )

  const diagnosticItems = useDiagnosticoMatrix(diagnostico.transitionRates)

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="w-6 h-6 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Build funnel stages for the shape graphic
  const stages = [
    'contato',
    'v1_agendada',
    'v1_realizada',
    'v2_agendada',
    'v2_realizada',
    'representacao',
    'venda',
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Diagn\u00f3stico do Funil
        </h2>
      </div>

      {/* Period chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={cn(
              'shrink-0 h-7 px-3 rounded-full text-xs font-medium border transition-colors',
              period === opt.value
                ? 'bg-[#003DA5] text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-300'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Funnel shape graphic */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-0">
        {stages.map((stage, index) => {
          // Find the transition rate FROM this stage
          const transitionRate = diagnostico.transitionRates.find(
            (r) => r.from === stage
          )

          // Calculate width (funnel narrows)
          const widthPercent = 100 - index * 10

          return (
            <div key={stage}>
              {/* Stage bar */}
              <div className="flex items-center gap-3 py-1.5">
                <div
                  className="h-8 rounded flex items-center justify-center bg-[#003DA5]/10 border border-[#003DA5]/20 transition-all"
                  style={{ width: `${widthPercent}%` }}
                >
                  <span className="text-[11px] font-medium text-[#003DA5] truncate px-2">
                    {STAGE_LABELS[stage] ?? stage}
                  </span>
                </div>
              </div>

              {/* Conversion arrow between stages */}
              {transitionRate && index < stages.length - 1 && (
                <button
                  onClick={() => setSelectedTransition(transitionRate)}
                  className="flex items-center gap-2 py-1 pl-4 w-full hover:bg-gray-50 rounded transition-colors"
                >
                  {/* Arrow */}
                  <svg
                    className="w-3 h-3 text-gray-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>

                  {/* Rate badge */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getRateBgColor(transitionRate.rate)
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        getRateColor(transitionRate.rate)
                      )}
                    >
                      {transitionRate.rate}%
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({transitionRate.count}/{transitionRate.total})
                    </span>
                  </div>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Retrocesso section */}
      {diagnostico.retrocesso.total > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              <span className="text-sm font-semibold text-red-700">
                Retrocessos
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-red-700">
                {diagnostico.retrocesso.count}
              </span>
              <span className="text-xs text-red-500 ml-1">
                ({diagnostico.retrocesso.rate}% das transi\u00e7\u00f5es)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Avg days per stage */}
      {diagnostico.stageDurations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Tempo m\u00e9dio por etapa
          </h3>
          <div className="space-y-2">
            {diagnostico.stageDurations.map((sd) => (
              <div
                key={sd.etapa}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-600">
                  {STAGE_LABELS[sd.etapa] ?? sd.etapa}
                </span>
                <span className="font-medium text-gray-900">
                  {sd.avgDays} {sd.avgDays === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic cards for problematic transitions */}
      {diagnosticItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Diagn\u00f3sticos
          </h3>
          {diagnosticItems.map((item, i) => (
            <DiagnosticoCard key={i} item={item} />
          ))}
        </div>
      )}

      {/* Selected transition detail (clickable from funnel) */}
      {selectedTransition && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="px-4 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">
                  {selectedTransition.label}
                </h3>
                <button
                  onClick={() => setSelectedTransition(null)}
                  className="text-sm text-gray-500"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      getRateBgColor(selectedTransition.rate)
                    )}
                  />
                  <span className="text-2xl font-bold text-gray-900">
                    {selectedTransition.rate}%
                  </span>
                  <span className="text-sm text-gray-500">
                    de convers\u00e3o ({selectedTransition.count} de{' '}
                    {selectedTransition.total})
                  </span>
                </div>

                {/* Show matching diagnostic if exists */}
                {diagnosticItems
                  .filter((d) => d.transition === selectedTransition.label)
                  .map((item, i) => (
                    <DiagnosticoCard key={i} item={item} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {diagnostico.totalTransitions === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Nenhuma transi\u00e7\u00e3o registrada no per\u00edodo
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Movimente leads no funil para gerar diagn\u00f3sticos
          </p>
        </div>
      )}
    </div>
  )
}
