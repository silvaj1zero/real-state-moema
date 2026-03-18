'use client'

import { useState } from 'react'
import { useAcmStore } from '@/store/acm'
import { useCreateComparavel, type CreateComparavelInput } from '@/hooks/useAcm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface AddComparableSheetProps {
  consultantId: string
  edificioReferenciaId?: string
  /** Coordinates inherited from reference building */
  defaultLat?: number
  defaultLng?: number
}

export function AddComparableSheet({
  consultantId,
  edificioReferenciaId,
  defaultLat,
  defaultLng,
}: AddComparableSheetProps) {
  const isOpen = useAcmStore((s) => s.isAddSheetOpen)
  const closeSheet = useAcmStore((s) => s.closeAddSheet)
  const createComparavel = useCreateComparavel()

  const [endereco, setEndereco] = useState('')
  const [areaM2, setAreaM2] = useState('')
  const [preco, setPreco] = useState('')
  const [isVendaReal, setIsVendaReal] = useState(false)
  const [dataReferencia, setDataReferencia] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [notas, setNotas] = useState('')

  function resetForm() {
    setEndereco('')
    setAreaM2('')
    setPreco('')
    setIsVendaReal(false)
    setDataReferencia(new Date().toISOString().split('T')[0])
    setNotas('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const input: CreateComparavelInput = {
      consultant_id: consultantId,
      edificio_referencia_id: edificioReferenciaId,
      endereco,
      coordinates_lat: defaultLat,
      coordinates_lng: defaultLng,
      area_m2: parseFloat(areaM2) || 0,
      preco: parseFloat(preco) || 0,
      is_venda_real: isVendaReal,
      data_referencia: dataReferencia,
      notas: notas || undefined,
    }

    await createComparavel.mutateAsync(input)
    resetForm()
    closeSheet()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={closeSheet}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            + Comparável
          </h3>
          <button
            onClick={closeSheet}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Endereço */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Endereço
            </label>
            <Input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua dos Chanés, 123"
              required
            />
          </div>

          {/* Área + Preço side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Área m²
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={areaM2}
                onChange={(e) => setAreaM2(e.target.value)}
                placeholder="85"
                required
                min={1}
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Preço R$
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="850000"
                required
                min={1}
                step="0.01"
              />
            </div>
          </div>

          {/* É venda real? toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">
              É venda real?
            </label>
            <button
              type="button"
              onClick={() => setIsVendaReal(!isVendaReal)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                isVendaReal ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  isVendaReal ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Data de referência */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Data de referência
            </label>
            <Input
              type="date"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Informações adicionais..."
              className="w-full h-16 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg resize-none focus:border-[#003DA5] focus:outline-none"
            />
          </div>

          {/* Preço/m² preview */}
          {parseFloat(areaM2) > 0 && parseFloat(preco) > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Preço/m²: R${' '}
              {(parseFloat(preco) / parseFloat(areaM2)).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-10 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl"
            disabled={createComparavel.isPending}
          >
            {createComparavel.isPending ? 'Salvando...' : 'Adicionar Comparável'}
          </Button>
        </form>
      </div>
    </div>
  )
}
