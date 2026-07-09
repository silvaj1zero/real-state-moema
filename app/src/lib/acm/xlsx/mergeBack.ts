/**
 * P-2 — Merge-back da planilha XLSX do corretor (Fase 1).
 *
 * Le as colunas de validacao (Confere? / Correcao / Observacao / Tipologia
 * manual) e aplica sobre o dataset canônico:
 *   - Confere = nao (✗) → remove comparavel
 *   - Tipologia (casa/sobrado?) preenchida → atualiza tipologia
 *   - Correcao com pares chave=valor → aplica campos conhecidos
 *
 * Puro: parse de buffer XLSX + merge em memoria. Sem I/O de disco.
 */
import * as XLSX from 'xlsx'
import type { AcmDataset, AcmDatasetComparavel } from '@/lib/acm/dataset'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConfereMark = 'ok' | 'nao' | 'duvida' | 'vazio'

export interface CorretorRowMark {
  endereco: string
  sqlCadastral: string | null
  confere: ConfereMark
  rawConfere: string
  /** Tipologia preenchida pelo corretor (coluna "Tipologia (casa/sobrado?)"). */
  tipologiaManual: string | null
  correcao: string | null
  observacao: string | null
  /** Aba de origem (Top 5 / Todos…). */
  sheet: string
}

export interface MergeBackReport {
  nMarks: number
  nOk: number
  nNao: number
  nDuvida: number
  nVazio: number
  nExcluidos: number
  nTipologiaAtualizada: number
  nCampoCorrigido: number
  excluidos: string[]
  alteracoes: Array<{ endereco: string; mudancas: string[] }>
}

export interface MergeBackResult {
  marks: CorretorRowMark[]
  dataset: AcmDataset
  report: MergeBackReport
}

// ---------------------------------------------------------------------------
// Header matching (flexible — headers evolve between scripts)
// ---------------------------------------------------------------------------

function normHeader(h: string): string {
  return String(h ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function findCol(headers: string[], predicates: Array<(h: string) => boolean>): number {
  const norms = headers.map(normHeader)
  for (const pred of predicates) {
    const i = norms.findIndex(pred)
    if (i >= 0) return i
  }
  return -1
}

export function parseConfere(raw: unknown): ConfereMark {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  if (!s) return 'vazio'
  if (/^(ok|sim|confere|✓|✔|v)$/.test(s) || s.includes('✓') || s.includes('✔')) return 'ok'
  if (/^(nao|n|x|✗|✘|excluir|rejeitar)$/.test(s) || s.includes('✗') || s.includes('✘')) return 'nao'
  if (/^(\?|duvida|parcial|revisar)$/.test(s) || s.includes('?')) return 'duvida'
  // fallback: any non-empty unknown → duvida (nao inventa exclusao)
  return 'duvida'
}

// ---------------------------------------------------------------------------
// Parse XLSX buffer
// ---------------------------------------------------------------------------

/**
 * Extrai marcacoes do corretor de um workbook de validacao Fase 1.
 * Prefere a aba "Todos…" (amostra completa); se ausente, une Top 5/10/20.
 */
export function parseCorretorXlsx(data: ArrayBuffer | Buffer | Uint8Array): CorretorRowMark[] {
  const wb = XLSX.read(data, { type: 'buffer', cellDates: false })
  const rankingSheets = wb.SheetNames.filter(
    (n) => /^top\s*\d+/i.test(n) || /^todos/i.test(n),
  )
  // Prefer "Todos"
  const ordered = [
    ...rankingSheets.filter((n) => /^todos/i.test(n)),
    ...rankingSheets.filter((n) => !/^todos/i.test(n)),
  ]
  if (ordered.length === 0) {
    throw new Error(
      `Nenhuma aba de ranking (Top N / Todos) em: ${wb.SheetNames.join(', ')}`,
    )
  }

  const byKey = new Map<string, CorretorRowMark>()

  for (const sheetName of ordered) {
    const sheet = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })
    if (rows.length < 2) continue
    const headers = (rows[0] as unknown[]).map((h) => String(h ?? ''))
    const iEnd = findCol(headers, [
      (h) => h === 'endereco' || h.startsWith('endereco'),
    ])
    const iSql = findCol(headers, [
      (h) => h.includes('sql'),
    ])
    const iConfere = findCol(headers, [
      (h) => h.includes('confere'),
    ])
    const iCorrecao = findCol(headers, [
      (h) => h === 'correcao' || h.startsWith('correcao'),
    ])
    const iObs = findCol(headers, [
      (h) => h.includes('observacao'),
    ])
    const iTipoManual = findCol(headers, [
      (h) => h.includes('tipologia') && (h.includes('casa') || h.includes('sobrado') || h.includes('?')),
      (h) => h === 'tipologia (casa/sobrado?)',
    ])

    if (iEnd < 0) continue

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] as unknown[]
      if (!row || row.length === 0) continue
      const endereco = String(row[iEnd] ?? '').trim()
      if (!endereco || /^ofertas|^lente|^status|^motivo|^acao/i.test(endereco)) continue

      const rawConfere = iConfere >= 0 ? String(row[iConfere] ?? '') : ''
      const mark: CorretorRowMark = {
        endereco,
        sqlCadastral:
          iSql >= 0 && row[iSql] != null && String(row[iSql]).trim() && String(row[iSql]) !== '—'
            ? String(row[iSql]).trim()
            : null,
        confere: parseConfere(rawConfere),
        rawConfere: rawConfere.trim(),
        tipologiaManual:
          iTipoManual >= 0 && String(row[iTipoManual] ?? '').trim()
            ? String(row[iTipoManual]).trim()
            : null,
        correcao:
          iCorrecao >= 0 && String(row[iCorrecao] ?? '').trim()
            ? String(row[iCorrecao]).trim()
            : null,
        observacao:
          iObs >= 0 && String(row[iObs] ?? '').trim()
            ? String(row[iObs]).trim()
            : null,
        sheet: sheetName,
      }

      const key = mark.sqlCadastral ? `sql:${mark.sqlCadastral}` : `end:${normHeader(endereco)}`
      // Prefer mark from Todos sheet; if already present with empty confere, overwrite with richer
      const prev = byKey.get(key)
      if (!prev) {
        byKey.set(key, mark)
      } else if (prev.confere === 'vazio' && mark.confere !== 'vazio') {
        byKey.set(key, mark)
      } else if (!prev.tipologiaManual && mark.tipologiaManual) {
        byKey.set(key, { ...prev, tipologiaManual: mark.tipologiaManual })
      } else if (!prev.correcao && mark.correcao) {
        byKey.set(key, { ...prev, correcao: mark.correcao, observacao: mark.observacao ?? prev.observacao })
      }
    }
  }

  return [...byKey.values()]
}

