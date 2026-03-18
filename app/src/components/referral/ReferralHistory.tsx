'use client'

import { useState, useMemo } from 'react'
import { useReferrals } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/auth'
import { useReferralsStore } from '@/store/referrals'
import { ReferralCard } from './ReferralCard'
import type { StatusReferral, DirecaoReferral } from '@/lib/supabase/types'

const STATUS_OPTIONS: { value: StatusReferral; label: string; color: string }[] = [
  { value: 'enviada', label: 'Enviada', color: '#9E9E9E' },
  { value: 'aceita', label: 'Aceita', color: '#003DA5' },
  { value: 'em_andamento', label: 'Em Andamento', color: '#FF8C00' },
  { value: 'convertida', label: 'Convertida', color: '#28A745' },
  { value: 'comissao_paga', label: 'Com. Paga', color: '#FFD700' },
  { value: 'recusada', label: 'Recusada', color: '#DC3545' },
  { value: 'expirada', label: 'Expirada', color: '#BDBDBD' },
]

const DIRECAO_OPTIONS: { value: DirecaoReferral | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'recebido', label: 'Recebidos' },
]

const PAGE_SIZE = 20

export function ReferralHistory() {
  const user = useAuthStore((s) => s.user)
  const { referrals, isLoading } = useReferrals(user?.id ?? null)
  const statusFilter = useReferralsStore((s) => s.statusFilter)
  const direcaoFilter = useReferralsStore((s) => s.direcaoFilter)
  const setStatusFilter = useReferralsStore((s) => s.setStatusFilter)
  const setDirecaoFilter = useReferralsStore((s) => s.setDirecaoFilter)

  const [page, setPage] = useState(1)

  // Filter referrals
  const filtered = useMemo(() => {
    let result = referrals

    if (statusFilter.length > 0) {
      result = result.filter((r) => statusFilter.includes(r.status))
    }

    if (direcaoFilter) {
      result = result.filter((r) => r.direcao === direcaoFilter)
    }

    // Check expiration client-side (AC8 fallback)
    const now = new Date()
    result = result.map((r) => {
      if (
        r.prazo_validade &&
        new Date(r.prazo_validade) < now &&
        ['enviada', 'aceita'].includes(r.status)
      ) {
        return { ...r, status: 'expirada' as const }
      }
      return r
    })

    return result
  }, [referrals, statusFilter, direcaoFilter])

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = page < totalPages

  const toggleStatusFilter = (status: StatusReferral) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter((s) => s !== status))
    } else {
      setStatusFilter([...statusFilter, status])
    }
    setPage(1)
  }

  const handleDirecao = (dir: DirecaoReferral | 'todos') => {
    setDirecaoFilter(dir === 'todos' ? null : dir)
    setPage(1)
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      {/* Direction filter */}
      <div className="flex gap-2 mb-3">
        {DIRECAO_OPTIONS.map((opt) => {
          const isActive =
            (opt.value === 'todos' && !direcaoFilter) ||
            opt.value === direcaoFilter
          return (
            <button
              key={opt.value}
              onClick={() => handleDirecao(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#003DA5] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Status filter chips (multi-select) */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = statusFilter.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggleStatusFilter(opt.value)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
              style={
                isActive
                  ? { backgroundColor: opt.color, borderColor: 'transparent' }
                  : undefined
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Referral list */}
      {paged.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          Nenhum referral encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map((referral) => (
            <ReferralCard key={referral.id} referral={referral} />
          ))}
        </div>
      )}

      {/* Load more (cursor-based pagination simulation) */}
      {hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="w-full mt-3 py-2 text-sm text-[#003DA5] font-medium rounded-lg hover:bg-blue-50 transition-colors"
        >
          Carregar mais ({filtered.length - paged.length} restantes)
        </button>
      )}
    </div>
  )
}
