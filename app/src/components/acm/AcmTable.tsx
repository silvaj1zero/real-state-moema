'use client'

import type { ComparavelNoRaio } from '@/lib/supabase/types'
import type { AcmFilterType } from '@/store/acm'
import { Eye, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

const FONTE_COLORS: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-700',
  scraping: 'bg-orange-100 text-orange-700',
  captei: 'bg-purple-100 text-purple-700',
  cartorio: 'bg-green-100 text-green-700',
}

interface AcmTableProps {
  comparaveis: ComparavelNoRaio[]
  filterType: AcmFilterType
}

export function AcmTable({ comparaveis, filterType }: AcmTableProps) {
  const filtered =
    filterType === 'todos'
      ? comparaveis
      : filterType === 'venda_real'
        ? comparaveis.filter((c) => c.is_venda_real)
        : comparaveis.filter((c) => !c.is_venda_real)

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">Nenhum comparável encontrado.</p>
        {comparaveis.length < 3 && (
          <p className="text-xs mt-2 text-gray-500">
            Adicione mais comparáveis para uma análise mais precisa.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-2 px-4 font-medium">Endereço</th>
            <th className="text-right py-2 px-2 font-medium">Área m²</th>
            <th className="text-right py-2 px-2 font-medium">Preço</th>
            <th className="text-right py-2 px-2 font-medium">R$/m²</th>
            <th className="text-center py-2 px-2 font-medium">Tipo</th>
            <th className="text-center py-2 px-2 font-medium">Fonte</th>
            <th className="text-right py-2 px-4 font-medium">Dist.</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr
              key={c.comparavel_id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {/* Endereço */}
              <td className="py-2.5 px-4 max-w-[160px]">
                <span className="truncate block" title={c.endereco}>
                  {c.endereco.length > 30
                    ? `${c.endereco.slice(0, 30)}...`
                    : c.endereco}
                </span>
              </td>

              {/* Área m² */}
              <td className="py-2.5 px-2 text-right text-gray-700">
                {c.area_m2.toFixed(1)}
              </td>

              {/* Preço */}
              <td className="py-2.5 px-2 text-right text-gray-900 font-medium">
                {formatBRL(c.preco)}
              </td>

              {/* Preço/m² */}
              <td className="py-2.5 px-2 text-right text-gray-700">
                {formatBRL(c.preco_m2)}
              </td>

              {/* Tipo: Anúncio / Venda Real */}
              <td className="py-2.5 px-2 text-center">
                {c.is_venda_real ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                    <Handshake className="size-3" />
                    Venda Real
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                    <Eye className="size-3" />
                    Anúncio
                  </span>
                )}
              </td>

              {/* Fonte */}
              <td className="py-2.5 px-2 text-center">
                <span
                  className={cn(
                    'inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize',
                    FONTE_COLORS[c.fonte] || 'bg-gray-100 text-gray-600',
                  )}
                >
                  {c.fonte}
                </span>
              </td>

              {/* Distância */}
              <td className="py-2.5 px-4 text-right text-gray-500">
                {c.distancia_m.toFixed(1)}m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
