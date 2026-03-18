'use client'

import { Marker } from 'react-map-gl/mapbox'
import { useMapStore } from '@/store/map'

export function GPSPin() {
  const userLocation = useMapStore((s) => s.userLocation)

  if (!userLocation) return null

  return (
    <Marker latitude={userLocation.lat} longitude={userLocation.lng} anchor="center">
      <div className="relative">
        {/* Pulse ring */}
        <div className="absolute -inset-3 rounded-full bg-blue-500/20 animate-ping" />
        {/* Outer ring */}
        <div className="w-5 h-5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-lg">
          {/* Inner dot */}
          <div className="w-3 h-3 rounded-full bg-blue-500" />
        </div>
      </div>
    </Marker>
  )
}
