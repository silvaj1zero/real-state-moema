'use client'

import { useState } from 'react'
import type { DiagnosticoItem } from '@/hooks/useDiagnostico'
import { ScriptLibrary } from '@/components/scripts/ScriptLibrary'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Severity colors
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<
  'green' | 'yellow' | 'red',
  { bg: string; border: string; icon: string; badge: string }
> = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-500',
    badge: 'bg-green-100 text-green-700',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
  },
}

// ---------------------------------------------------------------------------
// DiagnosticoCard — Individual diagnostic card
// ---------------------------------------------------------------------------

interface DiagnosticoCardProps {
  item: DiagnosticoItem
  className?: string
}

export function DiagnosticoCard({ item, className }: DiagnosticoCardProps) {
  const [showScripts, setShowScripts] = useState(false)
  const styles = SEVERITY_STYLES[item.severity]

  return (
    <>
      <div
        className={cn(
          'rounded-xl border p-4 space-y-3',
          styles.bg,
          styles.border,
          className
        )}
      >
        {/* Header: transition + rate badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Severity icon */}
            {item.severity === 'red' ? (
              <svg
                className={cn('w-4 h-4 shrink-0', styles.icon)}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            ) : (
              <svg
                className={cn('w-4 h-4 shrink-0', styles.icon)}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span className="text-xs font-semibold text-gray-900">
              {item.transition}
            </span>
          </div>

          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', styles.badge)}>
            {item.rate}%
          </span>
        </div>

        {/* Symptom */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-0.5">
            Sintoma
          </p>
          <p className="text-xs text-gray-700">{item.symptom}</p>
        </div>

        {/* Diagnosis */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-0.5">
            Diagn\u00f3stico
          </p>
          <p className="text-xs text-gray-700 font-medium">{item.diagnosis}</p>
        </div>

        {/* Action */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-0.5">
            A\u00e7\u00e3o sugerida
          </p>
          <p className="text-xs text-gray-700">{item.action}</p>
        </div>

        {/* Script link */}
        <button
          onClick={() => setShowScripts(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#003DA5] hover:text-[#002D7A] transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Ver scripts
        </button>
      </div>

      {/* Script library filtered by category */}
      <ScriptLibrary
        isOpen={showScripts}
        onClose={() => setShowScripts(false)}
      />
    </>
  )
}
