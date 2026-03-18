'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { useCreateComissao, calculateSplits } from '@/hooks/useComissoes'
import type { TipoSplit } from '@/lib/supabase/types'
import { X, DollarSign, Check } from 'lucide-react'

interface ComissaoFormProps {
  leadId: string
  leadNome: string
  informanteId: string | null
  referralId: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function ComissaoForm({
  leadId,
  leadNome,
  informanteId,
  referralId,
  onClose,
  onSuccess,
}: ComissaoFormProps) {
  const user = useAuthStore((s) => s.user)
  const createComissao = useCreateComissao()

  const [valorImovel, setValorImovel] = useState('')
  const [percentualComissao, setPercentualComissao] = useState('6')
  const [percentualConsultora, setPercentualConsultora] = useState('50')
  const [percentualFranquia, setPercentualFranquia] = useState('50')
  const [percentualInformante, setPercentualInformante] = useState('5')
  const [percentualReferral, setPercentualReferral] = useState('25')
  const [clausula, setClausula] = useState(false)
  const [percentualClausula, setPercentualClausula] = useState('3')
  const [notas, setNotas] = useState('')
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [isSaving, setIsSaving] = useState(false)

  const parseCurrency = (v: string): number => {
    const num = v.replace(/\D/g, '')
    return num ? parseInt(num, 10) / 100 : 0
  }

  const formatCurrency = (v: string): string => {
    const num = v.replace(/\D/g, '')
    if (!num) return ''
    return (parseInt(num, 10) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const splits = useMemo(() => {
    return calculateSplits({
      valorImovel: parseCurrency(valorImovel),
      percentualComissao: parseFloat(percentualComissao) || 0,
      percentualConsultora: parseFloat(percentualConsultora) || 0,
      percentualFranquia: parseFloat(percentualFranquia) || 0,
      hasInformante: !!informanteId,
      percentualInformante: parseFloat(percentualInformante) || 0,
      hasReferral: !!referralId,
      percentualReferral: parseFloat(percentualReferral) || 0,
      clausulaRelacionamento: clausula,
      percentualClausula: parseFloat(percentualClausula) || 0,
    })
  }, [valorImovel, percentualComissao, percentualConsultora, percentualFranquia, informanteId, percentualInformante, referralId, percentualReferral, clausula, percentualClausula])

  const canSave = parseCurrency(valorImovel) > 0 && (parseFloat(percentualComissao) || 0) > 0

  const fmtR = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleConfirm = async () => {
    if (!canSave || !user) return
    setIsSaving(true)

    const tipoSplit: TipoSplit = clausula
      ? 'clausula_relacionamento'
      : referralId
        ? 'referral'
        : informanteId
          ? 'informante'
          : 'padrao'

    try {
      await createComissao.mutateAsync({
        consultant_id: user.id,
        lead_id: leadId,
        valor_imovel: parseCurrency(valorImovel),
        percentual_comissao: parseFloat(percentualComissao),
        valor_bruto: splits.valorBruto,
        split_consultora: splits.splitConsultora,
        split_franquia: splits.splitFranquia,
        split_informante: informanteId ? splits.splitInformante : null,
        split_referral: referralId ? splits.splitReferral : null,
        tipo_split: tipoSplit,
        percentual_clausula: clausula ? parseFloat(percentualClausula) : 0,
        informante_id: informanteId,
        referral_id: referralId,
        notas: notas.trim() || undefined,
      })

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: `Comissão ${fmtR(splits.valorBruto)} registrada!`, type: 'success' },
        }),
      )
      if (navigator.vibrate) navigator.vibrate(50)
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error creating comissao:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {step === 'form' ? 'Registrar Comissão' : 'Confirmar Splits'}
              </h2>
              <p className="text-sm text-gray-500">{leadNome}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Valor do imóvel *</label>
                <input
                  type="text"
                  value={valorImovel}
                  onChange={(e) => setValorImovel(formatCurrency(e.target.value))}
                  placeholder="R$ 0,00"
                  className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Comissão %</label>
                  <input
                    type="number"
                    value={percentualComissao}
                    onChange={(e) => setPercentualComissao(e.target.value)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full h-12 px-3 rounded-lg bg-blue-50 flex items-center justify-center">
                    <DollarSign size={14} className="text-[#003DA5] mr-1" />
                    <span className="text-sm font-bold text-[#003DA5]">{fmtR(splits.valorBruto)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Consultora %</label>
                  <input type="number" value={percentualConsultora} onChange={(e) => setPercentualConsultora(e.target.value)} step="5" min="0" max="100" className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Franquia %</label>
                  <input type="number" value={percentualFranquia} onChange={(e) => setPercentualFranquia(e.target.value)} step="5" min="0" max="100" className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none" />
                </div>
              </div>

              {/* Clausula de Relacionamento */}
              <label className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 cursor-pointer">
                <input type="checkbox" checked={clausula} onChange={(e) => setClausula(e.target.checked)} className="w-4 h-4 accent-[#D97706]" />
                <div>
                  <span className="text-xs font-medium text-yellow-800">Cláusula de Relacionamento</span>
                  <p className="text-[10px] text-yellow-600">Desconto de 3-4% quando comprador já conhece proprietário</p>
                </div>
              </label>
              {clausula && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Percentual cláusula %</label>
                  <input type="range" min="3" max="4" step="0.5" value={percentualClausula} onChange={(e) => setPercentualClausula(e.target.value)} className="w-full accent-[#D97706]" />
                  <span className="text-xs text-gray-500">{percentualClausula}%</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Notas</label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Observações..." className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none resize-none" />
              </div>

              <button
                onClick={() => setStep('review')}
                disabled={!canSave}
                className="w-full h-14 rounded-xl text-base font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: canSave ? '#003DA5' : '#9CA3AF' }}
              >
                Revisar Splits
              </button>
            </div>
          )}

          {/* AC4: Review step — CONFIRMAÇÃO OBRIGATÓRIA */}
          {step === 'review' && (
            <div>
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Consultora', percent: `${percentualConsultora}%`, value: splits.splitConsultora },
                  { label: 'Franquia', percent: `${percentualFranquia}%`, value: splits.splitFranquia },
                  ...(clausula
                    ? [{ label: 'Cláusula Relac.', percent: `${percentualClausula}%`, value: splits.clausulaValor }]
                    : []),
                  ...(informanteId
                    ? [{ label: 'Informante', percent: `${percentualInformante}%`, value: splits.splitInformante }]
                    : []),
                  ...(referralId
                    ? [{ label: 'Referral', percent: `${percentualReferral}%`, value: splits.splitReferral }]
                    : []),
                ].map(({ label, percent, value }) => (
                  <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm text-gray-700">{label}</span>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 mr-2">{percent}</span>
                      <span className="text-sm font-bold text-gray-900">{fmtR(value)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <span className="text-sm font-bold text-[#003DA5]">Total Bruto</span>
                  <span className="text-base font-bold text-[#003DA5]">{fmtR(splits.valorBruto)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 h-14 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100"
                >
                  Editar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="flex-1 h-14 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#28A745' }}
                >
                  <Check size={18} />
                  {isSaving ? 'Salvando...' : 'Confirmar Splits'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
