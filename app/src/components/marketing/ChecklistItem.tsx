'use client'

import { useState } from 'react'
import { Check, Link as LinkIcon, Calendar } from 'lucide-react'
import type { MarketingPlan } from '@/lib/supabase/types'
import type { MarketingItem } from '@/hooks/useMarketingPlan'

interface ChecklistItemProps {
  item: MarketingItem
  plan: MarketingPlan
  onToggle: (updates: Partial<MarketingPlan>) => void
}

export function ChecklistItem({ item, plan, onToggle }: ChecklistItemProps) {
  const isChecked = plan[item.boolField] as boolean
  const dateValue = item.dateField ? (plan[item.dateField] as string | null) : null
  const urlValue = item.urlField ? (plan[item.urlField] as string | null) : null
  const [urlInput, setUrlInput] = useState(urlValue ?? '')
  const [showUrl, setShowUrl] = useState(false)

  const handleToggle = () => {
    const updates: Partial<MarketingPlan> = {
      [item.boolField]: !isChecked,
    } as Partial<MarketingPlan>

    // Set date when checking
    if (!isChecked && item.dateField) {
      ;(updates as Record<string, unknown>)[item.dateField] = new Date().toISOString().split('T')[0]
    }

    onToggle(updates)
  }

  const handleUrlSave = () => {
    if (item.urlField && urlInput.trim()) {
      onToggle({
        [item.urlField]: urlInput.trim(),
      } as Partial<MarketingPlan>)
      setShowUrl(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            isChecked
              ? 'bg-[#22C55E] border-[#22C55E]'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {isChecked && <Check size={14} className="text-white" strokeWidth={3} />}
        </button>

        {/* Label + date */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-medium ${
              isChecked ? 'text-gray-400 line-through' : 'text-gray-800'
            }`}
          >
            {item.label}
          </span>
          {dateValue && isChecked && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
              <Calendar size={10} />
              {new Date(dateValue).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>

        {/* URL button */}
        {item.urlField && (
          <button
            onClick={() => setShowUrl(!showUrl)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              urlValue ? 'bg-blue-50 text-[#003DA5]' : 'bg-gray-50 text-gray-400'
            }`}
          >
            <LinkIcon size={14} />
          </button>
        )}
      </div>

      {/* URL input */}
      {showUrl && item.urlField && (
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Cole a URL aqui"
            className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-xs focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
          />
          <button
            onClick={handleUrlSave}
            disabled={!urlInput.trim()}
            className="px-3 h-10 rounded-lg text-xs font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#003DA5' }}
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  )
}
