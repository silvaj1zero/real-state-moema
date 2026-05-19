'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * ReviewQueueFilters — Story 7.8 AC6.
 *
 * Filtros: portal (multi-select chips), bairro (text), confidence threshold
 * (slider 0-1, default 0.70). Submits via URL search params (back-button
 * friendly, RSC re-renders with new data).
 */

const PORTALS = [
  { value: 'mercadolivre', label: 'Mercado Livre' },
  { value: 'zap', label: 'Zap' },
  { value: 'olx', label: 'OLX' },
  { value: 'vivareal', label: 'VivaReal' },
] as const

type Portal = (typeof PORTALS)[number]['value']

interface Props {
  threshold: number
  portals: string[]
  bairro: string
}

export function ReviewQueueFilters({
  threshold: thresholdInitial,
  portals: portalsInitial,
  bairro: bairroInitial,
}: Props) {
  const router = useRouter()
  const [threshold, setThreshold] = useState(thresholdInitial)
  const [selectedPortals, setSelectedPortals] = useState<Portal[]>(
    portalsInitial.filter((p): p is Portal =>
      PORTALS.some((P) => P.value === p)
    )
  )
  const [bairro, setBairro] = useState(bairroInitial)

  function togglePortal(p: Portal) {
    setSelectedPortals((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  function apply() {
    const params = new URLSearchParams()
    params.set('threshold', threshold.toFixed(2))
    if (bairro.trim()) params.set('bairro', bairro.trim())
    selectedPortals.forEach((p) => params.append('portal', p))
    router.push(`/leads/review-queue?${params.toString()}`)
  }

  function reset() {
    setThreshold(0.7)
    setSelectedPortals([])
    setBairro('')
    router.push('/leads/review-queue')
  }

  return (
    <section
      aria-label="Filtros da fila de revisão"
      className="rounded-lg border border-gray-200 bg-white p-4"
      data-testid="filters"
    >
      <div>
        <label
          htmlFor="threshold"
          className="block text-sm font-medium text-gray-800"
        >
          Confidence máximo: {(threshold * 100).toFixed(0)}%
        </label>
        <input
          id="threshold"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-2 w-full"
          aria-label="Slider para confidence máximo da fila"
        />
      </div>

      <div className="mt-4">
        <span className="block text-sm font-medium text-gray-800">
          Portais
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PORTALS.map((p) => {
            const active = selectedPortals.includes(p.value)
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePortal(p.value)}
                aria-pressed={active}
                className={`min-h-10 rounded-full border px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  active
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="bairro"
          className="block text-sm font-medium text-gray-800"
        >
          Bairro
        </label>
        <input
          id="bairro"
          type="text"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          placeholder="Moema, Vila Olímpia, Itaim..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={apply}
          className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Limpar
        </button>
      </div>
    </section>
  )
}
