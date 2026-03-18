'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FisboToggleProps {
  qualificacaoId: string
  isFisbo: boolean
  onToggle: () => void
}

export function FisboToggle({ qualificacaoId, isFisbo, onToggle }: FisboToggleProps) {
  const [isPending, setIsPending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleToggle = async (newValue: boolean) => {
    // When turning OFF, require confirmation to prevent accidental unmark
    if (!newValue) {
      setShowConfirm(true)
      return
    }

    await performToggle(newValue)
  }

  const performToggle = async (newValue: boolean) => {
    setIsPending(true)
    setShowConfirm(false)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('edificios_qualificacoes')
        .update({ is_fisbo_detected: newValue })
        .eq('id', qualificacaoId)

      if (error) {
        console.error('Erro ao atualizar FISBO:', error)
        return
      }

      onToggle()
    } catch (err) {
      console.error('Erro ao atualizar FISBO:', err)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Star icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isFisbo ? '#DC1431' : 'none'}
          stroke={isFisbo ? '#DC1431' : '#9CA3AF'}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>

        <span className="text-xs text-gray-600 font-medium">FISBO</span>

        {/* Toggle switch */}
        <button
          onClick={() => handleToggle(!isFisbo)}
          disabled={isPending}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
            isFisbo ? 'bg-[#DC1431]' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={isFisbo}
          aria-label="Toggle FISBO"
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isFisbo ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Confirmation dialog for turning OFF */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-5 mx-4 max-w-xs w-full">
            <p className="text-sm font-semibold text-gray-800 mb-2">Remover marcação FISBO?</p>
            <p className="text-xs text-gray-500 mb-4">
              Este edifício será desmarcado como FISBO. Você pode remarcar a qualquer momento.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => performToggle(false)}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#DC1431] rounded-lg"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
