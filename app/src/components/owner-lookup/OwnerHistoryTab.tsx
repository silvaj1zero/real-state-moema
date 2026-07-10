'use client'

/**
 * OwnerHistoryTab — Story 6.7 (AC6).
 *
 * Ultimos 50 lookups do consultor (RLS), com filtro por edificio (texto) e
 * por status. Reusa o padrao de lista/cards do projeto.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OwnerLookup, OwnerLookupRowStatus } from '@/lib/supabase/types'

const STATUS_LABELS: Record<OwnerLookupRowStatus, string> = {
  pending: 'Pendente',
  success: 'Sucesso',
  failed: 'Falha',
  not_found: 'Não encontrado',
}

const STATUS_COLORS: Record<OwnerLookupRowStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  not_found: 'bg-amber-100 text-amber-700',
}

type LookupWithEdificio = OwnerLookup & {
  edificios: { nome: string; endereco: string } | null
}

export function OwnerHistoryTab({ consultantId }: { consultantId: string }) {
  const [statusFilter, setStatusFilter] = useState<OwnerLookupRowStatus | ''>('')
  const [edificioFilter, setEdificioFilter] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner-lookup', 'history', consultantId],
    queryFn: async (): Promise<LookupWithEdificio[]> => {
      const { data, error } = await createClient()
        .from('owner_lookups')
        .select('*, edificios(nome, endereco)')
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
      return (data ?? []) as LookupWithEdificio[]
    },
  })

  const filtered = useMemo(() => {
    let rows = data ?? []
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter)
    if (edificioFilter.trim()) {
      const q = edificioFilter.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          r.edificios?.nome?.toLowerCase().includes(q) ||
          r.edificios?.endereco?.toLowerCase().includes(q) ||
          r.endereco?.toLowerCase().includes(q) ||
          r.sql_lote?.toLowerCase().includes(q),
      )
    }
    return rows
  }, [data, statusFilter, edificioFilter])

  return (
    <div>
      {/* Filtros (AC6) */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={edificioFilter}
          onChange={(e) => setEdificioFilter(e.target.value)}
          placeholder="Filtrar por edifício/endereço"
          className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#003DA5]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OwnerLookupRowStatus | '')}
          aria-label="Filtrar por status"
          className="h-10 px-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Todos</option>
          {(Object.keys(STATUS_LABELS) as OwnerLookupRowStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-400 py-6 text-center">Carregando...</p>}
      {error && <p className="text-sm text-red-500 py-6 text-center">Erro ao carregar histórico.</p>}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center">Nenhuma consulta registrada.</p>
      )}

      <div className="space-y-2">
        {filtered.map((row) => (
          <div key={row.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800 truncate">
                {row.edificios?.nome ?? row.endereco ?? row.sql_lote ?? 'Lote avulso'}
              </p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLORS[row.status]}`}>
                {STATUS_LABELS[row.status]}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {row.edificios?.endereco ?? row.endereco ?? '—'}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
              <span>{new Date(row.created_at).toLocaleDateString('pt-BR')}</span>
              {row.nome_proprietario && <span className="truncate">{row.nome_proprietario}</span>}
              <span>R$ {Number(row.custo_brl).toFixed(2).replace('.', ',')}</span>
              {row.cache_hit_count > 0 && <span>{row.cache_hit_count}x cache</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
