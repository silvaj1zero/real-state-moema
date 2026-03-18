'use client'

import { useAcmStore } from '@/store/acm'
import { useImportFromScraping } from '@/hooks/useAcm'
import type { ScrapedListing } from '@/lib/supabase/types'
import { Download } from 'lucide-react'

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

interface AcmImportScrapingProps {
  scrapedListings: ScrapedListing[]
  consultantId: string
}

export function AcmImportScraping({
  scrapedListings,
  consultantId,
}: AcmImportScrapingProps) {
  const selectedIds = useAcmStore((s) => s.selectedScrapedIds)
  const toggleId = useAcmStore((s) => s.toggleScrapedId)
  const selectAll = useAcmStore((s) => s.selectAllScraped)
  const clearSelection = useAcmStore((s) => s.clearScrapedSelection)
  const importMutation = useImportFromScraping()

  // AC6: If no scraping available, section does not appear
  if (scrapedListings.length === 0) return null

  async function handleImport() {
    const selectedListings = scrapedListings.filter((l) => selectedIds.has(l.id))
    if (selectedListings.length === 0) return

    await importMutation.mutateAsync({
      consultant_id: consultantId,
      listings: selectedListings,
    })
    clearSelection()
  }

  const allSelected = scrapedListings.every((l) => selectedIds.has(l.id))

  return (
    <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-orange-800">
          Importar {scrapedListings.length} anúncios de portais
        </h4>
        <button
          onClick={() =>
            allSelected
              ? clearSelection()
              : selectAll(scrapedListings.map((l) => l.id))
          }
          className="text-[10px] text-orange-600 underline"
        >
          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      </div>

      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {scrapedListings.map((listing) => (
          <label
            key={listing.id}
            className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(listing.id)}
              onChange={() => toggleId(listing.id)}
              className="rounded border-gray-300"
            />
            <span className="truncate flex-1">
              {listing.endereco || 'Endereço desconhecido'}
            </span>
            {listing.preco && (
              <span className="text-gray-500 shrink-0">
                {formatBRL(listing.preco)}
              </span>
            )}
            <span className="text-[10px] text-orange-600 capitalize shrink-0">
              {listing.portal}
            </span>
          </label>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <button
          onClick={handleImport}
          disabled={importMutation.isPending}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="size-3.5" />
          {importMutation.isPending
            ? 'Importando...'
            : `Importar ${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
