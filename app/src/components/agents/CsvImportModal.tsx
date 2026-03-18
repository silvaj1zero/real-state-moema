'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileSpreadsheet } from 'lucide-react'
import { useCsvImport } from '@/hooks/useScrapedListings'
import { Button } from '@/components/ui/button'

interface CsvImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CsvImportModal({ isOpen, onClose }: CsvImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const csvImport = useCsvImport()
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const res = await csvImport.mutateAsync(text)
    setResult(res)
  }

  function handleClose() {
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-[#003DA5]" />
            Importar CSV
          </h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Upload de CSV com colunas: endereco, preco, area_m2, quartos (opcional), tipo_anunciante (opcional), url (opcional).
            </p>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#003DA5] transition-colors"
            >
              <Upload className="size-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Clique para selecionar arquivo CSV</p>
              <p className="text-[10px] text-gray-400 mt-1">ou arraste e solte aqui</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {csvImport.isPending && (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Importando...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {result.imported > 0 && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-sm font-medium text-green-700">
                  {result.imported} anuncio{result.imported > 1 ? 's' : ''} importado{result.imported > 1 ? 's' : ''}!
                </p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-sm font-medium text-red-700 mb-1">Erros:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
