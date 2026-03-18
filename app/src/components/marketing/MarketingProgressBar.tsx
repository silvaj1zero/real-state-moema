'use client'

import { SECTION_LABELS } from '@/hooks/useMarketingPlan'

interface MarketingProgressBarProps {
  completed: number
  total: number
  percent: number
  bySection: Record<string, { completed: number; total: number }>
}

function progressColor(percent: number): string {
  if (percent >= 80) return '#22C55E'
  if (percent >= 50) return '#F59E0B'
  return '#DC3545'
}

export function MarketingProgressBar({
  completed,
  total,
  percent,
  bySection,
}: MarketingProgressBarProps) {
  const color = progressColor(percent)

  return (
    <div className="px-4 py-3">
      {/* Main progress */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-800">
          {completed} de {total} ações concluídas
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>

      {/* Section counts */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {Object.entries(bySection).map(([key, { completed: c, total: t }]) => (
          <div
            key={key}
            className="flex flex-col items-center rounded-lg bg-gray-50 py-1.5 px-1"
          >
            <span className="text-xs font-bold text-gray-700">
              {c}/{t}
            </span>
            <span className="text-[9px] text-gray-400">
              {SECTION_LABELS[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
