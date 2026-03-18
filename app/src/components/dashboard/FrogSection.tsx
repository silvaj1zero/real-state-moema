'use client'

import { cn } from '@/lib/utils'
import type { FrogKPIs } from '@/hooks/useDashboard'
import { FROG_CONFIG } from '@/hooks/useFrog'
import type { FonteFrog } from '@/lib/supabase/types'
import { EmptyState } from './EmptyState'

// ---------------------------------------------------------------------------
// FrogSection — FROG KPIs with 4 mini cards
// ---------------------------------------------------------------------------

interface FrogSectionProps {
  kpis: FrogKPIs
  className?: string
}

export function FrogSection({ kpis, className }: FrogSectionProps) {
  const isEmpty = kpis.totalLeads === 0

  if (isEmpty) {
    return <EmptyState section="frog" className={className} />
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span
            className="w-1.5 h-4 rounded-full"
            style={{ backgroundColor: '#DC1431' }}
          />
          FROG
        </h3>
        <span className="text-xs font-bold text-gray-600">
          {kpis.totalLeads} leads
        </span>
      </div>

      {/* 4 mini FROG cards */}
      <div className="grid grid-cols-4 gap-2">
        {kpis.categories.map((cat) => {
          const config = FROG_CONFIG[cat.categoria as FonteFrog]
          if (!config) return null

          return (
            <div
              key={cat.categoria}
              className="flex flex-col items-center p-2 bg-white rounded-xl border-2 transition-all"
              style={{ borderColor: config.color }}
            >
              {/* Letter badge */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-1"
                style={{ backgroundColor: config.color }}
              >
                {config.label}
              </div>

              {/* Lead count */}
              <span className="text-base font-bold text-gray-900">
                {cat.leadCount}
              </span>

              {/* Conversion rate */}
              <span className="text-[8px] text-gray-400">
                {cat.conversionRate}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
