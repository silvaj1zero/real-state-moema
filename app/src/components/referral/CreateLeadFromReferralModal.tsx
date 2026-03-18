'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useLinkReferralToLead } from '@/hooks/useReferrals'
import { X, UserPlus } from 'lucide-react'
import type { Referral } from '@/lib/supabase/types'

interface CreateLeadFromReferralModalProps {
  referral: Referral
  onClose: () => void
  onSuccess: () => void
}

export function CreateLeadFromReferralModal({
  referral,
  onClose,
  onSuccess,
}: CreateLeadFromReferralModalProps) {
  const user = useAuthStore((s) => s.user)
  const linkReferralToLead = useLinkReferralToLead()

  const [nome, setNome] = useState(referral.cliente_perfil?.split(' ').slice(0, 2).join(' ') || '')
  const [tipologia, setTipologia] = useState(referral.tipologia_desejada || '')
  const [regiao, setRegiao] = useState(referral.regiao_desejada || '')
  const [isSaving, setIsSaving] = useState(false)

  const canSave = nome.trim().length > 0

  const handleCreate = async () => {
    if (!canSave || !user) return
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Create lead from referral data
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          consultant_id: user.id,
          nome: nome.trim(),
          origem: 'indicacao' as const,
          etapa_funil: 'contato' as const,
          referral_id: referral.id,
          notas: [
            `Referral de: ${referral.parceiro_nome}`,
            referral.cliente_perfil ? `Perfil: ${referral.cliente_perfil}` : null,
            tipologia ? `Tipologia: ${tipologia}` : null,
            regiao ? `Região: ${regiao}` : null,
            referral.faixa_preco_min || referral.faixa_preco_max
              ? `Faixa: R$ ${referral.faixa_preco_min?.toLocaleString('pt-BR') ?? '?'} — R$ ${referral.faixa_preco_max?.toLocaleString('pt-BR') ?? '?'}`
              : null,
          ]
            .filter(Boolean)
            .join('\n'),
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create lead: ${error.message}`)

      // Link referral to the new lead
      await linkReferralToLead.mutateAsync({
        referralId: referral.id,
        leadId: lead.id,
        consultantId: user.id,
      })

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: `Lead ${nome.trim()} criado a partir do referral!`, type: 'success' },
        }),
      )

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error creating lead from referral:', err)
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: 'Erro ao criar lead', type: 'error' },
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-[#003DA5]" />
            <h3 className="text-base font-bold text-gray-900">Criar Lead do Referral?</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-3">
            Referral de <strong>{referral.parceiro_nome}</strong>
            {referral.parceiro_franquia ? ` (${referral.parceiro_franquia})` : ''}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome do cliente *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do lead"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipologia</label>
              <input
                type="text"
                value={tipologia}
                onChange={(e) => setTipologia(e.target.value)}
                placeholder="Ex: 3 dormitórios"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Região</label>
              <input
                type="text"
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
                placeholder="Região desejada"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!canSave || isSaving}
              className="flex-1 h-12 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: canSave && !isSaving ? '#22C55E' : '#9CA3AF' }}
            >
              {isSaving ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
