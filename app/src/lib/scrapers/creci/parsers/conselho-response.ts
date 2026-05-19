/**
 * Epic 7 Story 7.7 — Conselho Nacional CRECI HTML response parser.
 *
 * Regex-based extraction per BR-COFECI-004 (anatomy doc:
 * `docs/code-anatomy/buscacreci/07-business-rules.md`).
 *
 * Why regex (no cheerio):
 *  - Mantem zero dependencias novas (cheerio nao esta em package.json)
 *  - HTML do Conselho Nacional eh estavel e simples (tabela Quasar/Vue)
 *  - Anatomy doc fornece transcription regex-only validada (Sec. BR-COFECI-004)
 *  - Parser puro testavel offline com fixtures
 *
 * PUREZA: TS puro, zero IO, zero deps externas. Apto para copy-on-build.
 */

export interface CreciResultado {
  inscricao: string
  nomeCompleto: string
  situacao: 'Ativo' | 'Inativo'
  telefone: string
}

/**
 * Parseia resposta HTML do Conselho Nacional CRECI (POST
 * `/form_pesquisa_cadastro_geral_site.php`).
 *
 * Implementacao verbatim de BR-COFECI-004 (regex alternative) per
 * `Conselho/CreciConselhoPlataformaImplementacao.php:106-160`.
 *
 * Comportamento:
 *  - Retorna `null` se sem `<tbody>` (zero resultados)
 *  - Retorna `null` se primeira linha tem menos que 6 `<td>`
 *  - Retorna `null` se nome ou inscricao vazios apos parse
 *  - Telefone "NAO DIVULGADO" -> string vazia
 *  - "ATIVO" sem "INATIVO" -> Ativo; senao Inativo
 */
export function parseConselhoResponse(html: string): CreciResultado | null {
  if (!html || !html.includes('<tbody>')) return null

  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
  if (!tbodyMatch) return null

  const trMatch = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/i)
  if (!trMatch) return null

  const tds = Array.from(
    trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
  ).map((m) => m[1])

  if (tds.length < 6) return null

  // td[1] — nome dentro de <div>; fallback strip_tags se sem div
  const nomeDivMatch = tds[1].match(/<div[^>]*>([\s\S]*?)<\/div>/i)
  const nomeCompleto = (
    nomeDivMatch ? nomeDivMatch[1] : tds[1]
  )
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const inscricao = stripTags(tds[2])
  const situacaoRaw = stripTags(tds[3]).toUpperCase()
  const telefoneRaw = stripTags(tds[5])

  if (!nomeCompleto || !inscricao) return null

  // BR-COFECI-004 regra 5: "ATIVO" sem "INATIVO" classifica Ativo.
  // Cuidado: "INATIVO" contem "ATIVO" como substring — ordem importa.
  const situacao: 'Ativo' | 'Inativo' =
    situacaoRaw.includes('ATIVO') && !situacaoRaw.includes('INATIVO')
      ? 'Ativo'
      : 'Inativo'

  // BR-COFECI-004 regra 5: "DIVULGADO" (parte de "NAO DIVULGADO") -> vazio
  const telefone = telefoneRaw.toUpperCase().includes('DIVULGADO')
    ? ''
    : telefoneRaw

  return { inscricao, nomeCompleto, situacao, telefone }
}

/**
 * Normaliza telefone para formato E.164 BR (+55XXXXXXXXXXX).
 *
 * Aceita formatos:
 *  - "(11) 99999-9999" -> "+5511999999999"
 *  - "11999999999"     -> "+5511999999999"
 *  - "+55 11 99999-9999" -> "+5511999999999"
 *  - "" / null -> ""
 *
 * Retorna string vazia se input invalido (nao gera string truncada).
 */
export function normalizeTelefoneE164(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return ''

  // 11 digits = DDD + numero (mobile); 10 = DDD + numero (fixo)
  // Aceita 12-13 digitos quando ja tem 55 prefix
  let normalized = digits
  if (normalized.length === 13 && normalized.startsWith('55')) {
    // ok, ja tem country code
  } else if (normalized.length === 12 && normalized.startsWith('55')) {
    // ok, ja tem country code (fixo)
  } else if (normalized.length === 11 || normalized.length === 10) {
    normalized = '55' + normalized
  } else {
    return ''
  }

  return '+' + normalized
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
