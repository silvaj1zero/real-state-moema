'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedRow {
  [key: string]: string
}

export interface ColumnMapping {
  csvColumn: string
  systemField: SystemField | null
}

export type SystemField =
  | 'nome'
  | 'telefone'
  | 'email'
  | 'endereco'
  | 'tipologia'
  | 'valor'

export const SYSTEM_FIELD_LABELS: Record<SystemField, string> = {
  nome: 'Nome do proprietário',
  telefone: 'Telefone',
  email: 'Email',
  endereco: 'Endereço/Edifício',
  tipologia: 'Tipo do imóvel',
  valor: 'Valor pretendido',
}

export type RowStatus = 'new' | 'duplicate' | 'error'

export interface PreviewRow {
  index: number
  raw: ParsedRow
  nome: string
  telefone: string
  email: string
  endereco: string
  edificioMatch: { id: string; nome: string } | null
  status: RowStatus
  statusDetail: string | null
  selected: boolean
}

export interface ImportResult {
  imported: number
  duplicates: number
  errors: number
  errorDetails: { line: number; reason: string }[]
}

// ---------------------------------------------------------------------------
// Auto-detect column mapping heuristic
// ---------------------------------------------------------------------------

const HEURISTICS: Record<SystemField, RegExp> = {
  nome: /^(nome|name|proprietario|owner|cliente)/i,
  telefone: /^(tel|telefone|phone|celular|whatsapp|fone)/i,
  email: /^(email|e-mail|mail)/i,
  endereco: /^(endereco|endereço|address|rua|logradouro|edificio|edifício)/i,
  tipologia: /^(tipo|tipologia|type|category)/i,
  valor: /^(valor|preco|preço|price|value)/i,
}

function autoDetectMapping(headers: string[]): ColumnMapping[] {
  return headers.map((col) => {
    let matched: SystemField | null = null
    for (const [field, regex] of Object.entries(HEURISTICS)) {
      if (regex.test(col.trim())) {
        matched = field as SystemField
        break
      }
    }
    return { csvColumn: col, systemField: matched }
  })
}

// ---------------------------------------------------------------------------
// Hook: useCapteiImport
// ---------------------------------------------------------------------------

