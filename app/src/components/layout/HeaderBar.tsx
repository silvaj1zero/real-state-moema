'use client'

import { useMapStore } from '@/store/map'
import { Filter, Layers, WifiOff } from 'lucide-react'

interface HeaderBarProps {
  isOffline?: boolean
  onFilterClick?: () => void
  onLayersClick?: () => void
}

export function HeaderBar({ isOffline, onFilterClick, onLayersClick }: HeaderBarProps) {
  const coveragePercent = useMapStore((s) => s.coveragePercent)

  return (
    <header className="absolute top-0 left-0 right-0 z-10 h-11 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center px-3 safe-area-top">
      {/* Left: offline indicator */}
      <div className="w-16 flex items-center">
        {isOffline && (
          <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            <WifiOff size={12} />
            Offline
          </span>
        )}
      </div>

      {/* Center: bairro + cobertura */}
      <div className="flex-1 text-center">
        <span className="text-sm font-semibold text-gray-800">Moema</span>
        <span className="text-xs text-gray-500 ml-2">{coveragePercent}% mapeado</span>
      </div>

      {/* Right: filtro + layers */}
      <div className="w-16 flex items-center justify-end gap-2">
        <button
          onClick={onFilterClick}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="Filtros"
        >
          <Filter size={18} strokeWidth={1.8} />
        </button>
        <button
          onClick={onLayersClick}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="Camadas"
        >
          <Layers size={18} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}
