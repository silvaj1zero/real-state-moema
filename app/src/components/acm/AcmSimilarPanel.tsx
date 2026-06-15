'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Target } from 'lucide-react'
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import type { AcmRpcRow } from '@/lib/acm/adapter'
import { toAcmComparables } from '@/lib/acm/adapter'
import { selectMostSimilar } from '@/lib/acm/similar'
import { formatBRL } from '@/lib/format'

interface AcmSimilarPanelProps {
  comparaveis: ComparavelNoRaio[]
  /** Raio efetivo em metros (para normalizar a proximidade). */
  raio: number
}

/**
 * AC4 — "Mais parecidos": informa a área do imóvel-alvo e ranqueia os comparáveis
 * por aderência (área + proximidade), com valor indicativo pela mediana de R$/m².
 * Usa a lib de metodologia (Story 8.2) — fonte única do cálculo.
 */
export function AcmSimilarPanel({ comparaveis, raio }: AcmSimilarPanelProps) {
  const [areaInput, setAreaInput] = useState('')
  const [topN, setTopN] = useState(10)

  const targetArea = Number(areaInput)
  const ativo = Number.isFinite(targetArea) && targetArea > 0

  const result = useMemo(() => {
    if (!ativo) return null
    const rows = comparaveis as unknown as AcmRpcRow[]
    return selectMostSimilar(
      { areaConstruida: targetArea, areaTerreno: 0 },
      toAcmComparables(rows),
      topN,
      raio,
    )
  }, [ativo, comparaveis, targetArea, topN, raio])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-[#003DA5]/5">
        <Sparkles className="size-4 text-[#003DA5]" />
        <h3 className="text-xs font-semibold text-gray-900">Comparáveis mais parecidos</h3>
      </div>

      <div className="p-3 space-y-3">
        {/* Input do alvo */}
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
              Área do imóvel-alvo (m²)
            </span>
            <div className="relative">
              <Target className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                placeholder="ex.: 113"
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30"
              />
            </div>
          </label>
          <label className="w-20">
            <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
              Top N
            </span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30"
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        {!ativo && (
          <p className="text-[11px] text-gray-400">
            Informe a área construída do imóvel a precificar para ranquear os comparáveis
            por semelhança (área + proximidade) e estimar o valor.
          </p>
        )}

        {result && result.top.length > 0 && (
          <>
            {/* Valor indicativo */}
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-[10px] uppercase tracking-wide text-green-700 mb-0.5">
                Valor indicativo ({targetArea.toLocaleString('pt-BR')} m²)
              </p>
              <p className="text-lg font-bold text-green-800">
                {formatBRL(result.valorIndicativo)}
              </p>
              <p className="text-[11px] text-green-700/80 mt-0.5">
                mediana {formatBRL(result.medianaPrecoM2)}/m² dos {result.top.length} mais
                parecidos (de {result.totalConsiderados} comparáveis)
              </p>
            </div>

            {/* Lista Top N */}
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-400 text-left">
                    <th className="font-medium px-1 py-1">#</th>
                    <th className="font-medium px-1 py-1">Endereço</th>
                    <th className="font-medium px-1 py-1 text-right">Área</th>
                    <th className="font-medium px-1 py-1 text-right">R$/m²</th>
                    <th className="font-medium px-1 py-1 text-right">Dist.</th>
                    <th className="font-medium px-1 py-1 text-right">Ader.</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top.map((c, i) => (
                    <tr key={`${c.endereco}-${i}`} className="border-t border-gray-100">
                      <td className="px-1 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-1 py-1.5 text-gray-800 truncate max-w-[140px]">{c.endereco}</td>
                      <td className="px-1 py-1.5 text-right text-gray-600">{c.areaConstruida.toLocaleString('pt-BR')} m²</td>
                      <td className="px-1 py-1.5 text-right font-medium text-gray-900">{formatBRL(c.precoM2)}</td>
                      <td className="px-1 py-1.5 text-right text-gray-500">{c.distancia != null ? `${Math.round(c.distancia)}m` : '—'}</td>
                      <td className="px-1 py-1.5 text-right text-[#003DA5] font-medium">{Math.round(c.aderencia * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400">
              Ordenado por aderência (área 50% · terreno 20% · proximidade 30%). Programa
              (dorms/suítes/vagas) ainda não disponível nos comparáveis ITBI — área é o proxy.
            </p>
          </>
        )}

        {result && result.top.length === 0 && (
          <p className="text-[11px] text-gray-400">Nenhum comparável no raio atual.</p>
        )}
      </div>
    </div>
  )
}