// ---------------------------------------------------------------------------
// Apply corrections
// ---------------------------------------------------------------------------

const CAMPO_ALIASES: Record<string, keyof AcmDatasetComparavel | 'excluir'> = {
  area: 'areaConstruida',
  areaconstruida: 'areaConstruida',
  'area-construida': 'areaConstruida',
  terreno: 'areaTerreno',
  areaterreno: 'areaTerreno',
  preco: 'preco',
  valor: 'preco',
  tipologia: 'tipologia',
  tipo: 'tipologia',
  sql: 'sqlCadastral',
  sqlcadastral: 'sqlCadastral',
  excluir: 'excluir',
  remove: 'excluir',
}

function parseCorrecaoPairs(correcao: string): Array<{ key: string; value: string }> {
  // "area=200; tipologia=apartamento" ou "area: 200, preco=1500000"
  return correcao
    .split(/[;,\n]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^([a-zA-ZÀ-ú0-9_\- ]+)\s*[=:]\s*(.+)$/)
      if (!m) return null
      return { key: normHeader(m[1]).replace(/\s+/g, ''), value: m[2].trim() }
    })
    .filter((x): x is { key: string; value: string } => x != null)
}

function applyTipologiaManual(
  c: AcmDatasetComparavel,
  manual: string,
): { c: AcmDatasetComparavel; mudanca: string | null } {
  const t = normHeader(manual)
  let tipologia: string | null = null
  if (t.includes('apto') || t.includes('apart') || t.includes('vertical')) tipologia = 'apartamento'
  else if (t.includes('casa') || t.includes('sobrado') || t.includes('horizontal')) tipologia = 'casa'
  else if (t.includes('terreno')) tipologia = 'terreno'
  else if (manual.trim()) tipologia = manual.trim()

  if (!tipologia || tipologia === c.tipologia) return { c, mudanca: null }
  return {
    c: {
      ...c,
      tipologia,
      tipologiaConfianca: `corretor (merge-back): ${manual}`,
    },
    mudanca: `tipologia: ${c.tipologia ?? '—'} → ${tipologia}`,
  }
}

/**
 * Aplica marcacoes do corretor sobre o dataset.
 * Nao muta o input — devolve copia.
 */
