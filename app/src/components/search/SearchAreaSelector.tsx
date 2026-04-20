'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Building2, Check, Search } from 'lucide-react'
import { useSearchStore } from '@/store/search'
import { useMapStore } from '@/store/map'
import { useBuildings } from '@/hooks/useBuildings'
import { cn } from '@/lib/utils'

const RADIUS_PRESETS = [
  { value: 50, label: '50m' },
  { value: 100, label: '100m' },
  { value: 200, label: '200m' },
  { value: 300, label: '300m' },
  { value: 400, label: '400m' },
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

  const [showCustomRadius, setShowCustomRadius] = useState(false)
  const [customRadiusValue, setCustomRadiusValue] = useState(500)
  const [addressFilter, setAddressFilter] = useState('')

  // Initialize center from map epicenter
  useEffect(() => {
    if (!center && epicenter) {
      setCenter(epicenter)
    }
  }, [center, epicenter, setCenter])

  // Filter buildings by address
  const filteredBuildings = useMemo(() => {
    if (!addressFilter.trim()) return buildings
    const query = addressFilter.toLowerCase()
    return buildings.filter(
      (b) =>
        b.endereco?.toLowerCase().includes(query) ||
        b.nome?.toLowerCase().includes(query)
    )
  }, [buildings, addressFilter])

  const isCustom = !RADIUS_PRESETS.some((p) => p.value === radius)

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
          {/* Radius selector - 2 rows */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Raio</label>
            <div className="flex flex-wrap gap-1.5">
              {RADIUS_PRESETS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setRadius(opt.value)
                    setShowCustomRadius(false)
                  }}
                  className={cn(
                    'px-3 h-9 rounded-lg text-xs font-medium border transition-colors',
                    radius === opt.value && !isCustom
                      ? 'bg-[#003DA5] text-white border-[#003DA5]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#003DA5]/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustomRadius(!showCustomRadius)}
                className={cn(
                  'px-3 h-9 rounded-lg text-xs font-medium border transition-colors',
                  isCustom || showCustomRadius
                    ? 'bg-[#003DA5] text-white border-[#003DA5]'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-[#003DA5]/50'
                )}
              >
                {isCustom ? `${radius}m` : 'Custom'}
              </button>
            </div>
          </div>

          {/* Custom radius input */}
          {showCustomRadius && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customRadiusValue}
                onChange={(e) => {
                  const v = Math.max(10, Math.min(10000, Number(e.target.value) || 500))
                  setCustomRadiusValue(v)
                  setRadius(v)
                }}
                className="w-24 h-9 px-3 text-sm border border-gray-300 rounded-lg focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                min={10}
                max={10000}
                placeholder="metros"
              />
              <span className="text-xs text-gray-500">metros</span>
            </div>
          )}

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
          {/* Address search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={addressFilter}
              onChange={(e) => setAddressFilter(e.target.value)}
              placeholder="Buscar endereco... (ex: Rua Alvorada)"
              className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
            />
          </div>

          <label className="text-xs text-gray-500 block">
            {addressFilter
              ? `${filteredBuildings.length} encontrados`
              : `Selecione condominios (${selectedEdificioIds.size} selecionados)`}
          </label>

          {buildingsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredBuildings.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              {addressFilter
                ? `Nenhum edificio com "${addressFilter}" encontrado.`
                : 'Nenhum edificio encontrado no raio atual.'}
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredBuildings.map((b) => {
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
