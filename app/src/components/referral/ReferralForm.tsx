'use client'

import { useState } from 'react'
import { useCreateReferral } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/auth'
import { useReferralsStore } from '@/store/referrals'
import { X } from 'lucide-react'
import type { DirecaoReferral } from '@/lib/supabase/types'

const DIRECAO_OPTIONS: { value: DirecaoReferral; label: string }[] = [
  { value: 'enviado', label: 'Enviar' },
  { value: 'recebido', label: 'Receber' },
]

export function ReferralForm() {
  const user = useAuthStore((s) => s.user)
  const parceiroNome = useReferralsStore((s) => s.referralFormParceiroNome)
  const parceiroFranquia = useReferralsStore((s) => s.referralFormParceiroFranquia)
  const closeReferralForm = useReferralsStore((s) => s.closeReferralForm)
  const createReferral = useCreateReferral()

  const [direcao, setDirecao] = useState<DirecaoReferral>('enviado')
  const [clientePerfil, setClientePerfil] = useState('')
  const [tipologia, setTipologia] = useState('')
  const [precoMin, setPrecoMin] = useState('')
  const [precoMax, setPrecoMax] = useState('')
  const [regiaoDesejada, setRegiaoDesejada] = useState('')
  const [prazoValidade, setPrazoValidade] = useState('')
  const [notas, setNotas] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const canSave = parceiroNome != null && parceiroNome.trim().length > 0

  const formatCurrency = (value: string): string => {
    const num = value.replace(/\D/g, '')
    if (!num) return ''
    const cents = parseInt(num, 10)
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const parseCurrency = (formatted: string): number | undefined => {
    const num = formatted.replace(/\D/g, '')
    if (!num) return undefined
    return parseInt(num, 10) / 100
  }

  const handleSave = async () => {
    if (!canSave || !user || !parceiroNome) return
    setIsSaving(true)

    try {
      await createReferral.mutateAsync({
        consultant_id: user.id,
        direcao,
        parceiro_nome: parceiroNome,
        parceiro_franquia: parceiroFranquia || undefined,
        cliente_perfil: clientePerfil.trim() || undefined,
        tipologia_desejada: tipologia.trim() || undefined,
        faixa_preco_min: parseCurrency(precoMin),
        faixa_preco_max: parseCurrency(precoMax),
        regiao_desejada: regiaoDesejada.trim() || undefined,
        prazo_validade: prazoValidade || undefined,
        notas: notas.trim() || undefined,
      })

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: `Referral para ${parceiroNome} criado!`,
            type: 'success',
          },
        }),
      )

      if (navigator.vibrate) navigator.vibrate(50)
      closeReferralForm()
    } catch (err) {
      console.error('Error creating referral:', err)
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: 'Erro ao criar referral', type: 'error' },
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Novo Referral</h2>
              <p className="text-sm text-gray-500">
                {parceiroNome}
                {parceiroFranquia ? ` — ${parceiroFranquia}` : ''}
              </p>
            </div>
            <button
              onClick={closeReferralForm}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Direction chips */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-2 block">Direção</label>
            <div className="flex gap-2">
              {DIRECAO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDirecao(opt.value)}
                  className={`flex-1 h-10 rounded-full text-sm font-medium border transition-all ${
                    direcao === opt.value
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                  style={
                    direcao === opt.value
                      ? { backgroundColor: '#003DA5' }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Perfil do cliente indicado
              </label>
              <textarea
                value={clientePerfil}
                onChange={(e) => setClientePerfil(e.target.value)}
                placeholder="Descreva o cliente..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Tipologia desejada
              </label>
              <input
                type="text"
                value={tipologia}
                onChange={(e) => setTipologia(e.target.value)}
                placeholder="Ex: 3 dormitórios, 100m²"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Preço mín.</label>
                <input
                  type="text"
                  value={precoMin}
                  onChange={(e) => setPrecoMin(formatCurrency(e.target.value))}
                  placeholder="R$ 0,00"
                  className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Preço máx.</label>
                <input
                  type="text"
                  value={precoMax}
                  onChange={(e) => setPrecoMax(formatCurrency(e.target.value))}
                  placeholder="R$ 0,00"
                  className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Região desejada</label>
              <input
                type="text"
                value={regiaoDesejada}
                onChange={(e) => setRegiaoDesejada(e.target.value)}
                placeholder="Ex: Vila Mariana, Moema"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Prazo de validade
              </label>
              <input
                type="date"
                value={prazoValidade}
                onChange={(e) => setPrazoValidade(e.target.value)}
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none resize-none"
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="w-full h-14 mt-6 rounded-xl text-base font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: canSave && !isSaving ? '#22C55E' : '#9CA3AF' }}
          >
            {isSaving ? 'Salvando...' : 'Criar Referral'}
          </button>
        </div>
      </div>
    </div>
  )
}
