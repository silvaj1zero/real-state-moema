/**
 * Backfill de TIPOLOGIA por guia oficial — casos 113 e 132 (amostra inteira).
 *
 * Causa-raiz descoberta (09-Jul): a ingestão da base em PROD descartou o campo
 * "Complemento" da guia ("AP 82", "AP 31 E 2VG"...), então unidades de condomínio
 * viraram endereços de rua com venda única — furando o proxy R3 em escala (o
 * operador confirmou vários edifícios no Google Maps).
 *
 * Este script faz o crosscheck AUTORITATIVO: para cada comparável (SQL da guia),
 * procura nos arquivos oficiais "Guias de ITBI pagas" (SF/PMSP, página
 * acesso_a_informacao/31501) e grava uso/padrão/complemento/área de terreno/
 * fração/ACC. Vendas 2026 ainda sem arquivo público ficam "sem guia pública";
 * para elas registra-se a heurística de lote (unidade condominial tem lote da
 * faixa alta; casas dos 5 Top Honduras têm todas lote ≤ 0046).
 *
 * Uso (de `app/`):
 *   node --max-old-space-size=6144 scripts/acm-andrade-pertence-132/10-backfill-tipologia.mjs \
 *     %TEMP%\itbi-2023.xlsx %TEMP%\itbi-2024.xlsx %TEMP%\itbi-atual.xlsx
 *
 * Saída: docs/acm/andrade-pertence-113/tipologia-guias.json
 *        docs/acm/andrade-pertence-132/tipologia-guias.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
// Story 9.17 — classificação canônica (sem 4ª cópia da regra R5).
// Rodar com: npx tsx --max-old-space-size=6144 scripts/.../10-backfill-tipologia.mjs ...
import {
  classificarDeGuias,
  confiancaLegado,
  digitsSql,
} from '../../src/lib/acm/tipologia.ts'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const CASOS = [
  path.join(repoRoot, 'docs', 'acm', 'andrade-pertence-113'),
  path.join(repoRoot, 'docs', 'acm', 'andrade-pertence-132'),
]

// --- SQLs procurados (união dos dois datasets) -------------------------------
const datasets = CASOS.map((dir) => ({
  dir,
  data: JSON.parse(readFileSync(path.join(dir, 'dataset.json'), 'utf8')),
}))
const wanted = new Set()
for (const { data } of datasets) {
  for (const c of data.comparaveis) if (c.sqlCadastral) wanted.add(digitsSql(c.sqlCadastral))
}
console.log(`SQLs procurados (união 113+132): ${wanted.size}`)

// --- varre os arquivos oficiais, guardando só os matches ---------------------
const files = process.argv.slice(2)
if (!files.length) {
  console.error('uso: node 10-backfill-tipologia.mjs <guias1.xlsx> [guias2.xlsx ...]')
  process.exit(1)
}
const guiaPorSql = new Map() // sqlDigits → registro (última guia vence; guarda todas em lista)
for (const file of files) {
  const wb = XLSX.read(readFileSync(file), { dense: true })
  let matches = 0
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true })
    if (rows.length < 2) continue
    let headerIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.some((c) => /cadastro|sql/i.test(String(c ?? ''))),
    )
    if (headerIdx < 0) continue
    const header = rows[headerIdx].map((c) => String(c ?? '').trim())
    const col = (re) => header.findIndex((c) => re.test(c))
    const iSql = col(/cadastro|sql/i)
    if (iSql < 0) continue
    const idx = {
      logradouro: col(/logradouro/i),
      numero: col(/^número$/i),
      complemento: col(/complemento/i),
      valor: col(/valor de transação/i),
      areaTerreno: col(/área do terreno/i),
      areaConstruida: col(/área construída/i),
      fracao: col(/fração ideal/i),
      testada: col(/testada/i),
      usoDesc: col(/descrição do uso/i),
      padraoDesc: col(/descrição do padrão/i),
      acc: col(/^acc/i),
      natureza: col(/natureza/i),
    }
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i]
      if (!Array.isArray(r)) continue
      const sql = digitsSql(r[iSql])
      if (!wanted.has(sql)) continue
      matches++
      const rec = {
        arquivo: path.basename(file),
        aba: sheetName,
        logradouro: r[idx.logradouro] ?? null,
        numero: r[idx.numero] ?? null,
        complemento: r[idx.complemento] ?? null,
        natureza: r[idx.natureza] ?? null,
        valor: r[idx.valor] ?? null,
        areaTerrenoGuia: r[idx.areaTerreno] ?? null,
        areaConstruidaGuia: r[idx.areaConstruida] ?? null,
        fracaoIdeal: r[idx.fracao] ?? null,
        testadaM: r[idx.testada] ?? null,
        usoIptu: r[idx.usoDesc] ?? null,
        padraoIptu: r[idx.padraoDesc] ?? null,
        anoConstrucaoIptu: r[idx.acc] ?? null,
      }
      const lista = guiaPorSql.get(sql) ?? []
      lista.push(rec)
      guiaPorSql.set(sql, lista)
    }
  }
  console.log(`${path.basename(file)}: ${matches} guia(s) de SQLs procurados`)
}

// --- classificação (canônica Story 9.17: app/src/lib/acm/tipologia.ts) --------
// --- grava por caso ------------------------------------------------------------
for (const { dir, data } of datasets) {
  const out = []
  const contagem = new Map()
  for (const c of data.comparaveis) {
    const sql = c.sqlCadastral ? digitsSql(c.sqlCadastral) : null
    const guias = sql ? (guiaPorSql.get(sql) ?? null) : null
    const classif = classificarDeGuias(guias, sql)
    const cls = {
      tipologia: sql ? classif.rotulo : 'sem SQL',
      confianca: sql ? confiancaLegado(classif) : 'não classificável',
      tipo: classif.tipo,
      fonte: classif.fonte,
      motivos: classif.motivos,
    }
    contagem.set(cls.tipologia, (contagem.get(cls.tipologia) ?? 0) + 1)
    out.push({
      endereco: c.endereco,
      sqlCadastral: c.sqlCadastral,
      dataVenda: c.dataVenda,
      preco: c.preco,
      areaBase: c.areaConstruida,
      ...cls,
      guia: guias ? guias[guias.length - 1] : null,
      guiasEncontradas: guias?.length ?? 0,
    })
  }
  const resumo = Object.fromEntries([...contagem.entries()].sort((a, b) => b[1] - a[1]))
  const outPath = path.join(dir, 'tipologia-guias.json')
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        fonte:
          'Guias de ITBI pagas — SF/PMSP (capital.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501): 2023, 2024 e consolidado 28-01-2026 (até dez/2025). Guias 2026 ainda sem arquivo público.',
        resumo,
        itens: out,
      },
      null,
      2,
    ),
  )
  console.log(`\n${path.basename(dir)} → ${outPath}`)
  console.log('  ', resumo)
}
