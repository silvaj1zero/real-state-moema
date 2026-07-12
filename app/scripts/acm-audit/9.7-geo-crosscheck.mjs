/**
 * Story 9.7 — AC2: crosscheck geográfico whitelist × ITBI PROD (READ-ONLY).
 *
 * Objetivo:
 *  (a) Extrai distribuição de bairros das linhas fonte='itbi' via parse de `notas`
 *      e via cache ViaCEP dos builders (viacep-cache.json).
 *  (b) Compara com a whitelist canônica (BAIRROS_NO_RAIO_VILA_OLIMPIA + aliases).
 *  (c) Imprime tabela de divergências e grava resumo em docs/acm/CONFIG-GEOGRAFICA.md.
 *
 * ACHADO AC2 (2026-07-12): o campo `notas` armazena categoria de ingestão
 * "Moema e região" para TODOS os 3.618 registros ITBI — não o bairro individual.
 * O bairro granular é resolvido pelos builders 113/132 via ViaCEP por logradouro
 * (cache em scripts/acm-andrade-pertence/viacep-cache.json).
 *
 * Estratégia do crosscheck:
 *  (1) Lê o cache ViaCEP existente (derivado dos 2 builders sobre o raio de 1 km).
 *  (2) Compara os bairros resolvidos com a whitelist canônica.
 *  (3) Conta bairros do ITBI sem cobertura na whitelist e vice-versa.
 *
 * Acesso: supabase-js com SERVICE_ROLE_KEY (bypassa RLS) — READ-ONLY.
 * NUNCA escreve no banco.
 *
 * Uso (de app/ — tsx resolve o import .ts do geoConfig):
 *   npx -y tsx scripts/acm-audit/9.7-geo-crosscheck.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  BAIRROS_NO_RAIO_VILA_OLIMPIA,
  BAIRRO_NORMALIZADO,
  normalizaBairro,
  CONSULTANT_ID_DEFAULT,
} from '../../src/lib/acm/geoConfig.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- loadEnv (padrão dos vizinhos: inline sem dotenv) -----------------------
function loadEnv() {
  const envPath = resolve(__dirname, '../../.env.local')
  const raw = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    env[m[1]] = v
  }
  return env
}

const env = loadEnv()
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const CONSULTANT = process.env.ACM_CONSULTANT_ID || CONSULTANT_ID_DEFAULT

// Whitelist canônica IMPORTADA de geoConfig.ts (QA-fix 9.7: espelho local era
// uma cópia divergente nova — o anti-padrão que a story elimina).
const BAIRROS_NO_RAIO = BAIRROS_NO_RAIO_VILA_OLIMPIA

// Remoção de prefixo e honorífico para busca ViaCEP (espelho do builder)
const PREFIXOS = /^(R|AV|AL|TV|PC|EST|PCA)\s+/i
const HONORIFICOS = /^(DR|DRA|PROF|GAL|MAL|CEL|SEN|DEP|ENG|PE)\s+/i
function logradouroBusca(endereco) {
  let s = endereco.replace(/\s+\d+[A-Z]?$/i, '')
  s = s.replace(PREFIXOS, '')
  while (HONORIFICOS.test(s)) s = s.replace(HONORIFICOS, '')
  return s.trim()
}

console.log('\n=== 9.7 Geo Crosscheck — READ-ONLY ===')
console.log(`Consultant: ${CONSULTANT}`)
console.log('\nACHADO ESTRUTURAL: campo `notas` armazena categoria de ingestão')
console.log('"Moema e região" para TODOS os 3.618 registros ITBI.')
console.log('O bairro granular é resolvido via ViaCEP por logradouro (builders 113/132).')
console.log('Este script usa o cache ViaCEP existente + consulta endereços do raio.\n')

// ---------------------------------------------------------------------------
// (a) Estatísticas do banco (meta-info) — READ-ONLY
// ---------------------------------------------------------------------------
const { count: totalItbi, error: errCount } = await supa
  .from('acm_comparaveis')
  .select('*', { count: 'exact', head: true })
  .eq('consultant_id', CONSULTANT)
  .eq('fonte', 'itbi')
if (errCount) { console.error('Erro count:', errCount.message); process.exit(1) }

// Amostra de endereços do banco no raio (via fn_comparaveis_no_raio)
// Usa coordenadas canônicas do caso 113 (centro do raio de análise)
const LAT_REF = -23.604671
const LNG_REF = -46.675232

const { data: rpcRows, error: errRpc } = await supa.rpc('fn_comparaveis_no_raio', {
  p_lat: LAT_REF,
  p_lng: LNG_REF,
  p_consultant_id: CONSULTANT,
  p_raio_metros: 1000,
})
if (errRpc) { console.error('Erro RPC:', errRpc.message); process.exit(1) }

const itbiNoRaio = rpcRows.filter((r) => r.fonte === 'itbi' && r.is_venda_real)
console.log(`Total ITBI no banco (consultant): ${totalItbi}`)
console.log(`ITBI is_venda_real no raio 1km (lat=${LAT_REF}, lng=${LNG_REF}): ${itbiNoRaio.length}`)

// ---------------------------------------------------------------------------
// (b) Cache ViaCEP dos builders — bairros resolvidos por logradouro
// ---------------------------------------------------------------------------
const viacepCachePath = resolve(__dirname, '../acm-andrade-pertence/viacep-cache.json')
let viacepCache = {}
if (existsSync(viacepCachePath)) {
  viacepCache = JSON.parse(readFileSync(viacepCachePath, 'utf8'))
  console.log(`\nCache ViaCEP: ${Object.keys(viacepCache).length} logradouros`)
} else {
  console.warn('\nAVISO: viacep-cache.json não encontrado. Rode os builders 113/132 primeiro.')
}

// Distribuição de bairros no cache ViaCEP (bairro raw)
const distRaw = new Map()
const distNorm = new Map()
let semBairro = 0

for (const bairroRaw of Object.values(viacepCache)) {
  if (bairroRaw == null) {
    semBairro++
    continue
  }
  distRaw.set(bairroRaw, (distRaw.get(bairroRaw) ?? 0) + 1)
  const norm = normalizaBairro(bairroRaw)
  distNorm.set(norm, (distNorm.get(norm) ?? 0) + 1)
}

const totalCache = Object.keys(viacepCache).length || 1

console.log(`\nBairros resolvidos no cache: ${totalCache - semBairro}`)
console.log(`Inconclusivos (null): ${semBairro}`)

// Cruzar endereços do raio com o cache
const enderecosBanco = itbiNoRaio.map((r) => r.endereco)
const logradourosBanco = [...new Set(enderecosBanco.map(logradouroBusca))]
const logradourosNoCache = logradourosBanco.filter((l) => l in viacepCache)
const logradourosSemCache = logradourosBanco.filter((l) => !(l in viacepCache))

console.log(`\nLogradouros únicos no raio (banco): ${logradourosBanco.length}`)
console.log(`Cobertos pelo cache ViaCEP: ${logradourosNoCache.length}`)
console.log(`Sem cache (novos logradouros): ${logradourosSemCache.length}`)

// Distribuição de bairros para os endereços DO RAIO
const distRaioNorm = new Map()
let semBairroRaio = 0
for (const l of logradourosBanco) {
  const bairroRaw = viacepCache[l]
  if (bairroRaw == null) {
    semBairroRaio++
    continue
  }
  const norm = normalizaBairro(bairroRaw)
  distRaioNorm.set(norm, (distRaioNorm.get(norm) ?? 0) + 1)
}

const totalRaioResolvido = [...distRaioNorm.values()].reduce((a, b) => a + b, 0) || 1

console.log('\n--- Distribuição de bairros (logradouros do raio, normalizados) ---')
const sortedRaio = [...distRaioNorm.entries()].sort((a, b) => b[1] - a[1])
for (const [b, n] of sortedRaio) {
  const pct = ((n / totalRaioResolvido) * 100).toFixed(1)
  const naWhitelist = BAIRROS_NO_RAIO.has(b) || Object.values(BAIRRO_NORMALIZADO).includes(b)
  const flag = naWhitelist ? '✓' : '⚠ FORA DA WHITELIST'
  console.log(`  ${b.padEnd(28)} ${String(n).padStart(4)}  (${pct}%)  ${flag}`)
}

// ---------------------------------------------------------------------------
// (c) Divergências
// ---------------------------------------------------------------------------
const bairrosResolvidos = new Set(distRaioNorm.keys())
const bairrosNormalizadosWhitelist = new Set([
  ...BAIRROS_NO_RAIO,
  ...Object.values(BAIRRO_NORMALIZADO),
])

// Bairros resolvidos no ITBI fora da whitelist (pós-normalização)
const itbiForaWhitelist = [...bairrosResolvidos]
  .filter((b) => !bairrosNormalizadosWhitelist.has(b))
  .sort()

// Bairros da whitelist sem nenhuma ocorrência nos logradouros do raio
const whitelistSemItbi = [...bairrosNormalizadosWhitelist]
  .filter((b) => !bairrosResolvidos.has(b))
  .sort()

console.log('\n--- DIVERGÊNCIAS ---')
if (itbiForaWhitelist.length === 0) {
  console.log('Bairros resolvidos fora da whitelist: nenhum ✓')
} else {
  console.log(`Bairros fora da whitelist (${itbiForaWhitelist.length}):`)
  for (const b of itbiForaWhitelist) {
    console.log(`  ⚠  ${b}  (${distRaioNorm.get(b)} logradouros)`)
  }
}

if (whitelistSemItbi.length === 0) {
  console.log('Bairros da whitelist sem logradouros no raio: nenhum ✓')
} else {
  console.log(`Bairros da whitelist sem logradouros no raio (${whitelistSemItbi.length}):`)
  for (const b of whitelistSemItbi) {
    console.log(`  ℹ  ${b}  (whitelist mas sem logradouro resolvido no raio)`)
  }
}

if (logradourosSemCache.length > 0) {
  console.log(`\nLogradouros do raio SEM cache ViaCEP (${logradourosSemCache.length} novos):`)
  for (const l of logradourosSemCache.slice(0, 10)) console.log(`  - ${l}`)
  if (logradourosSemCache.length > 10) console.log(`  ... e mais ${logradourosSemCache.length - 10}`)
}

// ---------------------------------------------------------------------------
// Atualização do doc CONFIG-GEOGRAFICA.md (seção de validação)
// ---------------------------------------------------------------------------
const repoRoot = resolve(__dirname, '../../..')
const docPath = resolve(repoRoot, 'docs/acm/CONFIG-GEOGRAFICA.md')
const dataHoje = new Date().toISOString().slice(0, 10)

const tabelaDistribuicao = sortedRaio.length > 0
  ? sortedRaio.map(([b, n]) => {
      const pct = ((n / totalRaioResolvido) * 100).toFixed(1)
      const ok = bairrosNormalizadosWhitelist.has(b) ? '✓' : '⚠ FORA'
      return `| ${b} | ${n} | ${pct}% | ${ok} |`
    }).join('\n')
  : '| (cache ViaCEP ausente — rode os builders 113/132 para popular) | — | — | — |'

const secaoValidacao = `
## Validação contra ITBI PROD — ${dataHoje}

**Script:** \`app/scripts/acm-audit/9.7-geo-crosscheck.mjs\`
**Consultant:** \`${CONSULTANT}\`
**Ponto de referência:** lat=${LAT_REF}, lng=${LNG_REF} (Andrade Pertence 113)

### Contexto: formato do campo \`notas\`

O campo \`notas\` da tabela \`acm_comparaveis\` armazena a **categoria de ingestão**
no formato \`[ITBI] SQL <sql>; Moema e região\` — todos os 3.618 registros ITBI
têm exatamente \`"Moema e região"\` como valor após o ponto-e-vírgula.

Isso confirma que o campo **não** armazena o bairro granular por comparável.
O bairro individual é resolvido pelos builders via **ViaCEP por logradouro**
(cache em \`scripts/acm-andrade-pertence/viacep-cache.json\`).

### Estatísticas do banco

| Métrica | Valor |
|---------|-------|
| Total ITBI no banco (consultant) | ${totalItbi} |
| ITBI is_venda_real no raio 1 km | ${itbiNoRaio.length} |
| Logradouros únicos no raio | ${logradourosBanco.length} |
| Cobertos pelo cache ViaCEP | ${logradourosNoCache.length} |
| Sem cache (novos logradouros) | ${logradourosSemCache.length} |
| Inconclusivos no cache (null) | ${semBairroRaio} |

### Distribuição por bairro (logradouros do raio, pós-normalização)

| Bairro | N logradouros | % | Whitelist |
|--------|--------------|---|-----------|
${tabelaDistribuicao}

### Divergências

**Bairros resolvidos fora da whitelist:** ${itbiForaWhitelist.length === 0
  ? 'nenhum ✓'
  : itbiForaWhitelist.map((b) => `${b} (${distRaioNorm.get(b)}×)`).join(', ')}

**Bairros da whitelist sem logradouros no raio:** ${whitelistSemItbi.length === 0
  ? 'nenhum ✓'
  : whitelistSemItbi.join(', ')}

**Logradouros do raio sem cache ViaCEP:** ${logradourosSemCache.length} novos${
  logradourosSemCache.length > 0 ? ' (rodar ViaCEP para completar cobertura)' : ''
}

### Conclusão AC2

${itbiForaWhitelist.length === 0
  ? 'Todos os bairros resolvidos via ViaCEP nos logradouros do raio estão cobertos pela whitelist canônica. Cobertura nominal validada.'
  : `ATENÇÃO: ${itbiForaWhitelist.length} bairro(s) fora da whitelist — revisar se devem entrar na config canônica.`
}
`

if (existsSync(docPath)) {
  let conteudo = readFileSync(docPath, 'utf8')
  const MARKER = '\n## Validação contra ITBI PROD'
  const idx = conteudo.indexOf(MARKER)
  if (idx !== -1) {
    conteudo = conteudo.slice(0, idx) + secaoValidacao
  } else {
    conteudo = conteudo.trimEnd() + '\n' + secaoValidacao
  }
  writeFileSync(docPath, conteudo)
  console.log(`\nDoc atualizado: ${docPath}`)
} else {
  console.warn(`\nAVISO: ${docPath} não encontrado.`)
  console.log(secaoValidacao)
}

console.log('\n=== fim do crosscheck ===')
