'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import {
  useFrogStats,
  FROG_CONFIG,
  FROG_CATEGORIES,
  FROG_SUGGESTIONS,
} from '@/hooks/useFrog'
import type { FonteFrog } from '@/lib/supabase/types'
import { FrogContactList } from './FrogContactList'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Trend arrow component
// ---------------------------------------------------------------------------

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    )
  }
  if (trend === 'down') {
    return (
      <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// FrogDashboard — FROG analytics overview
// ---------------------------------------------------------------------------

interface FrogDashboardProps {
  className?: string
}

export function FrogDashboard({ className }: FrogDashboardProps) {
  const user = useAuthStore((s) => s.user)
  const { stats, isLoading } = useFrogStats(user?.id ?? null)
  const [activeCategory, setActiveCategory] = useState<FonteFrog | null>(null)
  const [showContacts, setShowContacts] = useState(false)

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="w-6 h-6 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Max lead count for bar chart scaling
  const maxLeadCount = Math.max(
    ...stats.categories.map((c) => c.leadCount),
    1
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          M\u00e9todo FROG
        </h2>
        <button
          onClick={() => setShowContacts(true)}
          className="text-xs font-medium text-[#003DA5] hover:text-[#002D7A] transition-colors"
        >
          Embaixadores
        </button>
      </div>

      {/* Total leads badge */}
      <div className="text-center">
        <span className="text-3xl font-bold text-gray-900">
          {stats.totalLeads}
        </span>
        <p className="text-xs text-gray-500 mt-0.5">leads via FROG</p>
      </div>

      {/* 4 FROG category cards */}
      <div className="grid grid-cols-2 gap-3">
        {FROG_CATEGORIES.map((cat) => {
          const config = FROG_CONFIG[cat]
          const catStats = stats.categories.find((c) => c.categoria === cat)
          const leadCount = catStats?.leadCount ?? 0
          const conversionRate = catStats?.conversionRate ?? 0
          const trend = catStats?.trend ?? 'stable'

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={cn(
                'rounded-xl border-2 p-3 text-left transition-all',
                activeCategory === cat
                  ? 'ring-2 ring-offset-1'
                  : 'hover:shadow-sm'
              )}
              style={{
                borderColor: config.color,
                ...(activeCategory === cat
                  ? { ringColor: config.color }
                  : {}),
              }}
            >
              {/* Letter badge */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: config.color }}
                >
                  {config.label}
                </div>
                <TrendArrow trend={trend} />
              </div>

              {/* Category name */}
              <p className="text-xs font-medium text-gray-600 mb-1">
                {config.fullLabel}
              </p>

              {/* Count */}
              <p className="text-xl font-bold text-gray-900">
                {leadCount}
              </p>

              {/* Conversion rate */}
              <p className="text-[10px] text-gray-500">
                {conversionRate}% convers\u00e3o
              </p>
            </button>
          )
        })}
      </div>

      {/* Bar chart comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Compara\u00e7\u00e3o por categoria
        </h3>
        <div className="space-y-3">
          {FROG_CATEGORIES.map((cat) => {
            const config = FROG_CONFIG[cat]
            const catStats = stats.categories.find((c) => c.categoria === cat)
            const leadCount = catStats?.leadCount ?? 0
            const widthPercent = maxLeadCount > 0
              ? Math.max((leadCount / maxLeadCount) * 100, 2)
              : 2

            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">
                    {config.fullLabel}
                  </span>
                  <span className="text-gray-500">{leadCount} leads</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Suggestions for empty categories */}
      {stats.categories
        .filter((c) => c.leadCount === 0)
        .map((c) => (
          <div
            key={c.categoria}
            className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200"
          >
            <svg
              className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <div>
              <p className="text-xs font-semibold text-amber-800">
                {FROG_CONFIG[c.categoria].fullLabel} — 0 leads
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {FROG_SUGGESTIONS[c.categoria]}
              </p>
            </div>
          </div>
        ))}

      {/* Contacts bottom sheet */}
      {showContacts && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-4 mb-2">
              <h3 className="text-base font-bold text-gray-900">
                Embaixadores FROG
              </h3>
              <button
                onClick={() => setShowContacts(false)}
                className="text-sm text-gray-500"
              >
                Fechar
              </button>
            </div>
            <div className="px-4 pb-6">
              <FrogContactList filterCategory={activeCategory ?? undefined} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
