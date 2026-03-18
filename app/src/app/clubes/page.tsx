'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import {
  useClubeThresholds,
  useVgvMonthly,
  determineClube,
  getNextClube,
  calculateProgress,
  projectMonths,
  CLUBE_LABELS,
  CLUBE_COLORS,
  CLUBE_ORDER,
} from '@/hooks/useClubes'
import { ArrowLeft, Trophy, TrendingUp, Target, Sparkles } from 'lucide-react'

function fmtR(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ClubesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { data: thresholds = [] } = useClubeThresholds()
  const { vgvAcumulado, monthly, avg3Months, isLoading } = useVgvMonthly(user?.id ?? null)

  const [metaInput, setMetaInput] = useState('')
  const [editingMeta, setEditingMeta] = useState(false)
  const meta = metaInput ? parseFloat(metaInput.replace(/\D/g, '')) / 100 : 0

  const currentClube = determineClube(vgvAcumulado, thresholds)
  const nextClube = getNextClube(currentClube, thresholds)
  const progress = calculateProgress(vgvAcumulado, currentClube, thresholds)
  const projection = projectMonths(vgvAcumulado, nextClube, avg3Months)

  const faltam = nextClube ? nextClube.vgv_minimo_anual - vgvAcumulado : 0
  const faltamPercent = nextClube ? (faltam / nextClube.vgv_minimo_anual) * 100 : 0
  const faltamColor = faltamPercent < 20 ? '#22C55E' : faltamPercent < 50 ? '#F59E0B' : '#003DA5'

  // Chart heights
  const maxMonthly = Math.max(...monthly.map((m) => m.cumulative), 1)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-1.5">
            <Trophy size={18} className="text-[#FFD700]" />
            <h1 className="text-base font-bold text-gray-900">Clubes RE/MAX</h1>
          </div>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Club progression bar (AC1) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {CLUBE_ORDER.filter((c) => c !== 'sem_clube').map((clube, i) => {
              const idx = CLUBE_ORDER.indexOf(clube)
              const currentIdx = CLUBE_ORDER.indexOf(currentClube as (typeof CLUBE_ORDER)[number])
              const isReached = idx <= currentIdx
              const isCurrent = clube === currentClube
              const color = CLUBE_COLORS[clube]

              return (
                <div key={clube} className="flex items-center gap-1">
                  <div
                    className={`flex flex-col items-center min-w-[48px] ${isCurrent ? 'scale-110' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                        isReached ? 'text-white' : 'text-gray-300 border-2 border-gray-200'
                      }`}
                      style={isReached ? { backgroundColor: color } : undefined}
                    >
                      {isCurrent ? '★' : i + 1}
                    </div>
                    <span className={`text-[8px] mt-0.5 font-medium ${isReached ? 'text-gray-700' : 'text-gray-300'}`}>
                      {CLUBE_LABELS[clube]}
                    </span>
                  </div>
                  {i < CLUBE_ORDER.length - 2 && (
                    <div className={`w-4 h-0.5 ${idx < currentIdx ? 'bg-[#003DA5]' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, #003DA5, ${CLUBE_COLORS[currentClube] || '#FFD700'})`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>{CLUBE_LABELS[currentClube]}</span>
              {nextClube && <span>{CLUBE_LABELS[nextClube.clube]}</span>}
            </div>
          </div>
        </div>

        {/* Info card (AC3) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: CLUBE_COLORS[currentClube] }}
            >
              {CLUBE_LABELS[currentClube]}
            </span>
          </div>
          <p className="text-sm text-gray-700">
            VGV acumulado: <strong>{fmtR(vgvAcumulado)}</strong>
          </p>
          {nextClube && (
            <p className="text-sm mt-1" style={{ color: faltamColor }}>
              Próximo: {CLUBE_LABELS[nextClube.clube]} — faltam <strong>{fmtR(faltam)}</strong>
            </p>
          )}
          {!nextClube && vgvAcumulado > 0 && (
            <p className="text-sm text-[#FFD700] mt-1 font-bold">Nível máximo alcançado!</p>
          )}
        </div>

        {/* Projection (AC5 - Should) */}
        {projection !== null && avg3Months > 0 && monthly.length >= 3 && (
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 mb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={14} className="text-[#7C3AED]" />
              <span className="text-xs font-semibold text-[#7C3AED]">Projeção</span>
            </div>
            <p className="text-sm text-gray-700">
              No ritmo atual, você atinge <strong>{nextClube ? CLUBE_LABELS[nextClube.clube] : '—'}</strong> em{' '}
              <strong>{projection} meses</strong>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              Projeção estimada — sazonalidade e variação de mercado podem alterar o resultado
            </p>
          </div>
        )}

        {/* Meta pessoal (AC6) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Target size={14} /> Minha Meta Anual
            </span>
            <button
              onClick={() => setEditingMeta(!editingMeta)}
              className="text-[10px] text-[#003DA5] font-medium"
            >
              {editingMeta ? 'OK' : 'Editar'}
            </button>
          </div>
          {editingMeta ? (
            <input
              type="text"
              value={metaInput}
              onChange={(e) => setMetaInput(e.target.value.replace(/\D/g, ''))}
              placeholder="R$ 0,00"
              className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#003DA5]"
              autoFocus
            />
          ) : meta > 0 ? (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{fmtR(vgvAcumulado)}</span>
                <span>{fmtR(meta)}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((vgvAcumulado / meta) * 100, 100)}%`,
                    backgroundColor: vgvAcumulado >= meta ? '#22C55E' : vgvAcumulado >= meta * 0.5 ? '#F59E0B' : '#DC3545',
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Defina uma meta para acompanhar seu progresso</p>
          )}
        </div>

        {/* Monthly chart (AC4) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-3">
            <TrendingUp size={14} /> VGV Acumulado (12 meses)
          </p>
          <div className="flex items-end gap-1.5 h-32">
            {monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t bg-[#003DA5] min-h-[2px] transition-all"
                  style={{ height: `${Math.max((m.cumulative / maxMonthly) * 100, 2)}px` }}
                />
                <span className="text-[7px] text-gray-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
