'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChipSelect } from '@/components/lead/ChipSelect'
import { useCreateInformante } from '@/hooks/useInformantes'
import { useInformantesStore } from '@/store/informantes'
import { useAuthStore } from '@/store/auth'
import type { FuncaoInformante } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Chip option definitions
// ---------------------------------------------------------------------------

const FUNCAO_OPTIONS = [
  { value: 'zelador', label: 'Zelador' },
  { value: 'porteiro', label: 'Porteiro' },
  { value: 'gerente_predial', label: 'Gerente' },
  { value: 'comerciante', label: 'Comerciante' },
  { value: 'sindico', label: 'Sindico' },
  { value: 'outro', label: 'Outro' },
]

const QUALIDADE_OPTIONS = [
  { value: 'frio', label: 'Frio', color: '#9CA3AF' },
  { value: 'morno', label: 'Morno', color: '#F97316' },
  { value: 'quente', label: 'Quente', color: '#EF4444' },
]

// ---------------------------------------------------------------------------
// Phone mask utility (same pattern as LeadForm)
// ---------------------------------------------------------------------------

function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function unformatPhone(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

// ---------------------------------------------------------------------------
// InformanteForm
// ---------------------------------------------------------------------------

interface InformanteFormProps {
  edificioId?: string
  edificioNome?: string
  /** Available edificios for multi-select linking */
  availableEdificios?: Array<{ id: string; nome: string }>
  onClose: () => void
  onSuccess?: (informanteId: string) => void
}

export function InformanteForm({
  edificioId,
  edificioNome,
  availableEdificios = [],
  onClose,
  onSuccess,
}: InformanteFormProps) {
  const user = useAuthStore((s) => s.user)
  const closeInformanteForm = useInformantesStore((s) => s.closeInformanteForm)
  const createInformante = useCreateInformante()

  // Required fields
  const [nome, setNome] = useState('')
  const [funcao, setFuncao] = useState<FuncaoInformante | null>(null)
  const [qualidade, setQualidade] = useState<string | null>(null)

  // Optional fields
  const [telefone, setTelefone] = useState('')
  const [notas, setNotas] = useState('')

  // Multi-select edificios
  const [selectedEdificioIds, setSelectedEdificioIds] = useState<string[]>(
    edificioId ? [edificioId] : [],
  )

  const [isSaving, setIsSaving] = useState(false)

  const canSave = nome.trim().length > 0 && funcao !== null && qualidade !== null

  // Build edificio options for multi-select
  const edificioOptions = availableEdificios.map((e) => ({
    value: e.id,
    label: e.nome,
  }))

  const handleEdificioToggle = (id: string) => {
    setSelectedEdificioIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id],
    )
  }

  const handleSave = async () => {
    if (!canSave || !user) return

    setIsSaving(true)
    try {
      const result = await createInformante.mutateAsync({
        consultant_id: user.id,
        nome: nome.trim(),
        funcao: funcao!,
        telefone: unformatPhone(telefone) || undefined,
        qualidade_relacao: qualidade as 'frio' | 'morno' | 'quente',
        notas: notas.trim() || undefined,
        edificio_ids: selectedEdificioIds,
      })

      // Toast notification
      if (typeof window !== 'undefined') {
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: `Informante ${nome.trim()} cadastrado!`,
              type: 'success',
            },
          }),
        )
      }

      closeInformanteForm()
      onSuccess?.(result.id)
      onClose()
    } catch (err) {
      console.error('Error creating informante:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Erro ao cadastrar informante', type: 'error' },
          }),
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    closeInformanteForm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Novo Informante
              </h2>
              {edificioNome && (
                <p className="text-sm text-gray-500">{edificioNome}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center"
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

          {/* ============================================================= */}
          {/* Fields */}
          {/* ============================================================= */}
          <div className="space-y-4 mb-6">
            {/* Nome — required, 48px */}
            <div>
              <Label htmlFor="informante-nome">Nome *</Label>
              <Input
                id="informante-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do informante"
                className="mt-1"
                style={{ height: '48px' }}
                autoFocus
              />
            </div>

            {/* Funcao — chips */}
            <div>
              <Label>Funcao *</Label>
              <ChipSelect
                options={FUNCAO_OPTIONS}
                value={funcao}
                onChange={(v) => setFuncao(v as FuncaoInformante | null)}
                className="mt-2"
              />
            </div>

            {/* Telefone — BR mask */}
            <div>
              <Label htmlFor="informante-telefone">Telefone</Label>
              {/* TODO: pgcrypto encryption — telefone will be encrypted before storage */}
              <Input
                id="informante-telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
                placeholder="(11) XXXXX-XXXX"
                type="tel"
                inputMode="numeric"
                className="mt-1 h-12"
              />
            </div>

            {/* Qualidade relacao — colored chips */}
            <div>
              <Label>Qualidade do relacionamento *</Label>
              <ChipSelect
                options={QUALIDADE_OPTIONS}
                value={qualidade}
                onChange={(v) => setQualidade(v as string | null)}
                className="mt-2"
              />
            </div>

            {/* Multi-select edificios */}
            {edificioOptions.length > 0 && (
              <div>
                <Label>Edificios vinculados</Label>
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                  {edificioOptions.map((opt) => {
                    const isSelected = selectedEdificioIds.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleEdificioToggle(opt.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                              isSelected
                                ? 'bg-[#003DA5] border-[#003DA5] text-white'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && '\u2713'}
                          </span>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <Label htmlFor="informante-notas">Notas</Label>
              <textarea
                id="informante-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observacoes sobre o informante..."
                className="mt-1 w-full h-20 rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>
          </div>

          {/* ============================================================= */}
          {/* Save Button — 56px green */}
          {/* ============================================================= */}
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="w-full text-base font-semibold text-white rounded-xl"
            style={{
              height: '56px',
              backgroundColor: canSave && !isSaving ? '#22C55E' : undefined,
            }}
          >
            {isSaving ? 'Salvando...' : 'Salvar Informante'}
          </Button>
        </div>
      </div>
    </div>
  )
}
