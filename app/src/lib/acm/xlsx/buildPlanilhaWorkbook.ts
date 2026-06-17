/**
 * Story 9.2 — Writer XLSX (exceljs) da planilha canônica. Aplica a formatação da
 * referência: cabeçalho navy, fill por faixa de rank (Top3 ouro / Top5 laranja /
 * demais gelo), hyperlink na coluna de anúncio, freeze do cabeçalho e auto-filter.
 * Recebe o `PlanilhaModel` puro (testável) e devolve um buffer .xlsx.
 */
import ExcelJS from 'exceljs'
import type { PlanilhaModel, PlanilhaSheet, Cell } from './planilhaModel'

const NAVY = 'FF001D4A'
const OURO = 'FFFCEFC7'
const LARANJA = 'FFFFE2C7'
const GELO = 'FFF1F5F9'
const LINK = 'FF2563EB'

function tierColor(rank: Cell): string | null {
  if (typeof rank !== 'number') return null
  if (rank <= 3) return OURO
  if (rank <= 5) return LARANJA
  return GELO
}

function writeSheet(wb: ExcelJS.Workbook, sheet: PlanilhaSheet): void {
  const ws = wb.addWorksheet(sheet.nome)
  ws.addRow(sheet.headers)

  // Cabeçalho navy + branco em negrito.
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })

  if (sheet.rows.length === 0 && sheet.emptyNote) {
    ws.addRow([sheet.emptyNote])
  } else {
    for (const r of sheet.rows) {
      // '' (vazio do modelo) → null (célula em branco, nunca "nan").
      const row = ws.addRow(r.map((c) => (c === '' ? null : c)))

      if (sheet.tierHighlight) {
        const color = tierColor(r[0])
        if (color) row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        })
      }

      if (sheet.linkCol != null) {
        const url = r[sheet.linkCol]
        if (typeof url === 'string' && /^https?:\/\//.test(url)) {
          const cell = row.getCell(sheet.linkCol + 1)
          cell.value = { text: 'ver anúncio', hyperlink: url }
          cell.font = { color: { argb: LINK }, underline: true }
        }
      }
    }
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.headers.length } }
  sheet.headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1)
    col.width = Math.min(46, Math.max(10, h.length + 4))
  })
}

/** Gera o workbook .xlsx e devolve o buffer (ArrayBuffer no browser / Buffer no Node). */
export async function buildPlanilhaWorkbook(model: PlanilhaModel): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RE/MAX Galeria · Moema'
  for (const sheet of model.sheets) writeSheet(wb, sheet)
  return wb.xlsx.writeBuffer()
}
