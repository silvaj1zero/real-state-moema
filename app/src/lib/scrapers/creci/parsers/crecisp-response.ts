/**
 * Epic 7 Story 7.7 — CRECI SP HTML response parser.
 *
 * Per BR-CRECISP-001 (anatomy doc:
 * `docs/code-anatomy/buscacreci/07-business-rules.md`).
 *
 * STATUS Wave A (mar/2026): CRECI SP scraper "temporarily_disabled" devido a
 * reCAPTCHA Enterprise validation falhando server-side. Parser permanece
 * implementado e testavel — detecta a mensagem de falha e retorna error
 * code apropriado para que `creciService.lookup` retorne `null` com
 * `error_code='crecisp_unavailable'`.
 */

export type CRECISPParseResult =
  | { ok: true; nomeCompleto: string; inscricao: string; telefone: string }
  | { ok: false; errorCode: 'crecisp_unavailable' | 'crecisp_not_found' | 'crecisp_invalid_html' }

const RECAPTCHA_FAIL_MARKERS = [
  'Validação reCAPTCHA',
  'Validacao reCAPTCHA',
  'erro na validação do capatcha',
  'erro na validacao do capatcha',
  'reCAPTCHA Enterprise',
]

/**
 * Parseia resposta HTML do POST a `/cidadao/buscaporcorretores`.
 *
 * Retorna:
 *  - `{ ok:false, errorCode:'crecisp_unavailable' }` se reCAPTCHA falhou
 *  - `{ ok:false, errorCode:'crecisp_not_found' }` se HTML valido sem resultado
 *  - `{ ok:false, errorCode:'crecisp_invalid_html' }` se HTML totalmente vazio
 *  - `{ ok:true, ... }` se conseguiu extrair (provavelmente nunca Wave A)
 */
export function parseCRECISPResponse(html: string): CRECISPParseResult {
  if (!html || html.length < 10) {
    return { ok: false, errorCode: 'crecisp_invalid_html' }
  }

  // Detecta failure de captcha (modo conhecido mar/2026)
  for (const marker of RECAPTCHA_FAIL_MARKERS) {
    if (html.includes(marker)) {
      return { ok: false, errorCode: 'crecisp_unavailable' }
    }
  }

  // Tenta extrair link de detalhes do corretor
  const detalheMatch = html.match(/href="([^"]*corretordetalhes[^"]*)"/i)
  if (!detalheMatch) {
    return { ok: false, errorCode: 'crecisp_not_found' }
  }

  // Best-effort name extraction; primeiro <h1> ou <strong> proximo ao link
  const nameMatch =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ??
    html.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)
  const nomeCompleto = nameMatch
    ? stripTags(nameMatch[1])
    : ''

  // Inscricao costuma estar em formato "CRECI-SP 12345"
  const inscMatch = html.match(/CRECI[-\s]?SP[^\d]*(\d{3,7})/i)
  const inscricao = inscMatch ? inscMatch[1] : ''

  // Telefone — heuristica simples; mar/2026 raramente alcanca este branch
  const telMatch = html.match(/(\+?\s*55[\s\-()]*)?\(?\d{2}\)?[\s\-]*\d{4,5}[\s\-]?\d{4}/)
  const telefone = telMatch ? telMatch[0] : ''

  if (!nomeCompleto || !inscricao) {
    return { ok: false, errorCode: 'crecisp_not_found' }
  }

  return { ok: true, nomeCompleto, inscricao, telefone }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
