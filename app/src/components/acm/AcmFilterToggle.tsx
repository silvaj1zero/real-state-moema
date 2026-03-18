'use client'

import { useAcmStore, type AcmFilterType } from '@/store/acm'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS: { value: AcmFilterType; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'anuncio', label: 'Anúncio' },
  { value: 'venda_real', label: 'Venda Real' },
]

export function AcmFilterToggle() {
  const filterType = useAcmStore((s) => s.filterType)
  const setFilterType = useAcmStore((s) => s.setFilterType)

  return (
    <div className="flex gap-1.5">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setFilterType(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            filterType === opt.value
              ? opt.value === 'venda_real'
                ? 'bg-green-500 text-white'
                : opt.value === 'anuncio'
                  ? 'bg-gray-500 text-white'
                  : 'bg-[#003DA5] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function AcmFilterBadge() {
  const filterType = useAcmStore((s) => s.filterType)

  if (filterType === 'todos') return null

  if (filterType === 'venda_real') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
        Dados reais de venda
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">
      Preços de anúncio — expectativa do mercado
    </span>
  )
}
