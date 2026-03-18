'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChipSelect } from '@/components/lead/ChipSelect'
import { useCreateAcaoGentileza } from '@/hooks/useInformantes'
import { useAuthStore } from '@/store/auth'
import type { AcaoGentileza } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Tipo chips with icons
// ---------------------------------------------------------------------------

const TIPO_OPTIONS = [
  { value: 'cafe', label: 'Cafe \u2615' },
  { value: 'brinde', label: 'Brinde \uD83C\uDF81' },
  { value: 'agradecimento_escrito', label: 'Agradecimento \u2709\uFE0F' },
  { value: 'presente', label: 'Presente \uD83D\uDC9D' },
  { value: 'outro', label: 'Outro' },
]

// ---------------------------------------------------------------------------
// Utility: format currency input
// ---------------------------------------------------------------------------

function formatCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const cents = parseInt(digits, 10)
  return (cents / 100).toFixed(2).replace('.', ',')
}

function parseCurrency(formatted: string): number {
  if (!formatted) return 0
  const cleaned = formatted.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// ---------------------------------------------------------------------------
// GentilezaForm — add a gentileza action to an informante
// ---------------------------------------------------------------------------

interface GentilezaFormProps {
  informanteId: string
  informanteNome: string
  onClose: () => void
  onSuccess?: () => void
}

export function GentilezaForm({
  informanteId,
  informanteNome,
  onClose,
  onSuccess,
}: GentilezaFormProps) {
  const user = useAuthStore((s) => s.user)
  const createGentileza = useCreateAcaoGentileza()

  const [tipo, setTipo] = useState<AcaoGentileza['tipo'] | null>(null)
  const [descricao, setDescricao] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [dataAcao, setDataAcao] = useState(
    new Date().toISOString().split('T')[0],
  )

  const [isSaving, setIsSaving] = useState(false)

  const canSave = tipo !== null

  const handleSave = async () => {
    if (!canSave || !user) return

    setIsSaving(true)
    try {
      await createGentileza.mutateAsync({
        informante_id: informanteId,
        consultant_id: user.id,
        tipo: tipo!,
        descricao: descricao.trim() || undefined,
        valor: parseCurrency(valorStr),
        data_acao: dataAcao,
      })

      // Toast notification
      if (typeof window !== 'undefined') {
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: `Gentileza registrada para ${informanteNome}!`,
              type: 'success',
            },
          }),
        )
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error creating acao gentileza:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: 'Erro ao registrar gentileza',
              type: 'error',
            },
          }),
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                + Gentileza
              </h2>
              <p className="text-sm text-gray-500">{informanteNome}</p>
            </div>
            <button
              onClick={onClose}
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

          <div className="space-y-4 mb-6">
            {/* Tipo — chips */}
            <div>
              <Label>Tipo *</Label>
              <ChipSelect
                options={TIPO_OPTIONS}
                value={tipo}
                onChange={(v) => setTipo(v as AcaoGentileza['tipo'] | null)}
                className="mt-2"
              />
            </div>

            {/* Descricao */}
            <div>
              <Label htmlFor="gentileza-descricao">Descricao</Label>
              <textarea
                id="gentileza-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva a acao de gentileza..."
                className="mt-1 w-full h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />
            </div>

            {/* Valor R$ — optional, numeric */}
            <div>
              <Label htmlFor="gentileza-valor">Valor R$ (opcional)</Label>
              <Input
                id="gentileza-valor"
                value={valorStr}
                onChange={(e) => setValorStr(formatCurrency(e.target.value))}
                placeholder="0,00"
                inputMode="numeric"
                className="mt-1 h-12"
              />
            </div>

            {/* Data — default today */}
            <div>
              <Label htmlFor="gentileza-data">Data</Label>
              <Input
                id="gentileza-data"
                type="date"
                value={dataAcao}
                onChange={(e) => setDataAcao(e.target.value)}
                className="mt-1 h-12"
              />
            </div>
          </div>

          {/* Save Button — 56px green */}
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="w-full text-base font-semibold text-white rounded-xl"
            style={{
              height: '56px',
              backgroundColor: canSave && !isSaving ? '#22C55E' : undefined,
            }}
          >
            {isSaving ? 'Salvando...' : 'Registrar Gentileza'}
          </Button>
        </div>
      </div>
    </div>
  )
}
