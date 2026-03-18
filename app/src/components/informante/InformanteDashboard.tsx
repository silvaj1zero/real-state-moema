'use client'

import { useMemo } from 'react'
import { useInformantesByConsultant } from '@/hooks/useInformantes'
import { useInformanteReminders } from '@/hooks/useInformanteReminders'
import { useInformantesStore } from '@/store/informantes'
import { useAuthStore } from '@/store/auth'
import type { InformanteWithEdificios } from '@/hooks/useInformantes'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const QUALIDADE_COLORS: Record<string, string> = {
  frio: '#9CA3AF',
  morno: '#F97316',
  quente: '#EF4444',
}

const QUALIDADE_LABELS: Record<string, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// ---------------------------------------------------------------------------
// InformanteDashboard — summary widget
// ---------------------------------------------------------------------------

interface InformanteDashboardProps {
  className?: string
  /** Override consultant settings for reminder days */
  reminderDays?: number
  /** Map of informanteId -> last gentileza date ISO string */
  lastGentilezaDates?: Record<string, string>
}

export function InformanteDashboard({
  className,
  reminderDays = 15,
  lastGentilezaDates = {},
}: InformanteDashboardProps) {
  const user = useAuthStore((s) => s.user)
  const selectInformante = useInformantesStore((s) => s.selectInformante)
  const { informantes, isLoading } = useInformantesByConsultant(user?.id ?? null)

  const { informantesNeedingContact } = useInformanteReminders({
    informantes,
    reminderDays,
    lastGentilezaDates,
  })

  // Compute stats
  const stats = useMemo(() => {
    const byQualidade = { frio: 0, morno: 0, quente: 0 }
    let totalInvestido = 0
    let totalComissoes = 0

    for (const inf of informantes) {
      if (inf.qualidade_relacao in byQualidade) {
        byQualidade[inf.qualidade_relacao as keyof typeof byQualidade]++
      }
      totalInvestido += inf.total_investido_gentileza
      totalComissoes += inf.comissao_devida
    }

    return {
      total: informantes.length,
      byQualidade,
      totalInvestido,
      totalComissoes,
      roi:
        totalInvestido > 0
          ? ((totalComissoes - totalInvestido) / totalInvestido) * 100
          : 0,
    }
  }, [informantes])

  // Top 3 informantes by leads generated (approximation: use comissao_devida as proxy)
  // In a full implementation, this would count actual leads per informante
  const top3 = useMemo(() => {
    return [...informantes]
      .sort((a, b) => b.comissao_devida - a.comissao_devida)
      .slice(0, 3)
  }, [informantes])

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* ============================================================= */}
      {/* Summary cards row */}
      {/* ============================================================= */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total informantes */}
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide block">
            Total informantes
          </span>
          <span className="text-2xl font-bold text-gray-900">
            {stats.total}
          </span>
        </div>

        {/* By qualidade */}
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1.5">
            Por qualidade
          </span>
          <div className="flex items-center gap-3">
            {(['frio', 'morno', 'quente'] as const).map((q) => (
              <div key={q} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: QUALIDADE_COLORS[q] }}
                />
                <span className="text-xs font-semibold text-gray-700">
                  {stats.byQualidade[q]}
                </span>
                <span className="text-[9px] text-gray-400">
                  {QUALIDADE_LABELS[q]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* ROI: Investido vs Comissoes */}
      {/* ============================================================= */}
      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-2">
          Gentileza vs Comissoes (ROI)
        </span>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-gray-400 block">Investido</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrencyBR(stats.totalInvestido)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block">Comissoes</span>
            <span className="text-sm font-bold text-green-600">
              {formatCurrencyBR(stats.totalComissoes)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block">ROI</span>
            <span
              className={cn(
                'text-sm font-bold',
                stats.roi >= 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {stats.roi >= 0 ? '+' : ''}
              {stats.roi.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Top 3 informantes */}
      {/* ============================================================= */}
      {top3.length > 0 && (
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide block mb-2">
            Top informantes (comissao)
          </span>
          <div className="space-y-1.5">
            {top3.map((inf, i) => (
              <button
                key={inf.id}
                onClick={() => selectInformante(inf.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-xs font-bold text-gray-400 w-4">
                  {i + 1}.
                </span>
                <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                  {inf.nome}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium"
                  style={{
                    backgroundColor: QUALIDADE_COLORS[inf.qualidade_relacao],
                  }}
                >
                  {QUALIDADE_LABELS[inf.qualidade_relacao]}
                </span>
                <span className="text-[10px] font-medium text-green-600 shrink-0">
                  {formatCurrencyBR(inf.comissao_devida)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Alert: Sem contato ha >15 dias */}
      {/* ============================================================= */}
      {informantesNeedingContact.length > 0 && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500 text-base">&#9888;</span>
            <span className="text-xs font-semibold text-red-800">
              Sem contato ha &gt;{reminderDays} dias
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-red-200 text-red-800 rounded-full font-semibold ml-auto">
              {informantesNeedingContact.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {informantesNeedingContact.slice(0, 5).map((reminder) => (
              <button
                key={reminder.informante.id}
                onClick={() => selectInformante(reminder.informante.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-red-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                  {reminder.informante.nome}
                </span>
                <span className="text-[10px] text-red-600 font-medium shrink-0">
                  {reminder.daysWithoutContact} dias
                </span>
              </button>
            ))}
            {informantesNeedingContact.length > 5 && (
              <p className="text-[10px] text-red-500 text-center">
                e mais {informantesNeedingContact.length - 5} informantes...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
