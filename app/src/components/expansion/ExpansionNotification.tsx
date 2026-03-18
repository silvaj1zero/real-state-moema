'use client'

import { useState } from 'react'
import { Unlock, X, MapPin, ArrowRight } from 'lucide-react'
import {
  RADIUS_LABELS,
  RADIUS_COLORS,
  type RadiusCoverage,
  type RadiusStep,
} from '@/hooks/useRadiusExpansion'

interface ExpansionNotificationProps {
  currentRadius: RadiusStep
  nextRadius: RadiusStep | null
  coverage: RadiusCoverage
  onExpand: () => void
  onDismiss: () => void
  isExpanding: boolean
}

export function ExpansionNotification({
  currentRadius,
  nextRadius,
  coverage,
  onExpand,
  onDismiss,
  isExpanding,
}: ExpansionNotificationProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!nextRadius) return null

  const currentColor = RADIUS_COLORS[currentRadius]
  const nextColor = RADIUS_COLORS[nextRadius]

  return (
    <div className="absolute top-14 left-3 right-3 z-30 animate-in slide-in-from-top duration-300">
      <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-200 overflow-hidden">
        {/* Celebratory header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${currentColor}15, ${nextColor}15)` }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: `${currentColor}20` }}
          >
            <span role="img" aria-label="Celebracao">
              🎉
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900">
              Raio de {RADIUS_LABELS[currentRadius]} dominado!
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {coverage.visitados}/{coverage.total} edifícios cobertos ({coverage.percentual}%)
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {/* Radius transition visual */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: currentColor }}
              >
                <span className="text-[10px] font-bold" style={{ color: currentColor }}>
                  {RADIUS_LABELS[currentRadius]}
                </span>
              </div>
            </div>
            <ArrowRight size={18} className="text-gray-400" />
            <div className="flex items-center gap-1.5">
              <div
                className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center animate-pulse"
                style={{ borderColor: nextColor }}
              >
                <Unlock size={14} style={{ color: nextColor }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: nextColor }}>
                {RADIUS_LABELS[nextRadius]}
              </span>
            </div>
          </div>

          {/* Expandable details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-center text-xs text-gray-500 underline-offset-2 hover:underline mb-3"
          >
            {showDetails ? 'Ocultar detalhes' : 'Ver o que tem no próximo raio'}
          </button>

          {showDetails && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={12} style={{ color: nextColor }} />
                <span className="font-medium">
                  Raio de {RADIUS_LABELS[nextRadius]} — zona de expansão
                </span>
              </div>
              <p>
                Novos edifícios serão carregados automaticamente via dados públicos (OSM).
                Eles aparecerão como &quot;Não Visitado&quot; (cinza) no mapa.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="flex-1 h-10 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Depois
            </button>
            <button
              onClick={onExpand}
              disabled={isExpanding}
              className="flex-1 h-10 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: nextColor }}
            >
              {isExpanding ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Desbloqueando...
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  Desbloquear agora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
