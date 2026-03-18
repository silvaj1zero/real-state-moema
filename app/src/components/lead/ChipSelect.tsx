'use client'

import { cn } from '@/lib/utils'

export interface ChipOption {
  value: string
  label: string
  color?: string // Optional custom color for the active state
}

interface ChipSelectProps {
  options: ChipOption[]
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  multi?: boolean
  size?: number // Chip height in px, default 40
  className?: string
}

export function ChipSelect({
  options,
  value,
  onChange,
  multi = false,
  size = 40,
  className,
}: ChipSelectProps) {
  const selectedValues = Array.isArray(value)
    ? value
    : value
      ? [value]
      : []

  const handleSelect = (optionValue: string) => {
    if (multi) {
      const currentValues = [...selectedValues]
      const index = currentValues.indexOf(optionValue)

      if (index >= 0) {
        currentValues.splice(index, 1)
        onChange(currentValues.length > 0 ? currentValues : null)
      } else {
        currentValues.push(optionValue)
        onChange(currentValues)
      }
    } else {
      // Single select — toggle off if already selected
      if (selectedValues.includes(optionValue)) {
        onChange(null)
      } else {
        onChange(optionValue)
      }
    }
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const isActive = selectedValues.includes(option.value)

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            style={{ height: `${size}px` }}
            className={cn(
              'px-4 rounded-full text-sm font-medium border transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              isActive
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
            )}
            // Apply active color via inline style for custom colors, or default blue
            {...(isActive && {
              style: {
                height: `${size}px`,
                backgroundColor: option.color || '#003DA5',
                borderColor: 'transparent',
              },
            })}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
