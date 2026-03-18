'use client'

import { useState } from 'react'
import { useAcoesGentileza } from '@/hooks/useInformantes'
import { useLeadsByEdificio } from '@/hooks/useLeads'
import { useInformantesStore } from '@/store/informantes'
import { GentilezaForm } from '@/components/informante/GentilezaForm'
import { ComissaoTracker } from '@/components/informante/ComissaoTracker'
import type { InformanteWithEdificios } from '@/hooks/useInformantes'
import type { FuncaoInformante, AcaoGentileza } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Color/label maps
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

const FUNCAO_LABELS: Record<FuncaoInformante, string> = {
  zelador: 'Zelador',
  porteiro: 'Porteiro',
  gerente_predial: 'Gerente',
  comerciante: 'Comerciante',
  sindico: 'Sindico',
  outro: 'Outro',
}

const TIPO_ICONS: Record<AcaoGentileza['tipo'], string> = {
  cafe: '\u2615',
  brinde: '\uD83C\uDF81',
  agradecimento_escrito: '\u2709\uFE0F',
  presente: '\uD83D\uDC9D',
  outro: '\uD83D\uDD39',
}

const TIPO_LABELS: Record<AcaoGentileza['tipo'], string> = {
  cafe: 'Cafe',
  brinde: 'Brinde',
  agradecimento_escrito: 'Agradecimento',
  presente: 'Presente',
  outro: 'Outro',
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// ---------------------------------------------------------------------------
// InformanteDetail — full detail view
// ---------------------------------------------------------------------------

interface InformanteDetailProps {
  informante: InformanteWithEdificios
  onClose: () => void
}

export function InformanteDetail({ informante, onClose }: InformanteDetailProps) {
  const selectInformante = useInformantesStore((s) => s.selectInformante)
  const { acoes, isLoading: isLoadingAcoes } = useAcoesGentileza(informante.id)
  const [showGentilezaForm, setShowGentilezaForm] = useState(false)

  // Fetch leads where informante_id = this informante
  // We need at least one edificio to query leads; use first linked building
  const firstEdificioId = informante.informantes_edificios?.[0]?.edificio_id ?? null
  const { leads } = useLeadsByEdificio(firstEdificioId)
  const informanteLeads = leads.filter((l) => l.informante_id === informante.id)

  const handleClose = () => {
    selectInformante(null)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
        <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl z-10">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          <div className="px-4 pb-6">
            {/* ============================================================= */}
            {/* Header */}
            {/* ============================================================= */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  {informante.nome}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {FUNCAO_LABELS[informante.funcao]}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{
                      backgroundColor:
                        QUALIDADE_COLORS[informante.qualidade_relacao],
                    }}
                  >
                    {QUALIDADE_LABELS[informante.qualidade_relacao]}
                  </span>
                </div>
                {informante.telefone_encrypted && (
                  <p className="text-sm text-gray-500 mt-1">
                    {/* TODO: pgcrypto — decrypt for display */}
                    Tel: {informante.telefone_encrypted}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center shrink-0"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Linked edificios */}
            {informante.informantes_edificios?.length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                  Edificios vinculados
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {informante.informantes_edificios.map((ie) => (
                    <span
                      key={ie.edificio_id}
                      className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700"
                    >
                      {ie.edificios?.nome || ie.edificio_id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {informante.notas && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{informante.notas}</p>
              </div>
            )}

            {/* ============================================================= */}
            {/* Phase B: Comissao Tracker */}
            {/* ============================================================= */}
            <ComissaoTracker informante={informante} />

            {/* ============================================================= */}
            {/* Section: Marketing de Gentileza */}
            {/* ============================================================= */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900">
                  Marketing de Gentileza
                </span>
                <button
                  onClick={() => setShowGentilezaForm(true)}
                  className="text-xs font-medium text-white px-3 py-1.5 rounded-full bg-[#003DA5] hover:bg-[#002d7a] transition-colors"
                >
                  + Gentileza
                </button>
              </div>

              {/* Total investido */}
              <div className="mb-3 p-2 bg-green-50 rounded-lg">
                <span className="text-[10px] text-green-600 uppercase tracking-wide font-medium">
                  Total investido
                </span>
                <p className="text-sm font-bold text-green-800">
                  {formatCurrencyBR(informante.total_investido_gentileza)}
                </p>
              </div>

              {/* Acoes list */}
              {isLoadingAcoes ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-100 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : acoes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhuma acao de gentileza registrada
                </p>
              ) : (
                <div className="space-y-2">
                  {acoes.map((acao) => (
                    <div
                      key={acao.id}
                      className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg"
                    >
                      {/* Tipo icon */}
                      <span className="text-lg shrink-0 mt-0.5">
                        {TIPO_ICONS[acao.tipo]}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-900">
                            {TIPO_LABELS[acao.tipo]}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDate(acao.data_acao)}
                          </span>
                        </div>
                        {acao.descricao && (
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {acao.descricao}
                          </p>
                        )}
                        {acao.valor > 0 && (
                          <span className="text-[10px] font-medium text-green-600">
                            {formatCurrencyBR(acao.valor)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* Section: Leads Gerados */}
            {/* ============================================================= */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900">
                  Leads Gerados
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-semibold">
                  {informanteLeads.length}
                </span>
              </div>

              {informanteLeads.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhum lead gerado por este informante
                </p>
              ) : (
                <div className="space-y-1.5">
                  {informanteLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg bg-gray-50',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate block">
                          {lead.nome}
                        </span>
                        {lead.unidade && (
                          <span className="text-[10px] text-gray-400">
                            {lead.unidade}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 shrink-0">
                        {lead.etapa_funil}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gentileza Form overlay */}
      {showGentilezaForm && (
        <GentilezaForm
          informanteId={informante.id}
          informanteNome={informante.nome}
          onClose={() => setShowGentilezaForm(false)}
        />
      )}
    </>
  )
}
