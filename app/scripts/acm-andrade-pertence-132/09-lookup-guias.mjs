/**
 * Crosscheck AUTORITATIVO de tipologia — guias ITBI oficiais (SF/PMSP).
 *
 * Procura os SQLs dos Top 10 do caso 132 (+ nº 45 da mesma rua) nos arquivos
 * "Guias de ITBI pagas" baixados da página oficial (acesso_a_informacao/31501)
 * e imprime Uso (IPTU), padrão, áreas e valores — a confirmação casa × condomínio
 * que a base em PROD ainda não tem (Story 9.4).
 *
 * Também lista TODAS as guias do logradouro ANDRADE PERTENCE (qualquer uso).
 *
 * Rodar de `app/`:
 *   node --max-old-space-size=6144 scripts/acm-andrade-pertence-132/09-lookup-guias.mjs %TEMP%\itbi-atual.xlsx %TEMP%\itbi-2024.xlsx
 */
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'

const ALVOS = [
  { sql: '29909601123', end: 'R BALUARTE 63' },
  { sql: '29911501165', end: 'R DR ANDRADE PERTENCE 110' },
  { sql: '29909401558', end: 'R BALUARTE 230' },
  { sql: '4111101860', end: 'AV PAVAO 139' },
  { sql: '4117200224', end: 'R UBAIRA 60' },
  { sql: '4117800485', end: 'AV COTOVIA 726' },
  { sql: '4117200100', end: 'R JURUENA 87' },
  { sql: '4115400234', end: 'R PARIQUERA-ACU 41' },
  { sql: '29911002924', end: 'AV DR CARDOSO DE MELO 463' },
  { sql: '4109501601', end: 'R ARAGUARI 545' },
  { sql: '29911602298', end: 'R DR ANDRADE PERTENCE 45' },
]
const digits = (s) => String(s ?? '').replace(/\D+/g, '')
const porSql = new Map(ALVOS.map((a) => [a.sql, a]))

const files = process.argv.slice(2)
if (!files.length) {
  console.error('uso: node 09-lookup-guias.mjs <arquivo1.xlsx> [arquivo2.xlsx ...]')
  process.exit(1)
}

for (const file of files) {
  console.log(`\n########## ${file}`)
  const wb = XLSX.read(readFileSync(file), { dense: true })
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true })
    if (rows.length < 2) continue
    // Acha a linha de cabeçalho (a 1ª que contém algo com "SQL" ou "Cadastro")
    let headerIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.some((c) => /cadastro|sql/i.test(String(c ?? ''))),
    )
    if (headerIdx < 0) headerIdx = 0
    const header = rows[headerIdx].map((c) => String(c ?? '').trim())
    const colSql = header.findIndex((c) => /cadastro|sql/i.test(c))
    if (colSql < 0) continue
    const colLogr = header.findIndex((c) => /logradouro/i.test(c))
    console.log(`\n--- aba "${sheetName}": ${rows.length - headerIdx - 1} linhas`)
    console.log(`colunas: ${header.filter(Boolean).join(' | ')}`)

    let hits = 0
    let ruaHits = 0
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i]
      if (!Array.isArray(r)) continue
      const sqlDigits = digits(r[colSql]).replace(/^0+/, '')
      const alvo = porSql.get(sqlDigits)
      const naRua =
        colLogr >= 0 && /ANDRADE\s+PERTENCE/i.test(String(r[colLogr] ?? ''))
      if (!alvo && !naRua) continue
      if (alvo) hits++
      if (naRua) ruaHits++
      const rec = Object.fromEntries(header.map((h, j) => [h || `col${j}`, r[j]]).filter(([, v]) => v != null && v !== ''))
      console.log(`\n>>> ${alvo ? `MATCH SQL ${alvo.sql} (${alvo.end})` : 'MESMA RUA'}`)
      console.log(JSON.stringify(rec, null, 1))
    }
    console.log(`\naba "${sheetName}": ${hits} match(es) de SQL, ${ruaHits} guia(s) no logradouro ANDRADE PERTENCE`)
  }
}
