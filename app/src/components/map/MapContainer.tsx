'use client'

import { useEffect, useState } from 'react'

export function MapContainer() {
  const [MapView, setMapView] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    import('./MapView').then((m) => setMapView(() => m.MapView))
  }, [])

  if (!MapView) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-center">
          <div className="text-2xl font-bold text-[#003DA5]">RE/MAX Moema</div>
          <p className="text-sm text-gray-400 mt-2">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  return <MapView />
}
