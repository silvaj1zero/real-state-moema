'use client'

import { useState } from 'react'
import { FROG_CONFIG, FROG_CATEGORIES } from '@/hooks/useFrog'
import type { FonteFrog } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// FrogMapFilter — Toggle to filter map pins by FROG source
// ---------------------------------------------------------------------------

interface FrogMapFilterProps {
  /** Currently selected FROG categories for filtering */
  activeCategories: FonteFrog[]
  /** Callback when selection changes */
  onCategoriesChange: (categories: FonteFrog[]) => void
  className?: string
}

export function FrogMapFilter({
  activeCategories,
  onCategoriesChange,
  className,
}: FrogMapFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleCategory = (cat: FonteFrog) => {
    if (activeCategories.includes(cat)) {
      onCategoriesChange(activeCategories.filter((c) => c !== cat))
    } else {
      onCategoriesChange([...activeCategories, cat])
    }
  }

  const clearAll = () => {
    onCategoriesChange([])
  }

  const selectAll = () => {
    onCategoriesChange([...FROG_CATEGORIES])
  }

  const hasActiveFilter = activeCategories.length > 0

  return (
    <div className={cn('bg-white rounded-xl shadow-lg border border-gray-200', className)}>
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left"
      >
        {/* FROG icon */}
        <div className="flex items-center gap-0.5">
          {FROG_CATEGORIES.map((cat) => (
            <div
              key={cat}
              className={cn(
                'w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center text-white transition-opacity',
                activeCategories.includes(cat) ? 'opacity-100' : 'opacity-30'
              )}
              style={{ backgroundColor: FROG_CONFIG[cat].color }}
            >
              {FROG_CONFIG[cat].label}
            </div>
          ))}
        </div>

        <span className="text-xs font-medium text-gray-700 flex-1">
          FROG
          {hasActiveFilter && (
            <span className="text-[10px] text-gray-400 ml-1">
              ({activeCategories.length})
            </span>
          )}
        </span>

        {/* Chevron */}
        <svg
          className={cn(
            'w-3.5 h-3.5 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded filter options */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
          {/* Quick actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={selectAll}
              className="text-[10px] text-[#003DA5] font-medium"
            >
              Todos
            </button>
            <span className="text-[10px] text-gray-300">|</span>
            <button
              onClick={clearAll}
              className="text-[10px] text-gray-500 font-medium"
            >
              Limpar
            </button>
          </div>

          {/* Category toggles */}
          <div className="space-y-1.5">
            {FROG_CATEGORIES.map((cat) => {
              const config = FROG_CONFIG[cat]
              const isActive = activeCategories.includes(cat)

              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-colors text-left',
                    isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isActive
                        ? 'border-transparent'
                        : 'bg-white border-gray-300'
                    )}
                    style={
                      isActive ? { backgroundColor: config.color } : undefined
                    }
                  >
                    {isActive && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Color dot + label */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-xs text-gray-700">
                    {config.fullLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Description */}
          <p className="text-[10px] text-gray-400 text-center pt-1">
            Filtra edif\u00edcios com leads da fonte FROG selecionada
          </p>
        </div>
      )}
    </div>
  )
}
