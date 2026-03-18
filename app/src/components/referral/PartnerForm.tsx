'use client'

import { useState, useRef, useEffect } from 'react'
import { useCreateReferral } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/auth'
import { useReferralsStore } from '@/store/referrals'
import { X } from 'lucide-react'

export function PartnerForm() {
  const user = useAuthStore((s) => s.user)
  const closePartnerForm = useReferralsStore((s) => s.closePartnerForm)
  const createReferral = useCreateReferral()

  const [nome, setNome] = useState('')
  const [franquia, setFranquia] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [regiao, setRegiao] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const canSave = nome.trim().length > 0

  const handleSave = async () => {
    if (!canSave || !user) return
    setIsSaving(true)

    try {
      // Create a "placeholder" referral to register the partner
      // Partners are inline in referrals table (no separate table)
      await createReferral.mutateAsync({
        consultant_id: user.id,
        direcao: 'enviado',
        parceiro_nome: nome.trim(),
        parceiro_franquia: franquia.trim() || undefined,
        parceiro_telefone: telefone.trim() || undefined,
        parceiro_email: email.trim() || undefined,
        parceiro_regiao: regiao.trim() || undefined,
        cliente_perfil: 'Parceiro cadastrado — aguardando primeiro referral',
      })

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: `Parceiro ${nome.trim()} cadastrado!`, type: 'success' },
        }),
      )

      if (navigator.vibrate) navigator.vibrate(50)
      closePartnerForm()
    } catch (err) {
      console.error('Error creating partner:', err)
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: 'Erro ao cadastrar parceiro', type: 'error' },
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white rounded-t-2xl">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Novo Parceiro</h2>
            <button
              onClick={closePartnerForm}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
              <input
                ref={nameRef}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do parceiro"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Franquia</label>
              <input
                type="text"
                value={franquia}
                onChange={(e) => setFranquia(e.target.value)}
                placeholder="Ex: RE/MAX Lux"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parceiro@email.com"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Região de atuação</label>
              <input
                type="text"
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
                placeholder="Ex: Itaim Bibi, Moema"
                className="w-full h-12 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
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
            {isSaving ? 'Salvando...' : 'Salvar Parceiro'}
          </button>
        </div>
      </div>
    </div>
  )
}
