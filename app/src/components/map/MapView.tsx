'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Map, { NavigationControl, Marker, type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

import { useMapStore } from '@/store/map'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useBuildings } from '@/hooks/useBuildings'
import { RadiusCircles } from './RadiusCircles'
import { GPSPin } from './GPSPin'
import { EpicenterPin } from './EpicenterPin'
import { LayersPanel } from './LayersPanel'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { QuickRegisterForm } from '@/components/building/QuickRegisterForm'
import { BuildingCard } from '@/components/building/BuildingCard'
import { FilterPanel } from './FilterPanel'
import { MapLegend } from './MapLegend'
import { useFilterStore } from '@/store/filters'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import type { EdificioWithQualificacao, StatusVarredura } from '@/lib/supabase/types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const PIN_COLORS: Record<StatusVarredura, string> = {
  nao_visitado: '#9CA3AF', // gray
  mapeado: '#3B82F6',      // blue
  em_prospeccao: '#EAB308', // yellow
  concluido: '#22C55E',     // green
}

export function MapView() {
  const mapRef = useRef<MapRef>(null)
  const epicenter = useMapStore((s) => s.epicenter)
  const setEpicenter = useMapStore((s) => s.setEpicenter)
  const activeRadius = useMapStore((s) => s.activeRadius)
  const [showLayers, setShowLayers] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<EdificioWithQualificacao | null>(null)
  const [showMoveConfirm, setShowMoveConfirm] = useState<{ lat: number; lng: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const { buildings, invalidate, error: buildingsError, refetch: refetchBuildings } = useBuildings()
  const isStatusVisible = useFilterStore((s) => s.isVisible)
  const { isOnline, pendingCount } = useOnlineStatus()

  // Count buildings by status for legend + filters
  const statusCounts = buildings.reduce(
    (acc, b) => {
      const status: StatusVarredura = b.edificios_qualificacoes?.[0]?.status_varredura || 'nao_visitado'
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<StatusVarredura, number>
  )

  // Ativa GPS tracking
  useGeolocation()

  // Long press para mover epicentro
  const handleMouseDown = useCallback((e: MapMouseEvent) => {
    longPressTimer.current = setTimeout(() => {
      setShowMoveConfirm({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    }, 600)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const confirmMoveEpicenter = useCallback(() => {
    if (showMoveConfirm) {
      setEpicenter(showMoveConfirm)
      setShowMoveConfirm(null)
    }
  }, [showMoveConfirm, setEpicenter])

  const handleRegisterSuccess = useCallback(() => {
    invalidate()
    // Toast notification will be added
  }, [invalidate])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <p className="text-lg font-semibold text-gray-700">Mapbox token não configurado</p>
          <p className="text-sm text-gray-500 mt-1">Adicione NEXT_PUBLIC_MAPBOX_TOKEN ao .env.local</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {buildingsError && (
        <div className="absolute top-14 left-0 right-0 z-50 px-0">
          <ErrorBanner error={buildingsError} onRetry={() => refetchBuildings()} />
        </div>
      )}
      <HeaderBar
        isOffline={!isOnline}
        onLayersClick={() => setShowLayers(!showLayers)}
        onFilterClick={() => setShowFilters(!showFilters)}
      />

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: epicenter?.lat ?? -23.605077,
          longitude: epicenter?.lng ?? -46.675792,
          zoom: 15,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={(e) => {
          const touch = e.originalEvent as TouchEvent | undefined
          if (touch?.touches?.[0]) {
            longPressTimer.current = setTimeout(() => {
              const point = mapRef.current?.unproject([
                touch.touches[0].clientX,
                touch.touches[0].clientY,
              ])
              if (point) setShowMoveConfirm({ lat: point.lat, lng: point.lng })
            }, 600)
          }
        }}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseUp}
        onDragStart={handleMouseUp}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" style={{ marginBottom: 70 }} />
        <RadiusCircles />
        <EpicenterPin />
        <GPSPin />

        {/* Building pins (filtered by status - Story 1.5) */}
        {buildings.map((b) => {
          if (!b.lat || !b.lng) return null
          const qual = b.edificios_qualificacoes?.[0]
          const status: StatusVarredura = qual?.status_varredura || 'nao_visitado'
          if (!isStatusVisible(status)) return null
          const color = PIN_COLORS[status]
          const isFisbo = qual?.is_fisbo_detected
          const isAuto = !b.verificado

          return (
            <Marker
              key={b.id}
              latitude={b.lat}
              longitude={b.lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setSelectedBuilding(b)
              }}
            >
              <div className="relative cursor-pointer">
                {/* FISBO badge */}
                {isFisbo && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center z-10">
                    <span className="text-[8px] font-bold">★</span>
                  </div>
                )}
                {/* Pin */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
                    isAuto ? 'border-2 border-dashed' : 'border-2 border-white'
                  }`}
                  style={{ backgroundColor: color, borderColor: isAuto ? color : 'white' }}
                >
                  {isAuto ? (
                    <span className="text-[8px] font-bold text-white">A</span>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                      <path d="M3 21h18L12 3 3 21z" />
                    </svg>
                  )}
                </div>
              </div>
            </Marker>
          )
        })}
      </Map>

      {/* Layers panel */}
      <LayersPanel isOpen={showLayers} onClose={() => setShowLayers(false)} />

      {/* Filter panel (Story 1.5) */}
      <FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} counts={statusCounts} />

      {/* Legend (Story 1.5) */}
      <MapLegend counts={statusCounts} total={buildings.length} />

      {/* FAB - Buscar aqui (Epic 6 enhancement) */}
      {!showRegister && !selectedBuilding && epicenter && (
        <button
          onClick={() => {
            router.push(`/search?lat=${epicenter.lat}&lng=${epicenter.lng}&radius=${activeRadius}`)
          }}
          className="absolute bottom-20 right-20 z-10 w-12 h-12 rounded-full bg-[#003DA5] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Buscar imoveis aqui"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      )}

      {/* FAB - Cadastro Rápido (Story 1.3) */}
      {!showRegister && !selectedBuilding && (
        <button
          onClick={() => setShowRegister(true)}
          className="absolute bottom-20 right-4 z-10 w-14 h-14 rounded-full bg-[#DC1431] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Cadastrar edifício"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Quick Register Form (Story 1.3) */}
      <QuickRegisterForm
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={handleRegisterSuccess}
      />

      {/* Building Card (Story 1.4) */}
      {selectedBuilding && (
        <BuildingCard
          building={selectedBuilding}
          isOpen={!!selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
          onUpdate={() => {
            invalidate()
            setSelectedBuilding(null)
          }}
        />
      )}

      {/* Move epicenter confirmation */}
      {showMoveConfirm && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-xl p-5 mx-4 max-w-xs w-full">
            <p className="text-sm font-semibold text-gray-800 mb-3">Mover epicentro para aqui?</p>
            <p className="text-xs text-gray-500 mb-4">
              {showMoveConfirm.lat.toFixed(4)}, {showMoveConfirm.lng.toFixed(4)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowMoveConfirm(null)} className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={confirmMoveEpicenter} className="flex-1 py-2 text-sm font-medium text-white bg-[#003DA5] rounded-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <BottomTabBar />
    </div>
  )
}
