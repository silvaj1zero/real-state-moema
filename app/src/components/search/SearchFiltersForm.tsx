'use client'

import { Minus, Plus, Search, Globe } from 'lucide-react'
import { useSearchStore } from '@/store/search'
import { cn } from '@/lib/utils'

interface SearchFiltersFormProps {
  onSearchLocal: () => void
  onSearchPortals: () => void
  isSearchingLocal: boolean
  isSearchingPortals: boolean
}

const PORTAL_OPTIONS = [
  { value: 'zap', label: 'ZAP', color: '#8B2FC9' },
  { value: 'olx', label: 'OLX', color: '#6E0AD6' },
  { value: 'vivareal', label: 'VivaReal', color: '#FF7900' },
]

export function SearchFiltersForm({
  onSearchLocal,
  onSearchPortals,
  isSearchingLocal,
  isSearchingPortals,
}: SearchFiltersFormProps) {
  const filters = useSearchStore((s) => s.filters)
  const updateFilters = useSearchStore((s) => s.updateFilters)
  const tipo_transacao = useSearchStore((s) => s.tipo_transacao)
  const setTipoTransacao = useSearchStore((s) => s.setTipoTransacao)
  const selectedPortals = useSearchStore((s) => s.selectedPortals)
  const togglePortal = useSearchStore((s) => s.togglePortal)
  const fisbo_only = useSearchStore((s) => s.fisbo_only)
  const setFisboOnly = useSearchStore((s) => s.setFisboOnly)
  const resetFilters = useSearchStore((s) => s.resetFilters)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Filtros</h2>
        <button
          onClick={resetFilters}
          className="text-xs text-[#003DA5] hover:underline"
        >
          Limpar
        </button>
      </div>

      {/* Quartos */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Quartos</label>
        <div className="flex items-center gap-3">
          <StepperField
            label="Min"
            value={filters.quartos_min}
            onChange={(v) => updateFilters({ quartos_min: v })}
            min={0}
            max={10}
          />
          <span className="text-gray-300 mt-5">-</span>
          <StepperField
            label="Max"
            value={filters.quartos_max}
            onChange={(v) => updateFilters({ quartos_max: v })}
            min={0}
            max={10}
          />
        </div>
      </div>

      {/* Suites */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Suites</label>
        <StepperField
          label="Min"
          value={filters.suites_min}
          onChange={(v) => updateFilters({ suites_min: v })}
          min={0}
          max={10}
        />
      </div>

      {/* Banheiros */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Banheiros</label>
        <div className="flex items-center gap-3">
          <StepperField
            label="Min"
            value={filters.banheiros_min}
            onChange={(v) => updateFilters({ banheiros_min: v })}
            min={0}
            max={10}
          />
          <span className="text-gray-300 mt-5">-</span>
          <StepperField
            label="Max"
            value={filters.banheiros_max}
            onChange={(v) => updateFilters({ banheiros_max: v })}
            min={0}
            max={10}
          />
        </div>
      </div>

      {/* Area m2 */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Area m²</label>
        <div className="flex items-center gap-3">
          <NumberInput
            placeholder="50"
            value={filters.area_min}
            onChange={(v) => updateFilters({ area_min: v })}
          />
          <span className="text-gray-300">-</span>
          <NumberInput
            placeholder="300"
            value={filters.area_max}
            onChange={(v) => updateFilters({ area_max: v })}
          />
        </div>
      </div>

      {/* Preco */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Preco R$</label>
        <div className="flex items-center gap-3">
          <CurrencyInput
            placeholder="200.000"
            value={filters.preco_min}
            onChange={(v) => updateFilters({ preco_min: v })}
          />
          <span className="text-gray-300">-</span>
          <CurrencyInput
            placeholder="2.000.000"
            value={filters.preco_max}
            onChange={(v) => updateFilters({ preco_max: v })}
          />
        </div>
      </div>

      {/* Tipo Transacao */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Tipo</label>
        <div className="flex gap-2">
          <button
            onClick={() => setTipoTransacao('venda')}
            className={cn(
              'flex-1 h-10 rounded-lg text-sm font-medium border transition-colors',
              tipo_transacao === 'venda'
                ? 'bg-[#003DA5] text-white border-[#003DA5]'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            )}
          >
            Venda
          </button>
          <button
            onClick={() => setTipoTransacao('aluguel')}
            className={cn(
              'flex-1 h-10 rounded-lg text-sm font-medium border transition-colors',
              tipo_transacao === 'aluguel'
                ? 'bg-[#003DA5] text-white border-[#003DA5]'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            )}
          >
            Aluguel
          </button>
        </div>
      </div>

      {/* Portais */}
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Portais</label>
        <div className="flex gap-2">
          {PORTAL_OPTIONS.map((p) => {
            const isActive = selectedPortals.has(p.value)
            return (
              <button
                key={p.value}
                onClick={() => togglePortal(p.value)}
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-medium border transition-colors',
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                )}
                style={isActive ? { backgroundColor: p.color } : undefined}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* FISBO toggle */}
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-700">Apenas FISBO</span>
        <button
          onClick={() => setFisboOnly(!fisbo_only)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors',
            fisbo_only ? 'bg-green-500' : 'bg-gray-200'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              fisbo_only && 'translate-x-5'
            )}
          />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onSearchLocal}
          disabled={isSearchingLocal}
          className="flex-1 h-12 rounded-xl border border-[#003DA5] text-[#003DA5] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#003DA5]/5 transition-colors disabled:opacity-50"
        >
          <Search className="size-4" />
          {isSearchingLocal ? 'Buscando...' : 'Buscar na Base'}
        </button>
        <button
          onClick={onSearchPortals}
          disabled={isSearchingPortals}
          className="flex-1 h-12 rounded-xl bg-[#003DA5] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#003DA5]/90 transition-colors disabled:opacity-50"
        >
          <Globe className="size-4" />
          {isSearchingPortals ? 'Buscando...' : 'Buscar nos Portais'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepperField({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
}) {
  const current = value ?? 0

  function decrement() {
    if (current <= min) {
      onChange(null)
    } else {
      onChange(current - 1)
    }
  }

  function increment() {
    const next = current + 1
    if (next <= max) onChange(next)
  }

  return (
    <div className="flex-1">
      <span className="text-[10px] text-gray-400 block mb-1">{label}</span>
      <div className="flex items-center h-12 rounded-lg border border-gray-200">
        <button
          onClick={decrement}
          className="w-12 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 rounded-l-lg"
        >
          <Minus className="size-4" />
        </button>
        <span className="flex-1 text-center text-sm font-medium text-gray-900">
          {value != null ? value : '-'}
        </span>
        <button
          onClick={increment}
          className="w-12 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50 rounded-r-lg"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

function NumberInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        onChange(raw === '' ? null : Number(raw))
      }}
      className="flex-1 h-12 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/30"
    />
  )
}

function CurrencyInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (raw === '') {
      onChange(null)
      return
    }
    onChange(Number(raw))
  }

  function formatDisplay(v: number | null): string {
    if (v == null) return ''
    return new Intl.NumberFormat('pt-BR').format(v)
  }

  return (
    <div className="relative flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={formatDisplay(value)}
        onChange={handleChange}
        className="w-full h-12 rounded-lg border border-gray-200 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/30"
      />
    </div>
  )
}
