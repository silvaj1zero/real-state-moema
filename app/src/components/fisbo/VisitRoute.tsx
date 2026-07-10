'use client'

import { useMemo, useState } from 'react'
import { MapPin, Navigation, Phone, MessageCircle, Loader2, Route as RouteIcon } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useMapStore } from '@/store/map'
import { useVisitRoute } from '@/hooks/useVisitRoute'
import { groupByBairro, type RouteStop } from '@/lib/fisbo/routeOrder'
import { buildStaticMapUrl, type MapMarker } from '@/lib/acm/pdf/staticMap'
import { telLink, whatsappLink } from '@/lib/contact-links'
import { cn } from '@/lib/utils'

type OriginMode = 'gps' | 'epicentro'
type ViewMode = 'proximidade' | 'bairro'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

function formatDistance(m: number | null): string | null {
  if (m == null) return null
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

// ---------------------------------------------------------------------------
// VisitRoute — roteiro de visitas por proximidade (Story 10.2)
// ---------------------------------------------------------------------------

export function VisitRoute({ consultantId }: { consultantId: string }) {
  // Ativa o watch de GPS (escreve userLocation no store) — fallback gracioso.
  useGeolocation()
  const userLocation = useMapStore((s) => s.userLocation)
  const epicenter = useMapStore((s) => s.epicenter)

  const [originMode, setOriginMode] = useState<OriginMode>('gps')
  const [viewMode, setViewMode] = useState<ViewMode>('proximidade')

  // Ponto de partida efetivo (AC1) + degradação graciosa (AC6):
  // GPS escolhido mas indisponível → cai para o epicentro.
  const gpsUnavailable = originMode === 'gps' && !userLocation
  const origin = useMemo(() => {
    if (originMode === 'gps') return userLocation ?? epicenter ?? null
    return epicenter ?? null
  }, [originMode, userLocation, epicenter])

  // Sem ponto de partida válido → visão por bairro (AC6).
  const effectiveView: ViewMode = origin ? viewMode : 'bairro'

  const { route, total, isLoading, error } = useVisitRoute(
    consultantId,
    effectiveView === 'proximidade' ? origin : null,
  )

  const allStops = useMemo(() => [...route.ordered, ...route.semCoord], [route])

  // Pins numerados no mapa estático (AC4) — Mapbox rotula só 0-9.
  const mapUrl = useMemo(() => {
    if (!MAPBOX_TOKEN || !origin || route.ordered.length === 0) return null
    const markers: MapMarker[] = [{ lat: origin.lat, lng: origin.lng, color: '003DA5', size: 'l' }]
    let maxDist = 300
    for (const s of route.ordered) {
      if (s.lat == null || s.lng == null) continue
      markers.push({
        lat: s.lat,
        lng: s.lng,
        label: s.numero <= 9 ? s.numero : undefined,
        color: 'DC1431',
      })
      if (s.distanciaM != null) maxDist = Math.max(maxDist, s.distanciaM)
    }
    return buildStaticMapUrl({
      token: MAPBOX_TOKEN,
      center: origin,
      radiusMeters: Math.min(5000, maxDist),
      markers,
      width: 640,
      height: 320,
    })
  }, [origin, route.ordered])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <RouteIcon className="size-4 text-[#003DA5]" /> Roteiro de visitas
          </h1>
          <span className="text-xs text-gray-400">{total} alvo(s)</span>
        </div>

        {/* Ponto de partida (AC1) + visão (AC3) */}
        <div className="flex gap-2 px-4 pb-2">
          <select
            aria-label="Ponto de partida"
            value={originMode}
            onChange={(e) => setOriginMode(e.target.value as OriginMode)}
            className="flex-1 h-9 px-2 rounded-lg border border-gray-300 text-xs bg-white"
          >
            <option value="gps">GPS atual</option>
            <option value="epicentro">Epicentro (Moema)</option>
          </select>
          <select
            aria-label="Modo de visão"
            value={effectiveView}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            disabled={!origin}
            className="flex-1 h-9 px-2 rounded-lg border border-gray-300 text-xs bg-white disabled:opacity-50"
          >
            <option value="proximidade">Por proximidade</option>
            <option value="bairro">Por bairro</option>
          </select>
        </div>

        {gpsUnavailable && (
          <p className="px-4 pb-2 text-[11px] text-amber-600">
            GPS indisponível — usando o epicentro como ponto de partida.
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : error ? (
        <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Erro ao montar o roteiro.'}
        </div>
      ) : allStops.length === 0 ? (
        <div className="text-center py-16 px-6 text-gray-500">
          <Navigation className="size-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">Nenhum alvo no roteiro. Marque FISBO como “Agendado” ou “Retornar” na call list.</p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {/* Mapa estático com a sequência numerada (AC4) */}
          {mapUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapUrl}
              alt="Mapa do roteiro de visitas"
              className="w-full rounded-xl border border-gray-200"
            />
          )}

          {effectiveView === 'bairro' ? (
            <BairroView stops={allStops} />
          ) : (
            <ol className="space-y-2">
              {route.ordered.map((s) => (
                <RouteStopRow key={s.listingId} stop={s} />
              ))}
              {route.semCoord.length > 0 && (
                <li className="pt-2 text-[11px] font-medium text-gray-400">Sem localização</li>
              )}
              {route.semCoord.map((s) => (
                <RouteStopRow key={s.listingId} stop={s} />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BairroView — agrupamento por bairro (AC3/AC6)
// ---------------------------------------------------------------------------

function BairroView({ stops }: { stops: RouteStop[] }) {
  const groups = useMemo(() => groupByBairro(stops), [stops])
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.bairro}>
          <p className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
            <MapPin className="size-3" /> {g.bairro}
            <span className="text-gray-400 font-normal">({g.stops.length})</span>
          </p>
          <ol className="space-y-2">
            {g.stops.map((s) => (
              <RouteStopRow key={s.listingId} stop={s} />
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RouteStopRow — uma parada do roteiro
// ---------------------------------------------------------------------------

function RouteStopRow({ stop }: { stop: RouteStop }) {
  const dist = formatDistance(stop.distanciaM)
  return (
    <li className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-start gap-3">
      <div className="shrink-0 size-7 rounded-full bg-[#003DA5] text-white text-xs font-bold flex items-center justify-center">
        {stop.numero}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {stop.nome || 'Proprietário (sem nome)'}
          </p>
          {dist && <span className="text-[11px] text-gray-500 whitespace-nowrap">{dist}</span>}
        </div>
        {(stop.endereco || stop.bairro) && (
          <p className="text-xs text-gray-500 truncate">
            {[stop.endereco, stop.bairro].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {stop.telefone && (
            <a
              href={telLink(stop.telefone)}
              className="min-h-[36px] px-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 text-[11px] font-medium"
            >
              <Phone className="size-3" /> Ligar
            </a>
          )}
          {stop.whatsapp && (
            <a
              href={whatsappLink(stop.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] px-2.5 rounded-lg bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1 text-[11px] font-medium"
            >
              <MessageCircle className="size-3" /> WhatsApp
            </a>
          )}
          <span
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full',
              stop.contatoStatus === 'agendado'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-700',
            )}
          >
            {stop.contatoStatus === 'agendado' ? 'Agendado' : 'Retornar'}
          </span>
        </div>
      </div>
    </li>
  )
}
