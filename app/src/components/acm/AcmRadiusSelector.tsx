'use client'

import { useAcmStore, type AcmRadiusOption } from '@/store/acm'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const PRESET_OPTIONS: { value: AcmRadiusOption; label: string }[] = [
  { value: 500, label: 'Raio 500m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
  { value: 'moema', label: 'Moema' },
  { value: 'vila_olimpia', label: 'Vila Olímpia' },
  { value: 'itaim_bibi', label: 'Itaim Bibi' },
  { value: 'custom', label: 'Customizado' },
]

export function AcmRadiusSelector() {
  const radiusOption = useAcmStore((s) => s.radiusOption)
  const customRadius = useAcmStore((s) => s.customRadius)
  const setRadiusOption = useAcmStore((s) => s.setRadiusOption)
  const setCustomRadius = useAcmStore((s) => s.setCustomRadius)
  const [showCustomInput, setShowCustomInput] = useState(radiusOption === 'custom')

  function handleSelect(option: AcmRadiusOption) {
    setRadiusOption(option)
    setShowCustomInput(option === 'custom')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESET_OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => handleSelect(opt.value)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
            radiusOption === opt.value
              ? 'bg-[#003DA5] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {opt.label}
        </button>
      ))}

      {showCustomInput && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={customRadius}
            onChange={(e) => setCustomRadius(Math.max(100, Number(e.target.value) || 500))}
            className="w-20 h-7 px-2 text-xs border border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none"
            placeholder="metros"
            min={100}
            max={10000}
          />
          <span className="text-[10px] text-gray-500">m</span>
        </div>
      )}
    </div>
  )
}
