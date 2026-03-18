'use client'

import type { FeedFilters as FiltersType, TipoFeed, PrioridadeFeed } from '@/hooks/useFeed'
import { FEED_TYPE_CONFIG, PRIORIDADE_COLORS } from '@/hooks/useFeed'
import { cn } from '@/lib/utils'

const PERIODO_OPTIONS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'todos', label: 'Todos' },
] as const

const PRIORIDADE_OPTIONS: PrioridadeFeed[] = ['alta', 'media', 'baixa']

interface FeedFiltersProps {
  filters: FiltersType
  onChange: (filters: FiltersType) => void
  typeCounts?: Record<TipoFeed, number>
}

export function FeedFiltersBar({ filters, onChange, typeCounts }: FeedFiltersProps) {
  function toggleTipo(tipo: TipoFeed) {
    const next = filters.tipos.includes(tipo)
      ? filters.tipos.filter((t) => t !== tipo)
      : [...filters.tipos, tipo]
    onChange({ ...filters, tipos: next })
  }

  function togglePrioridade(p: PrioridadeFeed) {
    const next = filters.prioridades.includes(p)
      ? filters.prioridades.filter((x) => x !== p)
      : [...filters.prioridades, p]
    onChange({ ...filters, prioridades: next })
  }

  return (
    <div className="space-y-2">
      {/* Periodo */}
      <div className="flex gap-1">
        {PERIODO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...filters, periodo: opt.value })}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
              filters.periodo === opt.value
                ? 'bg-[#003DA5] text-white'
                : 'bg-gray-100 text-gray-600',
            )}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => onChange({ ...filters, apenasNaoLidos: !filters.apenasNaoLidos })}
          className={cn(
            'px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ml-auto',
            filters.apenasNaoLidos
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-600',
          )}
        >
          Não lidos
        </button>
      </div>

      {/* Prioridade */}
      <div className="flex gap-1">
        {PRIORIDADE_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => togglePrioridade(p)}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors capitalize',
              filters.prioridades.includes(p)
                ? 'text-white'
                : 'bg-gray-100 text-gray-500',
            )}
            style={
              filters.prioridades.includes(p)
                ? { backgroundColor: PRIORIDADE_COLORS[p] }
                : undefined
            }
          >
            {p}
          </button>
        ))}
      </div>

      {/* Tipos (scrollable) */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {(Object.keys(FEED_TYPE_CONFIG) as TipoFeed[]).map((tipo) => {
          const cfg = FEED_TYPE_CONFIG[tipo]
          const count = typeCounts?.[tipo] ?? 0
          const active = filters.tipos.length === 0 || filters.tipos.includes(tipo)

          return (
            <button
              key={tipo}
              onClick={() => toggleTipo(tipo)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0',
                active ? 'text-white' : 'bg-gray-100 text-gray-400',
              )}
              style={active ? { backgroundColor: cfg.color } : undefined}
            >
              {cfg.label}
              {count > 0 && ` (${count})`}
            </button>
          )
        })}
      </div>
    </div>
  )
}
