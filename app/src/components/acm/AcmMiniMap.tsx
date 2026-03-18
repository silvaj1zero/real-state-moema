'use client'

import { useRef } from 'react'
import Map, { Layer, Source, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import * as turf from '@turf/turf'
import { getEffectiveRadius } from '@/store/acm'
import type { AcmRadiusOption } from '@/store/acm'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface AcmMiniMapProps {
  lat: number
  lng: number
  radiusOption: AcmRadiusOption
  customRadius: number
}

export function AcmMiniMap({ lat, lng, radiusOption, customRadius }: AcmMiniMapProps) {
  const mapRef = useRef<MapRef>(null)
  const radiusMeters = getEffectiveRadius(radiusOption, customRadius)

  // Generate circle GeoJSON using turf.js
  const center = turf.point([lng, lat])
  const circle = turf.circle(center, radiusMeters / 1000, {
    steps: 64,
    units: 'kilometers',
  })

  return (
    <div className="w-full h-40 rounded-xl overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: radiusMeters <= 500 ? 15 : radiusMeters <= 2000 ? 13 : 12,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactive={false}
      >
        {/* Radius circle */}
        <Source id="acm-radius" type="geojson" data={circle}>
          <Layer
            id="acm-radius-fill"
            type="fill"
            paint={{
              'fill-color': '#003DA5',
              'fill-opacity': 0.15,
            }}
          />
          <Layer
            id="acm-radius-border"
            type="line"
            paint={{
              'line-color': '#003DA5',
              'line-width': 2,
              'line-opacity': 0.5,
            }}
          />
        </Source>

        {/* Center point */}
        <Source
          id="acm-center"
          type="geojson"
          data={center}
        >
          <Layer
            id="acm-center-point"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': '#003DA5',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </Source>
      </Map>
    </div>
  )
}
