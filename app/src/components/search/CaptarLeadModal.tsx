'use client'

import { useState } from 'react'
import { UserPlus, AlertTriangle, Check, X } from 'lucide-react'
import { useCaptarLead, useCheckDuplicate } from '@/hooks/useCaptarFromSearch'
import type { ScrapedListingParametric } from '@/lib/supabase/types'

interface CaptarLeadModalProps {
  listing: ScrapedListingParametric
  consultantId: string
  searchId?: string | null
  onClose: () => void
  onSuccess: (leadId: string) => void
}

export function CaptarLeadModal({
  listing,
  consultantId,
  searchId,
  onClose,
  onSuccess,
}: CaptarLeadModalProps) {
  const [nome, setNome] = useState(
    listing.nome_anunciante || `Proprietario - ${listing.endereco?.split(',')[0] || ''}`
  )
  const [telefone, setTelefone] = useState(listing.telefone_anunciante || '')
  const [email, setEmail] = useState(listing.email_anunciante || '')
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingName?: string
    existingLeadId?: string
  } | null>(null)

  const captarMutation = useCaptarLead()
  const checkDuplicate = useCheckDuplicate()

  const handleCaptar = async (force = false) => {
    // Check for duplicates first (AC6)
    if (!force && (telefone || listing.matched_edificio_id)) {
      const dupCheck = await checkDuplicate.mutateAsync({
        consultantId,
        telefone: telefone || null,
        edificioId: listing.matched_edificio_id || null,
      })

      if (dupCheck.isDuplicate) {
        setDuplicateWarning({
          existingName: dupCheck.existingName,
          existingLeadId: dupCheck.existingLeadId,
        })
        return
      }
    }

    // Create lead
    const result = await captarMutation.mutateAsync({
      listing: {
        ...listing,
        nome_anunciante: nome || listing.nome_anunciante,
        telefone_anunciante: telefone || listing.telefone_anunciante,
        email_anunciante: email || listing.email_anunciante,
      },
      consultantId,
      searchId,
    })

    onSuccess(result.leadId)
  }

  const isLoading = captarMutation.isPending || checkDuplicate.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-[#003DA5]" />
            <h3 className="text-lg font-semibold text-gray-900">Captar Lead</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        {/* Listing info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <p className="text-gray-600 line-clamp-1">{listing.endereco || 'Endereco nao disponivel'}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {listing.preco && (
              <span>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(listing.preco)}
              </span>
            )}
            {listing.area_m2 && <span>{listing.area_m2} m²</span>}
            {listing.quartos != null && <span>{listing.quartos}q</span>}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium uppercase"
              style={{ backgroundColor: listing.portal === 'zap' ? '#8B2FC9' : listing.portal === 'olx' ? '#6E0AD6' : '#FF7900' }}
            >
              {listing.portal}
            </span>
          </div>
        </div>

        {/* Duplicate warning (AC6) */}
        {duplicateWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Lead similar encontrado</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  &quot;{duplicateWarning.existingName}&quot; ja existe no funil.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleCaptar(true)}
                    className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                  >
                    Criar mesmo assim
                  </button>
                  <button
                    onClick={onClose}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-12 px-3 border border-gray-200 rounded-lg text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              placeholder="Nome do proprietario"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full h-12 px-3 border border-gray-200 rounded-lg text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-3 border border-gray-200 rounded-lg text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        {/* Error */}
        {captarMutation.isError && (
          <p className="text-xs text-red-500 mb-3">
            Erro: {captarMutation.error?.message || 'Falha ao criar lead'}
          </p>
        )}

        {/* Actions */}
        <button
          onClick={() => handleCaptar(false)}
          disabled={isLoading || !nome.trim()}
          className="w-full h-12 bg-[#003DA5] text-white rounded-lg font-medium text-sm hover:bg-[#002d7a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : captarMutation.isSuccess ? (
            <>
              <Check className="size-4" />
              Lead criado!
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              Captar Lead
            </>
          )}
        </button>
      </div>
    </div>
  )
}