export function useCapteiImport(consultantId: string | null) {
  const queryClient = useQueryClient()

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'result'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Step 1: Parse file
  const parseFile = useCallback((file: File) => {
    setError(null)

    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo excede limite de 5MB')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' })
          if (json.length === 0) {
            setError('Arquivo vazio')
            return
          }
          const h = Object.keys(json[0])
          setHeaders(h)
          setRows(json)
          setMappings(autoDetectMapping(h))
          setStep('mapping')
        } catch {
          setError('Erro ao ler arquivo Excel')
        }
      }
      reader.readAsArrayBuffer(file)
    } else if (ext === 'csv') {
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (result) => {
          if (result.errors.length > 0 && result.data.length === 0) {
            setError('Erro ao parsear CSV: ' + result.errors[0].message)
            return
          }
          if (result.data.length === 0) {
            setError('Arquivo vazio')
            return
          }
          const h = result.meta.fields ?? Object.keys(result.data[0])
          setHeaders(h)
          setRows(result.data)
          setMappings(autoDetectMapping(h))
          setStep('mapping')
        },
        error: () => {
          setError('Erro ao parsear CSV')
        },
      })
    } else {
      setError('Formato não suportado. Use .csv ou .xlsx')
    }
  }, [])

  // Step 2: Update mapping
  const updateMapping = useCallback((csvColumn: string, systemField: SystemField | null) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.csvColumn === csvColumn ? { ...m, systemField } : m,
      ),
    )
  }, [])

  // Step 3: Generate preview with building match + duplicate detection
  const generatePreview = useCallback(async () => {
    if (!consultantId) return
    setError(null)

    const nomeCol = mappings.find((m) => m.systemField === 'nome')?.csvColumn
    const telCol = mappings.find((m) => m.systemField === 'telefone')?.csvColumn
    const emailCol = mappings.find((m) => m.systemField === 'email')?.csvColumn
    const endCol = mappings.find((m) => m.systemField === 'endereco')?.csvColumn

    if (!nomeCol) {
      setError('Mapeie pelo menos a coluna "Nome"')
      return
    }

    const supabase = createClient()

    // Fetch existing leads for duplicate detection
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, nome, telefone_encrypted, edificio_id')
      .eq('consultant_id', consultantId)

    const existing = existingLeads ?? []

    const preview: PreviewRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const nome = nomeCol ? (row[nomeCol] || '').trim() : ''
      const telefone = telCol ? (row[telCol] || '').trim() : ''
      const email = emailCol ? (row[emailCol] || '').trim() : ''
      const endereco = endCol ? (row[endCol] || '').trim() : ''

      if (!nome) {
        preview.push({
          index: i,
          raw: row,
          nome,
          telefone,
          email,
          endereco,
          edificioMatch: null,
          status: 'error',
          statusDetail: 'Nome vazio',
          selected: false,
        })
        continue
      }

      // Duplicate detection by name (simple)
      const dup = existing.find(
        (l) => l.nome.toLowerCase() === nome.toLowerCase()
      )
      if (dup) {
        preview.push({
          index: i,
          raw: row,
          nome,
          telefone,
          email,
          endereco,
          edificioMatch: null,
          status: 'duplicate',
          statusDetail: `Lead similar: ${dup.nome}`,
          selected: false,
        })
        continue
      }

      // Building match by address ILIKE
      let edificioMatch: { id: string; nome: string } | null = null
      if (endereco) {
        const { data: matches } = await supabase
          .from('edificios')
          .select('id, nome')
          .or(`endereco.ilike.%${endereco.split(',')[0]}%,nome.ilike.%${endereco.split(',')[0]}%`)
          .limit(1)

        if (matches && matches.length > 0) {
          edificioMatch = { id: matches[0].id, nome: matches[0].nome }
        }
      }

      preview.push({
        index: i,
        raw: row,
        nome,
        telefone,
        email,
        endereco,
        edificioMatch,
        status: 'new',
        statusDetail: null,
        selected: true,
      })
    }

    setPreviewRows(preview)
    setStep('preview')
  }, [consultantId, mappings, rows])

  // Toggle row selection
  const toggleRow = useCallback((index: number) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r)),
    )
  }, [])

  // Step 4: Execute import
  const executeImport = useCallback(async () => {
    if (!consultantId) return
    setStep('importing')
    setProgress(0)

    const supabase = createClient()
    const toImport = previewRows.filter((r) => r.selected && r.status !== 'error')

    let imported = 0
    let errors = 0
    const errorDetails: { line: number; reason: string }[] = []
    const duplicates = previewRows.filter((r) => r.status === 'duplicate' && !r.selected).length

    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i]

      try {
        const { error: insertError } = await supabase.from('leads').insert({
          consultant_id: consultantId,
          edificio_id: row.edificioMatch?.id || null,
          nome: row.nome,
          telefone_encrypted: row.telefone || null, // TODO: pgcrypto encryption
          email_encrypted: row.email || null, // TODO: pgcrypto encryption
          origem: 'captei' as const,
          etapa_funil: 'contato' as const,
          notas: row.endereco ? `Importado Captei — Endereço: ${row.endereco}` : 'Importado Captei',
        })

        if (insertError) {
          errors++
          errorDetails.push({ line: row.index + 2, reason: insertError.message })
        } else {
          imported++
        }
      } catch (err) {
        errors++
        errorDetails.push({
          line: row.index + 2,
          reason: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      setProgress(Math.round(((i + 1) / toImport.length) * 100))
    }

    const result: ImportResult = { imported, duplicates, errors, errorDetails }
    setImportResult(result)
    setStep('result')

    // Invalidate lead queries
    queryClient.invalidateQueries({ queryKey: ['leads'] })

    window.dispatchEvent(
      new CustomEvent('toast', {
        detail: {
          message: `${imported} leads importados da Captei!`,
          type: 'success',
        },
      }),
    )
  }, [consultantId, previewRows, queryClient])

  // Reset
  const reset = useCallback(() => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setMappings([])
    setPreviewRows([])
    setImportResult(null)
    setError(null)
    setProgress(0)
  }, [])

  return {
    step,
    headers,
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
  }
}
