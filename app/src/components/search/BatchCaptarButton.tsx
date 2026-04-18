'use client'

import { useState } from 'react'
import { Users, Check, X } from 'lucide-react'
import { useBatchCaptar } from '@/hooks/useCaptarFromSearch'
import type { ScrapedListingParametric } from '@/lib/supabase/types'

interface BatchCaptarButtonProps {
  selectedListings: ScrapedListingParametric[]
  consultantId: string
  searchId?: string | null
  onComplete: () => void
}

export function BatchCaptarButton({
  selectedListings,
  consultantId,
  searchId,
  onComplete,
}: BatchCaptarButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const batchCaptar = useBatchCaptar()

  const count = selectedListings.length
  if (count === 0) return null

  const handleConfirm = async () => {
    const result = await batchCaptar.mutateAsync({
      listings: selectedListings,
      consultantId,
      searchId,
    })

    if (result.succeeded.length > 0) {
      onComplete()
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 h-10 px-4 bg-[#003DA5] text-white rounded-lg text-sm font-medium hover:bg-[#002d7a] transition-colors"
      >
        <Users className="size-4" />
        Captar {count} selecionado{count !== 1 ? 's' : ''}
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar captacao</h3>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400">
                <X className="size-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Criar <strong>{count} leads</strong> a partir dos resultados selecionados?
            </p>

            {/* Preview first 3 */}
            <div className="space-y-1.5 mb-4">
              {selectedListings.slice(0, 3).map((l) => (
                <div key={l.id} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  {l.nome_anunciante || l.endereco?.split(',')[0] || 'Sem nome'}
                  {l.is_fisbo && <span className="text-green-600 ml-1">(FISBO)</span>}
                </div>
              ))}
              {count > 3 && (
                <p className="text-xs text-gray-400 px-3">...e mais {count - 3}</p>
              )}
            </div>

            {/* Result */}
            {batchCaptar.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-600" />
                  <p className="text-sm text-green-700">
                    {batchCaptar.data.succeeded.length} leads criados!
                    {batchCaptar.data.failed.length > 0 && (
                      <span className="text-red-500 ml-1">
                        ({batchCaptar.data.failed.length} falharam)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {batchCaptar.isError && (
              <p className="text-xs text-red-500 mb-3">Erro no processamento batch</p>
            )}

            <div className="flex gap-2">
              {batchCaptar.isSuccess ? (
                <button
                  onClick={() => {
                    setShowConfirm(false)
                    onComplete()
                  }}
                  className="flex-1 h-12 bg-[#003DA5] text-white rounded-lg font-medium text-sm"
                >
                  Fechar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 h-12 border border-gray-200 rounded-lg text-sm text-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={batchCaptar.isPending}
                    className="flex-1 h-12 bg-[#003DA5] text-white rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center"
                  >
                    {batchCaptar.isPending ? (
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      `Captar ${count}`
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