export function mergeBackDataset(
  dataset: AcmDataset,
  marks: CorretorRowMark[],
): MergeBackResult {
  const byEnd = new Map<string, CorretorRowMark>()
  const bySql = new Map<string, CorretorRowMark>()
  for (const m of marks) {
    byEnd.set(normHeader(m.endereco), m)
    if (m.sqlCadastral) bySql.set(String(m.sqlCadastral).replace(/\D/g, ''), m)
  }

  const report: MergeBackReport = {
    nMarks: marks.length,
    nOk: marks.filter((m) => m.confere === 'ok').length,
    nNao: marks.filter((m) => m.confere === 'nao').length,
    nDuvida: marks.filter((m) => m.confere === 'duvida').length,
    nVazio: marks.filter((m) => m.confere === 'vazio').length,
    nExcluidos: 0,
    nTipologiaAtualizada: 0,
    nCampoCorrigido: 0,
    excluidos: [],
    alteracoes: [],
  }

  const out: AcmDatasetComparavel[] = []

  for (const raw of dataset.comparaveis) {
    const mark =
      (raw.sqlCadastral
        ? bySql.get(String(raw.sqlCadastral).replace(/\D/g, ''))
        : undefined) ?? byEnd.get(normHeader(raw.endereco))

    if (!mark) {
      out.push({ ...raw })
      continue
    }

    // Exclusao explicita
    if (mark.confere === 'nao') {
      report.nExcluidos += 1
      report.excluidos.push(raw.endereco)
      continue
    }

    let c: AcmDatasetComparavel = { ...raw }
    const mudancas: string[] = []

    if (mark.tipologiaManual) {
      const r = applyTipologiaManual(c, mark.tipologiaManual)
      c = r.c
      if (r.mudanca) {
        mudancas.push(r.mudanca)
        report.nTipologiaAtualizada += 1
      }
    }

    if (mark.correcao) {
      const pairs = parseCorrecaoPairs(mark.correcao)
      // se correcao e so "excluir" sem pares
      if (pairs.length === 0 && /excluir|remover|fora/i.test(mark.correcao)) {
        report.nExcluidos += 1
        report.excluidos.push(raw.endereco)
        continue
      }
      let drop = false
      for (const { key, value } of pairs) {
        const campo = CAMPO_ALIASES[key]
        if (!campo) {
          mudancas.push(`ignorado: ${key}=${value}`)
          continue
        }
        if (campo === 'excluir') {
          drop = true
          break
        }
        if (campo === 'areaConstruida' || campo === 'areaTerreno' || campo === 'preco') {
          const n = Number(String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
          if (Number.isFinite(n)) {
            const prev = c[campo]
            c = { ...c, [campo]: n }
            mudancas.push(`${campo}: ${prev ?? '—'} → ${n}`)
            report.nCampoCorrigido += 1
          }
        } else if (campo === 'tipologia') {
          const r = applyTipologiaManual(c, value)
          c = r.c
          if (r.mudanca) {
            mudancas.push(r.mudanca)
            report.nTipologiaAtualizada += 1
          }
        } else if (campo === 'sqlCadastral') {
          c = { ...c, sqlCadastral: value }
          mudancas.push(`sqlCadastral → ${value}`)
          report.nCampoCorrigido += 1
        }
      }
      if (drop) {
        report.nExcluidos += 1
        report.excluidos.push(raw.endereco)
        continue
      }
    }

    // Anexa observacao do corretor em campo nao estruturado (nao inventa schema)
    if (mark.observacao) {
      mudancas.push(`obs: ${mark.observacao.slice(0, 80)}`)
    }

    if (mudancas.length) {
      report.alteracoes.push({ endereco: c.endereco, mudancas })
    }
    out.push(c)
  }

  const datasetOut: AcmDataset = {
    ...dataset,
    comparaveis: out,
    // metadado de auditoria (opt-in; consumidores ignoram se desconhecido)
    ...( {
      validacaoCorretor: {
        geradoEm: new Date().toISOString(),
        nMarks: report.nMarks,
        nExcluidos: report.nExcluidos,
        excluidos: report.excluidos,
        alteracoes: report.alteracoes,
      },
    } as Partial<AcmDataset>),
  }

  return { marks, dataset: datasetOut, report }
}

/**
 * Pipeline: buffer XLSX + dataset → dataset mesclado + report.
 */
export function mergeBackFromXlsx(
  dataset: AcmDataset,
  xlsxData: ArrayBuffer | Buffer | Uint8Array,
): MergeBackResult {
  const marks = parseCorretorXlsx(xlsxData)
  return mergeBackDataset(dataset, marks)
}
