'use client'

import { useMapStore } from '@/store/map'

interface LayersPanelProps {
  isOpen: boolean
  onClose: () => void
}

const LAYERS = [
  { radius: 500 as const, label: '500m', color: '#22C55E' },
  { radius: 1000 as const, label: '1km', color: '#EAB308' },
  { radius: 2000 as const, label: '2km', color: '#DC1431' },
]

export function LayersPanel({ isOpen, onClose }: LayersPanelProps) {
  const toggleRadius = useMapStore((s) => s.toggleRadius)
  const show500 = useMapStore((s) => s.showRadius500)
  const show1000 = useMapStore((s) => s.showRadius1000)
  const show2000 = useMapStore((s) => s.showRadius2000)

  const visibility = { 500: show500, 1000: show1000, 2000: show2000 }

  if (!isOpen) return null

  return (
    <div className="absolute top-12 right-3 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-48">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">Camadas</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {LAYERS.map(({ radius, label, color }) => (
        <button
          key={radius}
          onClick={() => toggleRadius(radius)}
          className="flex items-center gap-3 w-full py-2 px-1 hover:bg-gray-50 rounded"
        >
          <div
            className="w-4 h-4 rounded border-2"
            style={{
              borderColor: color,
              backgroundColor: visibility[radius] ? color + '20' : 'transparent',
            }}
          />
          <span className="text-sm text-gray-700">Raio {label}</span>
          {visibility[radius] && (
            <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}
