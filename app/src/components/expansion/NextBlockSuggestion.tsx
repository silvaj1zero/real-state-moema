'use client'

import { MapPin, Navigation, Building2 } from 'lucide-react'
import { useNextBlockSuggestion, type NextBlockSuggestionData } from '@/hooks/useRadiusExpansion'
import { useMapStore } from '@/store/map'

interface NextBlockSuggestionProps {
  onNavigate?: (endereco: string) => void
}

export function NextBlockSuggestion({ onNavigate }: NextBlockSuggestionProps) {
  const epicenter = useMapStore((s) => s.epicenter)
  const activeRadius = useMapStore((s) => s.activeRadius)

  const { data: suggestions, isLoading } = useNextBlockSuggestion(epicenter, activeRadius)

  if (isLoading || !suggestions || suggestions.length === 0) return null

  const top = suggestions[0]

  return (
    <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
        <Navigation size={12} className="text-[#003DA5]" />
        <span className="text-[11px] font-semibold text-[#003DA5] uppercase tracking-wide">
          Próximo bloco sugerido
        </span>
      </div>

      {/* Top suggestion — highlighted */}
      <SuggestionCard suggestion={top} isPrimary onNavigate={onNavigate} />

      {/* Other suggestions */}
      {suggestions.length > 1 && (
        <div className="border-t border-gray-100">
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Também perto</span>
          </div>
          {suggestions.slice(1).map((s, idx) => (
            <SuggestionCard key={idx} suggestion={s} isPrimary={false} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual suggestion card
// ---------------------------------------------------------------------------

interface SuggestionCardProps {
  suggestion: NextBlockSuggestionData
  isPrimary: boolean
  onNavigate?: (endereco: string) => void
}

function SuggestionCard({ suggestion, isPrimary, onNavigate }: SuggestionCardProps) {
  return (
    <div className={`px-3 py-2.5 flex items-center gap-3 ${isPrimary ? '' : 'border-t border-gray-50'}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isPrimary ? 'bg-[#003DA5]/10' : 'bg-gray-100'
        }`}
      >
        <MapPin size={14} className={isPrimary ? 'text-[#003DA5]' : 'text-gray-400'} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            isPrimary ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
          }`}
        >
          {suggestion.endereco}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Building2 size={10} />
            {suggestion.total} edifícios
          </span>
          {suggestion.fisbos > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
              {suggestion.fisbos} FISBO{suggestion.fisbos > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {onNavigate && (
        <button
          onClick={() => onNavigate(suggestion.endereco)}
          className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label={`Ver ${suggestion.endereco} no mapa`}
        >
          <Navigation size={12} className="text-gray-600" />
        </button>
      )}
    </div>
  )
}
