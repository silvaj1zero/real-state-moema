'use client'

/**
 * OwnerBudgetDashboard — Story 6.7 (AC7).
 *
 * Cards de consumo do consultor: consultas no mes, custo acumulado e
 * cache hits/misses. Dados via fn_owner_lookup_stats (migration 024).
 */

import { useOwnerLookupStats } from '@/hooks/useOwnerLookupStats'

function brl(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function OwnerBudgetDashboard({ consultantId }: { consultantId: string }) {
  const { data, isLoading } = useOwnerLookupStats(consultantId)

  const cards = [
    {
      label: 'Consultas no mês',
      value: isLoading ? '—' : String(data?.consultas_mes ?? 0),
      hint: data ? `${data.sucessos_mes} sucesso · ${data.nao_encontrados_mes} não encontrado · ${data.falhas_mes} falha` : '',
    },
    {
      label: 'Custo acumulado',
      value: isLoading ? '—' : brl(data?.custo_mes ?? 0),
      hint: 'mês corrente',
    },
    {
      label: 'Cache hits / misses',
      value: isLoading ? '—' : `${data?.cache_hits_total ?? 0} / ${data?.consultas_total ?? 0}`,
      hint: 'hit = consulta grátis',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">{c.label}</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{c.value}</p>
          {c.hint && <p className="text-[10px] text-gray-400 mt-0.5">{c.hint}</p>}
        </div>
      ))}
    </div>
  )
}
