'use client'

import { useEffect } from 'react'
import { MapPin, Building2, Check } from 'lucide-react'
import { useSearchStore } from '@/store/search'
import { useMapStore } from '@/store/map'
import { useBuildings } from '@/hooks/useBuildings'
import { cn } from '@/lib/utils'

const RADIUS_OPTIONS = [
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 2000, label: '2km' },
  { value: 5000, label: '5km' },
]

export function SearchAreaSelector() {
  const searchMode = useSearchStore((s) => s.searchMode)
  const setSearchMode = useSearchStore((s) => s.setSearchMode)
  const center = useSearchStore((s) => s.center)
  const setCenter = useSearchStore((s) => s.setCenter)
  const radius = useSearchStore((s) => s.radius)
  const setRadius = useSearchStore((s) => s.setRadius)
  const selectedEdificioIds = useSearchStore((s) => s.selectedEdificioIds)
  const toggleEdificio = useSearchStore((s) => s.toggleEdificio)

  const epicenter = useMapStore((s) => s.epicenter)
  const { buildings, isLoading: buildingsLoading } = useBuildings()

  // Initialize center from map epicenter
  useEffect(() => {
    if (!center && epicenter) {
      setCenter(epicenter)
    }
  }, [center, epicenter, setCenter])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Area de busca
      </h2>

      {/* Mode chips */}
      <div className="flex gap-2 mb-4">
        <ModeChip
          active={searchMode === 'radius'}
          icon={<MapPin className="size-4" />}
          label="Raio no Mapa"
          onClick={() => setSearchMode('radius')}
        />
        <ModeChip
          active={searchMode === 'buildings'}
          icon={<Building2 className="size-4" />}
          label="Condominios"
          onClick={() => setSearchMode('buildings')}
        />
      </div>

      {/* Radius mode */}
      {searchMode === 'radius' && (
        <div className="space-y-3">
          {/* Radius selector */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Raio</label>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRadius(opt.value)}
                  className={cn(
                    'flex-1 h-10 rounded-lg text-sm font-medium border transition-colors',
                    radius === opt.value
                      ? 'bg-[#003DA5] text-white border-[#003DA5]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#003DA5]/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Center coordinates */}
          {center && (
            <div className="text-xs text-gray-400">
              Centro: {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
            </div>
          )}
          {!center && (
            <div className="text-xs text-amber-600">
              Centro nao definido. Usando epicentro do mapa.
            </div>
          )}
        </div>
      )}

      {/* Buildings mode */}
      {searchMode === 'buildings' && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500 block">
            Selecione condominios ({selectedEdificioIds.size} selecionados)
          </label>

          {buildingsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : buildings.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              Nenhum edificio encontrado no raio atual.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {buildings.map((b) => {
                const isSelected = selectedEdificioIds.has(b.id)
                const qual = b.edificios_qualificacoes?.[0]
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleEdificio(b.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'bg-[#003DA5]/5 border-[#003DA5]/30'
                        : 'bg-white border-gray-100 hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                        isSelected
                          ? 'bg-[#003DA5] border-[#003DA5]'
                          : 'border-gray-300'
                      )}
                    >
                      {isSelected && <Check className="size-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {b.nome}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {b.endereco}
                      </p>
                    </div>
                    {qual?.is_fisbo_detected && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        FISBO
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ModeChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium border transition-colors',
        active
          ? 'bg-[#003DA5] text-white border-[#003DA5]'
          : 'bg-white text-gray-700 border-gray-200 hover:border-[#003DA5]/50'
      )}
    >
      {icon}
      {label}
    </button>
  )
}
