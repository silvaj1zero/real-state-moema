'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  EdificioWithQualificacao,
  StatusVarredura,
  TipologiaEdificio,
  PadraoEdificio,
  AberturaCorretores,
} from '@/lib/supabase/types'

interface BuildingCardProps {
  building: EdificioWithQualificacao
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const STATUS_LABELS: Record<StatusVarredura, string> = {
  nao_visitado: 'Não Visitado',
  mapeado: 'Mapeado',
  em_prospeccao: 'Em Prospecção',
  concluido: 'Concluído',
}

const STATUS_COLORS: Record<StatusVarredura, string> = {
  nao_visitado: 'bg-gray-400',
  mapeado: 'bg-blue-500',
  em_prospeccao: 'bg-yellow-500',
  concluido: 'bg-green-500',
}

const TIPOLOGIA_LABELS: Record<TipologiaEdificio, string> = {
  residencial_vertical: 'Residencial',
  residencial_horizontal: 'Residencial (H)',
  comercial: 'Comercial',
  misto: 'Misto',
  outro: 'Outro',
}

const PADRAO_LABELS: Record<PadraoEdificio, string> = {
  popular: 'Popular',
  medio: 'Médio',
  medio_alto: 'Médio-Alto',
  alto: 'Alto',
  luxo: 'Luxo',
}

const ABERTURA_LABELS: Record<AberturaCorretores, string> = {
  zelador_amigavel: 'Zelador Amigável',
  rigido: 'Rígido',
  exige_autorizacao: 'Exige Autorização',
  desconhecido: 'Desconhecido',
}

export function BuildingCard({ building, isOpen, onClose, onUpdate }: BuildingCardProps) {
  const qual = building.edificios_qualificacoes?.[0]
  const [isEditing, setIsEditing] = useState(false)
  const [editStatus, setEditStatus] = useState<StatusVarredura>(qual?.status_varredura || 'nao_visitado')
  const [editAbertura, setEditAbertura] = useState<AberturaCorretores>(qual?.abertura_corretores || 'desconhecido')
  const [editNotas, setEditNotas] = useState(qual?.notas || '')
  const [editOportunidades, setEditOportunidades] = useState(qual?.oportunidades_count || 0)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!qual) return
    setIsSaving(true)
    try {
      const supabase = createClient()
      await supabase
        .from('edificios_qualificacoes')
        .update({
          status_varredura: editStatus,
          abertura_corretores: editAbertura,
          notas: editNotas || null,
          oportunidades_count: editOportunidades,
        })
        .eq('id', qual.id)

      // Mark as verified if seed
      if (!building.verificado) {
        await supabase
          .from('edificios')
          .update({ verificado: true })
          .eq('id', building.id)
      }

      setIsEditing(false)
      onUpdate()
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="absolute bottom-14 left-0 right-0 z-20 animate-in slide-in-from-bottom duration-200">
      <div className="bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{building.nome}</h3>
                {!building.verificado && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-dashed border-gray-300">
                    auto
                  </span>
                )}
                {building.verificado && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#22C55E" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="9 12 11.5 14.5 16 9.5" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{building.endereco}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center -mr-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Status badge */}
          {qual && (
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[qual.status_varredura]}`} />
              <span className="text-sm font-medium">{STATUS_LABELS[qual.status_varredura]}</span>
              {qual.is_fisbo_detected && (
                <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                  FISBO
                </span>
              )}
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Tipologia</span>
              <p className="text-sm font-medium mt-0.5">
                {qual?.tipologia ? TIPOLOGIA_LABELS[qual.tipologia] : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Padrão</span>
              <p className="text-sm font-medium mt-0.5">
                {qual?.padrao ? PADRAO_LABELS[qual.padrao] : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Abertura</span>
              {isEditing ? (
                <select
                  value={editAbertura}
                  onChange={(e) => setEditAbertura(e.target.value as AberturaCorretores)}
                  className="w-full text-sm mt-0.5 bg-white rounded border p-1"
                >
                  {Object.entries(ABERTURA_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-medium mt-0.5">
                  {qual ? ABERTURA_LABELS[qual.abertura_corretores] : '—'}
                </p>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Oportunidades</span>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={() => setEditOportunidades(Math.max(0, editOportunidades - 1))}
                    className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-sm"
                  >-</button>
                  <span className="text-sm font-medium">{editOportunidades}</span>
                  <button
                    onClick={() => setEditOportunidades(editOportunidades + 1)}
                    className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-sm"
                  >+</button>
                </div>
              ) : (
                <p className="text-sm font-medium mt-0.5">{qual?.oportunidades_count || 0}</p>
              )}
            </div>
          </div>

          {/* Status edit */}
          {isEditing && (
            <div className="mb-4">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Status</span>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(STATUS_LABELS) as StatusVarredura[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className={`h-8 px-3 rounded-full text-xs font-medium border ${
                      editStatus === s
                        ? `${STATUS_COLORS[s]} text-white border-transparent`
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {isEditing ? (
            <textarea
              value={editNotas}
              onChange={(e) => setEditNotas(e.target.value)}
              placeholder="Notas de campo..."
              className="w-full text-sm border rounded-lg p-3 mb-4 resize-none h-20"
            />
          ) : qual?.notas ? (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Notas</span>
              <p className="text-sm mt-0.5">{qual.notas}</p>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-11 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 h-11 text-sm font-medium text-white bg-[#003DA5] rounded-lg"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 h-11 text-sm font-medium text-white bg-[#003DA5] rounded-lg"
              >
                Editar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
