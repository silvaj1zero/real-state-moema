'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import {
  useCapteiImport,
  SYSTEM_FIELD_LABELS,
} from '@/hooks/useCapteiImport'
import type { SystemField } from '@/hooks/useCapteiImport'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react'

const STATUS_STYLES = {
  new: { label: 'Novo', color: '#22C55E', Icon: CheckCircle },
  duplicate: { label: 'Duplicata', color: '#F59E0B', Icon: AlertCircle },
  error: { label: 'Erro', color: '#DC3545', Icon: XCircle },
} as const

export default function CapteiPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    step,
    rows,
    mappings,
    previewRows,
    importResult,
    error,
    progress,
    parseFile,
    updateMapping,
    generatePreview,
    toggleRow,
    executeImport,
    reset,
  } = useCapteiImport(user?.id ?? null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) parseFile(file)
    },
    [parseFile],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) parseFile(file)
    },
    [parseFile],
  )

  const newCount = previewRows.filter((r) => r.status === 'new').length
  const dupCount = previewRows.filter((r) => r.status === 'duplicate').length
  const errCount = previewRows.filter((r) => r.status === 'error').length
  const selectedCount = previewRows.filter((r) => r.selected).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between h-12 px-4">
          <button
            onClick={() => (step === 'upload' ? router.back() : reset())}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Importar Captei</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-4 py-4">
        {/* ===== STEP 1: Upload ===== */}
        {step === 'upload' && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#003DA5] hover:bg-blue-50/30 transition-all"
            >
              <Upload size={40} className="text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Arraste um arquivo CSV ou XLSX
              </p>
              <p className="text-xs text-gray-400 mt-1">ou clique para selecionar (máx 5MB)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 2: Column Mapping ===== */}
        {step === 'mapping' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet size={18} className="text-[#003DA5]" />
              <p className="text-sm font-medium text-gray-800">
                {rows.length} linhas encontradas
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {mappings.map((m) => (
                <div
                  key={m.csvColumn}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3"
                >
                  <span className="text-xs font-mono text-gray-600 flex-1 truncate">
                    {m.csvColumn}
                  </span>
                  <span className="text-gray-300">→</span>
                  <select
                    value={m.systemField ?? ''}
                    onChange={(e) =>
                      updateMapping(
                        m.csvColumn,
                        (e.target.value as SystemField) || null,
                      )
                    }
                    className="flex-1 h-9 px-2 rounded-lg border border-gray-300 text-xs focus:border-[#003DA5] outline-none"
                  >
                    <option value="">— Ignorar —</option>
                    {(Object.entries(SYSTEM_FIELD_LABELS) as [SystemField, string][]).map(
                      ([field, label]) => (
                        <option key={field} value={field}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={generatePreview}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#003DA5' }}
            >
              Verificar e Preview
            </button>
          </div>
        )}

        {/* ===== STEP 3: Preview ===== */}
        {step === 'preview' && (
          <div>
            {/* Stats */}
            <div className="flex gap-2 mb-3">
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                {newCount} novos
              </span>
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-yellow-50 text-yellow-700">
                {dupCount} duplicatas
              </span>
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-red-50 text-red-700">
                {errCount} erros
              </span>
            </div>

            {/* Table */}
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto mb-4">
              {previewRows.map((row) => {
                const { label, color, Icon } = STATUS_STYLES[row.status]
                return (
                  <div
                    key={row.index}
                    className={`flex items-center gap-2 bg-white rounded-lg border p-2.5 ${
                      row.selected ? 'border-[#003DA5]/30' : 'border-gray-100 opacity-60'
                    }`}
                  >
                    {row.status !== 'error' && (
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(row.index)}
                        className="w-4 h-4 rounded accent-[#003DA5]"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{row.nome || '—'}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {row.edificioMatch?.nome ?? row.endereco ?? '—'}
                        {!row.edificioMatch && row.endereco && ' (sem match)'}
                      </p>
                    </div>
                    <span
                      className="flex items-center gap-0.5 text-[10px] font-medium"
                      style={{ color }}
                      title={row.statusDetail ?? undefined}
                    >
                      <Icon size={12} /> {label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 h-12 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeImport}
                disabled={selectedCount === 0}
                className="flex-1 h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#28A745' }}
              >
                Importar {selectedCount} leads
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 4: Importing ===== */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={36} className="text-[#003DA5] animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-700">Importando leads...</p>
            <div className="w-full max-w-xs mt-3">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#003DA5] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-1">{progress}%</p>
            </div>
          </div>
        )}

        {/* ===== STEP 5: Result ===== */}
        {step === 'result' && importResult && (
          <div>
            <div className="flex flex-col items-center py-6">
              <CheckCircle size={48} className="text-[#22C55E] mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Importação concluída</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex flex-col items-center bg-green-50 rounded-xl py-3">
                <span className="text-xl font-bold text-green-700">{importResult.imported}</span>
                <span className="text-[10px] text-green-600">Importados</span>
              </div>
              <div className="flex flex-col items-center bg-yellow-50 rounded-xl py-3">
                <span className="text-xl font-bold text-yellow-700">{importResult.duplicates}</span>
                <span className="text-[10px] text-yellow-600">Duplicatas</span>
              </div>
              <div className="flex flex-col items-center bg-red-50 rounded-xl py-3">
                <span className="text-xl font-bold text-red-700">{importResult.errors}</span>
                <span className="text-[10px] text-red-600">Erros</span>
              </div>
            </div>

            {importResult.errorDetails.length > 0 && (
              <details className="mb-4">
                <summary className="text-xs font-medium text-red-600 cursor-pointer">
                  Ver erros ({importResult.errorDetails.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errorDetails.map((e, i) => (
                    <p key={i} className="text-[10px] text-gray-500">
                      Linha {e.line}: {e.reason}
                    </p>
                  ))}
                </div>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 h-12 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100"
              >
                Nova importação
              </button>
              <button
                onClick={() => router.push('/funil')}
                className="flex-1 h-12 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#003DA5' }}
              >
                Ver leads
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
