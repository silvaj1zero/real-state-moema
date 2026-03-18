'use client'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Trend indicator
// ---------------------------------------------------------------------------

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') {
    return (
      <svg
        className="w-3.5 h-3.5 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    )
  }
  if (trend === 'down') {
    return (
      <svg
        className="w-3.5 h-3.5 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    )
  }
  return (
    <svg
      className="w-3.5 h-3.5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// KPICard — reusable KPI display card
// ---------------------------------------------------------------------------

export interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string // hex color for accent
  icon?: React.ReactNode
  className?: string
  compact?: boolean
  onClick?: () => void
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  color = '#003DA5',
  icon,
  className,
  compact = false,
  onClick,
}: KPICardProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm text-left transition-all',
        compact ? 'p-2.5 min-w-[80px]' : 'p-3 min-w-[165px] min-h-[80px]',
        onClick && 'hover:shadow-md active:scale-[0.98] cursor-pointer',
        className,
      )}
    >
      {/* Header row: icon + trend */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {icon && (
            <div
              className={cn(
                'flex items-center justify-center rounded-lg',
                compact ? 'w-5 h-5' : 'w-6 h-6',
              )}
              style={{ color }}
            >
              {icon}
            </div>
          )}
          <span
            className={cn(
              'font-medium text-gray-500 uppercase tracking-wide',
              compact ? 'text-[8px]' : 'text-[10px]',
            )}
          >
            {title}
          </span>
        </div>
        {trend && <TrendIndicator trend={trend} />}
      </div>

      {/* Value */}
      <p
        className={cn(
          'font-bold text-gray-900',
          compact ? 'text-lg' : 'text-2xl',
        )}
        style={typeof value === 'string' && value.includes('%') ? { color } : undefined}
      >
        {value}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={cn(
            'text-gray-400 mt-0.5',
            compact ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          {subtitle}
        </p>
      )}
    </Component>
  )
}
