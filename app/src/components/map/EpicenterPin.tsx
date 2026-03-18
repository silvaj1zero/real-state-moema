'use client'

import { Marker } from 'react-map-gl/mapbox'
import { useMapStore } from '@/store/map'

export function EpicenterPin() {
  const epicenter = useMapStore((s) => s.epicenter)

  if (!epicenter) return null

  return (
    <Marker latitude={epicenter.lat} longitude={epicenter.lng} anchor="bottom">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 bg-[#003DA5] rounded-full border-3 border-white shadow-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </div>
        <div className="text-[10px] font-bold text-[#003DA5] bg-white/90 px-1.5 py-0.5 rounded shadow mt-0.5">
          Epicentro
        </div>
      </div>
    </Marker>
  )
}
