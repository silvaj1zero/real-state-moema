'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import {
  useCreateFrogContact,
  FROG_CONFIG,
  FROG_CATEGORIES,
} from '@/hooks/useFrog'
import type { FonteFrog } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// FrogContactForm — Create FROG contact (ambassador)
// ---------------------------------------------------------------------------

interface FrogContactFormProps {
  onClose: () => void
  defaultCategory?: FonteFrog
}

export function FrogContactForm({ onClose, defaultCategory }: FrogContactFormProps) {
  const user = useAuthStore((s) => s.user)
  const createContact = useCreateFrogContact()

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState<FonteFrog>(
    defaultCategory ?? 'familia'
  )
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [notas, setNotas] = useState('')

  const canSubmit = nome.trim().length > 0 && !createContact.isPending

  const handleSubmit = async () => {
    if (!canSubmit || !user?.id) return

    try {
      await createContact.mutateAsync({
        consultant_id: user.id,
        nome: nome.trim(),
        categoria,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        notas: notas.trim() || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Erro ao criar contato FROG:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end">
      <div className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">
              Novo Embaixador
            </h3>
            <button onClick={onClose} className="text-sm text-gray-500">
              Cancelar
            </button>
          </div>

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                Nome *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do embaixador"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20 outline-none transition-colors"
              />
            </div>

            {/* Categoria — FROG chips */}
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-2 block">
                Categoria *
              </label>
              <div className="flex gap-2">
                {FROG_CATEGORIES.map((cat) => {
                  const config = FROG_CONFIG[cat]
                  const isActive = categoria === cat

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoria(cat)}
                      className={cn(
                        'flex-1 h-12 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all',
                        isActive
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                      style={
                        isActive ? { backgroundColor: config.color } : undefined
                      }
                    >
                      <span className="text-sm font-bold">{config.label}</span>
                      <span
                        className={cn(
                          'text-[9px]',
                          isActive ? 'text-white/80' : 'text-gray-400'
                        )}
                      >
                        {config.fullLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                Telefone
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20 outline-none transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20 outline-none transition-colors"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1 block">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observa\u00e7\u00f5es sobre este contato..."
                className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none h-20 focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20 outline-none transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-11 text-sm font-medium text-white bg-[#003DA5] rounded-lg disabled:opacity-50 transition-opacity active:scale-[0.98]"
            >
              {createContact.isPending ? 'Salvando...' : 'Salvar Embaixador'}
            </button>

            {/* Error */}
            {createContact.isError && (
              <p className="text-xs text-red-500 text-center">
                Erro ao salvar. Tente novamente.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
