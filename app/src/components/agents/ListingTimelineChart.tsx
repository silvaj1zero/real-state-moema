'use client'

import { TrendingDown } from 'lucide-react'
import { formatBRL } from '@/lib/format'

/**
 * ListingTimelineChart — Story 3.6, AC4
 * Sparkline-style price history for consolidated listings in a merged group.
 */

export interface PriceEvent {
  date: string
  portal: string
  preco: number
  isReduction: boolean
  reductionPct?: number
}

interface ListingTimelineChartProps {
  events: PriceEvent[]
}

export function ListingTimelineChart({ events }: ListingTimelineChartProps) {
  if (events.length === 0) return null

  const min = Math.min(...events.map((e) => e.preco))
  const max = Math.max(...events.map((e) => e.preco))
  const range = max - min || 1

  // SVG sparkline
  const width = 200
  const height = 40
  const padding = 4
  const points = events.map((e, i) => {
    const x = padding + (i / Math.max(events.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - ((e.preco - min) / range) * (height - padding * 2)
    return { x, y, ...e }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="space-y-1.5">
      {/* SVG Sparkline */}
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="1.5" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.isReduction ? 3 : 2}
            fill={p.isReduction ? '#ef4444' : '#6366f1'}
          />
        ))}
      </svg>

      {/* Timeline text */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {events.map((e, i) => (
          <span key={i} className="text-[9px] text-gray-500 flex items-center gap-0.5">
            <span className="text-gray-400">{e.date.slice(0, 10)}</span>
            <span className="font-medium text-gray-700">{formatBRL(e.preco)}</span>
            <span className="text-gray-400 capitalize">({e.portal})</span>
            {e.isReduction && e.reductionPct && (
              <span className="text-red-500 flex items-center">
                <TrendingDown className="size-2.5" />
                {e.reductionPct}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
