'use client'

import { useState, useRef, useEffect } from 'react'
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import type { AcmCalculations } from '@/hooks/useAcm'
import { Download, Copy, FileSpreadsheet, BookOpen, ChevronDown } from 'lucide-react'
import { formatBRL } from '@/lib/format'

interface AcmExportMenuProps {
  comparaveis: ComparavelNoRaio[]
  stats: AcmCalculations
  onIncluirDossie?: () => void
}

export function AcmExportMenu({ comparaveis, stats, onIncluirDossie }: AcmExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  function handleCopyResumo() {
    const text = [
      '=== ACM Resumo ===',
      `Média Preço/m²: ${formatBRL(stats.mediaPrecoM2)}/m²`,
      `Mediana Preço/m²: ${formatBRL(stats.medianaPrecoM2)}/m²`,
      stats.tendenciaPercent !== null
        ? `Tendência: ${stats.tendenciaPercent >= 0 ? '+' : ''}${stats.tendenciaPercent.toFixed(1)}%`
        : 'Tendência: dados insuficientes',
      `Total Comparáveis: ${stats.totalComparaveis} (${stats.countManual} manual | ${stats.countScraping} scraping)`,
    ].join('\n')

    navigator.clipboard.writeText(text)
    showToast('ACM copiada!')
    setIsOpen(false)
  }

  function handleExportCSV() {
    const headers = ['Endereço', 'Área m²', 'Preço', 'Preço/m²', 'Tipo', 'Fonte', 'Distância (m)']
    const rows = comparaveis.map((c) => [
      `"${c.endereco}"`,
      c.area_m2.toFixed(2),
      c.preco.toFixed(2),
      c.preco_m2.toFixed(2),
      c.is_venda_real ? 'Venda Real' : 'Anúncio',
      c.fonte,
      c.distancia_m.toFixed(1),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `acm-comparaveis-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    showToast('CSV exportado!')
    setIsOpen(false)
  }

  function handleIncluirDossie() {
    onIncluirDossie?.()
    showToast('ACM incluída no dossiê!')
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Download className="size-3.5" />
        Exportar
        <ChevronDown className="size-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={handleCopyResumo}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy className="size-3.5 text-gray-400" />
            Copiar Resumo
          </button>
          <button
            onClick={handleIncluirDossie}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="size-3.5 text-gray-400" />
            Incluir no Dossiê
          </button>
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="size-3.5 text-gray-400" />
            CSV
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg animate-in fade-in duration-200">
          {toast}
        </div>
      )}
    </div>
  )
}
