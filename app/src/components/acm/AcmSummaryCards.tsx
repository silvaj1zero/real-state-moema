'use client'

import type { AcmCalculations } from '@/hooks/useAcm'
import { TrendingUp, TrendingDown, BarChart3, Hash } from 'lucide-react'

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

interface AcmSummaryCardsProps {
  stats: AcmCalculations
}

export function AcmSummaryCards({ stats }: AcmSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Média Preço/m² */}
      <div className="bg-white rounded-xl p-3 border-l-4 border-l-[#003DA5] shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
          Média Preço/m²
        </p>
        <p className="text-base font-bold text-gray-900">
          {stats.totalComparaveis > 0
            ? `${formatBRL(stats.mediaPrecoM2)}/m²`
            : '—'}
        </p>
      </div>

      {/* Mediana Preço/m² */}
      <div className="bg-white rounded-xl p-3 border-l-4 border-l-green-500 shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
          Mediana Preço/m²
        </p>
        <p className="text-base font-bold text-gray-900">
          {stats.totalComparaveis > 0
            ? `${formatBRL(stats.medianaPrecoM2)}/m²`
            : '—'}
        </p>
      </div>

      {/* Tendência */}
      <div className="bg-white rounded-xl p-3 border-l-4 border-l-yellow-500 shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
          Tendência
        </p>
        <div className="flex items-center gap-1">
          {stats.tendenciaPercent !== null ? (
            <>
              {stats.tendenciaPercent >= 0 ? (
                <TrendingUp className="size-4 text-green-500" />
              ) : (
                <TrendingDown className="size-4 text-red-500" />
              )}
              <span
                className={`text-base font-bold ${
                  stats.tendenciaPercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stats.tendenciaPercent >= 0 ? '+' : ''}
                {stats.tendenciaPercent.toFixed(1)}%
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <BarChart3 className="size-4" />
              Dados insuficientes
            </span>
          )}
        </div>
      </div>

      {/* Total Comparáveis */}
      <div className="bg-white rounded-xl p-3 border-l-4 border-l-purple-500 shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
          Total Comparáveis
        </p>
        <div className="flex items-center gap-1">
          <Hash className="size-4 text-purple-500" />
          <span className="text-base font-bold text-gray-900">
            {stats.totalComparaveis}
          </span>
        </div>
        {stats.totalComparaveis > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {stats.countManual} manual | {stats.countScraping} scraping
          </p>
        )}
      </div>
    </div>
  )
}
