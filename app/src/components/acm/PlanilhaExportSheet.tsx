'use client'

/**
 * Story 9.2 — Sheet de geração da planilha XLSX canônica (7 abas).
 *
 * Coleta o alvo mínimo (área construída/terreno + tipo de produto), roda
 * `computeLaudo` (8.2) para a ordenação por aderência, monta o `PlanilhaModel`
 * puro e gera o .xlsx via exceljs (`buildPlanilhaWorkbook`). Geração 100%
 * cliente. Degrada graciosamente (campos NULL → células vazias; abas sem dado →
 * "Nenhum registro no raio").
 */
import { useState } from 'react'
import { X, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import { toAcmComparables, type AcmRpcRow } from '@/lib/acm/adapter'
import { computeLaudo, type EstadoConservacao } from '@/lib/acm/methodology'
import { buildPlanilhaModel, type PlanilhaPropertyType } from '@/lib/acm/xlsx/planilhaModel'
import { buildPlanilhaWorkbook } from '@/lib/acm/xlsx/buildPlanilhaWorkbook'
import {
  buildComputeOptions,
  ESTADO_CONSERVACAO_OPCOES,
  FIPEZAP_REFERENCIA_LABEL,
} from './computeOptions'

interface PlanilhaExportSheetProps {
  open: boolean
  onClose: () => void
  comparaveis: ComparavelNoRaio[]
  enderecoAlvo: string
  radiusMeters: number
}

function numOrUndef(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? undefined : n
}

export function PlanilhaExportSheet({ open, onClose, comparaveis, enderecoAlvo, radiusMeters }: PlanilhaExportSheetProps) {
  const [endereco, setEndereco] = useState(enderecoAlvo)
  const [areaConstruida, setAreaConstruida] = useState('')
  const [areaTerreno, setAreaTerreno] = useState('')
  const [propertyType, setPropertyType] = useState<PlanilhaPropertyType>('casa')
  // Story 9.23 — mecanismos v5
  const [homogeneizacaoAtiva, setHomogeneizacaoAtiva] = useState(true)
  const [estado, setEstado] = useState<EstadoConservacao | ''>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleGenerate() {
    setError(null)
    const areaC = numOrUndef(areaConstruida)
    const areaT = numOrUndef(areaTerreno) ?? 0
    if (areaC == null || areaC <= 0) {
      setError('Informe a área construída do alvo.')
      return
    }
    setIsGenerating(true)
    try {
      const acmComps = toAcmComparables(comparaveis as unknown as AcmRpcRow[])
      const computation = computeLaudo({
        ...buildComputeOptions({
          areaConstruida: areaC,
          areaTerreno: areaT,
          endereco: endereco.trim() || enderecoAlvo,
          homogeneizacaoAtiva,
          estadoConservacao: estado || null,
          // AC4 — tipologia do alvo alimenta o gate R5 (casa/apartamento ⊂ TipologiaTipo).
          propertyType,
        }),
        comparaveis: acmComps,
        raio: radiusMeters,
      })
      const model = buildPlanilhaModel(computation, comparaveis, {
        enderecoAlvo: endereco,
        propertyType,
        geradoEm: new Date().toLocaleDateString('pt-BR'),
      })
      const buf = await buildPlanilhaWorkbook(model)
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `acm-planilha-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      console.error('Falha ao gerar planilha ACM:', e)
      setError('Não foi possível gerar a planilha. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const field = 'flex-1'
  const label = 'block text-[10px] uppercase tracking-wide text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={isGenerating ? undefined : onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <FileSpreadsheet className="size-4 text-[#003DA5]" />
            Gerar Planilha (XLSX)
          </h2>
          <button onClick={onClose} disabled={isGenerating} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-40">
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <span className={label}>Endereço do imóvel-alvo</span>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua Alvo" />
          </div>
          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Área construída (m²) *</span>
              <Input type="number" value={areaConstruida} onChange={(e) => setAreaConstruida(e.target.value)} placeholder="113" />
            </div>
            <div className={field}>
              <span className={label}>Área terreno (m²)</span>
              <Input type="number" value={areaTerreno} onChange={(e) => setAreaTerreno(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <span className={label}>Tipo de produto</span>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PlanilhaPropertyType)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="casa">Casa / terreno (inclui aba Terrenos)</option>
              <option value="apartamento">Apartamento (sem aba Terrenos)</option>
            </select>
          </div>

          {/* Story 9.23 — estado A–F (opcional) + homogeneização FipeZap */}
          <div>
            <span className={label}>Estado do imóvel (régua A–F)</span>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoConservacao | '')}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Não informar (faixa conservadora)</option>
              {ESTADO_CONSERVACAO_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={homogeneizacaoAtiva}
              onChange={(e) => setHomogeneizacaoAtiva(e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            Homogeneizar fechamentos a valor presente ({FIPEZAP_REFERENCIA_LABEL})
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1" /> Gerando…
              </>
            ) : (
              'Gerar planilha (7 abas)'
            )}
          </Button>
          <p className="text-[10px] text-gray-400 leading-snug">
            Abas: Leia-me · Top 3/5/10 · Todos · Ofertas ativas · Terrenos. Colunas da metodologia
            (S/V/D, SQL, terreno) aparecem vazias até o sink ITBI ser mapeado (Story 9.4).
          </p>
        </div>
      </div>
    </div>
  )
}
