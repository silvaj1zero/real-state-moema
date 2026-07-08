/**
 * Infosimples/ARISP client — Story 6.6 (AC7).
 *
 * FRONTEIRA DA API PAGA (decisao do plano 2026-07-08):
 *   A consulta real custa R$0,28/chamada e SO roda quando
 *   `OWNER_LOOKUP_ENABLED=true` E `INFOSIMPLES_TOKEN` estiverem no ambiente.
 *   Com a flag OFF (default), `isOwnerLookupEnabled()` retorna false e o
 *   endpoint responde 503 sem tocar a API — zero consumo de credito.
 *
 * Contrato assumido (envelope padrao Infosimples v2, a confirmar quando a
 * credencial for contratada): `{ code, code_message, data: [...], errors }`
 * onde code 200 = sucesso e codes 600-619 = consulta valida sem resultado.
 * Ajustar o parser em `parseInfosimplesEnvelope` se o contrato divergir.
 */

import { maskCpfCnpj } from '@/lib/schemas/owner-lookup'

const INFOSIMPLES_URL = 'https://api.infosimples.com/api/v2/consultas/arisp/certidao'
const TIMEOUT_MS = 20_000
const RETRY_BACKOFF_MS = [1_000, 3_000] // 2 retries: 1s, 3s (AC7)

/** Custo por consulta em BRL (valor 2026 — AC5/nota tecnica). */
export const OWNER_LOOKUP_COST_BRL = 0.28

export interface InfosimplesEnv {
  OWNER_LOOKUP_ENABLED?: string
  INFOSIMPLES_TOKEN?: string
  // Index signature: aceita process.env (ProcessEnv) sem cast.
  [key: string]: string | undefined
}

/** Flag OFF por default: exige opt-in explicito + token (custo por consulta). */
export function isOwnerLookupEnabled(env: InfosimplesEnv = process.env): boolean {
  return env.OWNER_LOOKUP_ENABLED === 'true' && Boolean(env.INFOSIMPLES_TOKEN)
}

export type InfosimplesResult =
  | {
      status: 'success'
      matricula: string | null
      nome_proprietario: string | null
      cpf_cnpj_masked: string | null
      cartorio: string | null
      data_matricula: string | null
      ultima_transacao: string | null
      raw: unknown
    }
  | { status: 'not_found'; raw: unknown }
  | { status: 'failed'; errorMessage: string }

interface InfosimplesEnvelope {
  code?: number
  code_message?: string
  data?: Array<Record<string, unknown>>
  errors?: unknown[]
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

/** Exportado para teste unitario direto do parser. */
export function parseInfosimplesEnvelope(envelope: InfosimplesEnvelope): InfosimplesResult {
  const code = envelope.code ?? 0

  if (code >= 600 && code <= 619) {
    return { status: 'not_found', raw: envelope }
  }

  if (code !== 200) {
    return {
      status: 'failed',
      errorMessage: `Infosimples code ${code}: ${envelope.code_message ?? 'erro desconhecido'}`,
    }
  }

  const first = envelope.data?.[0]
  if (!first) {
    return { status: 'not_found', raw: envelope }
  }

  return {
    status: 'success',
    matricula: str(first.matricula),
    nome_proprietario: str(first.proprietario) ?? str(first.nome_proprietario),
    // LGPD (AC10): mascara ANTES de qualquer persistencia/log.
    cpf_cnpj_masked: maskCpfCnpj(str(first.documento) ?? str(first.cpf_cnpj)),
    cartorio: str(first.cartorio),
    data_matricula: str(first.data_matricula),
    ultima_transacao: str(first.ultima_transacao) ?? str(first.data_ultima_transacao),
    raw: envelope,
  }
}

export interface ConsultarOptions {
  fetchImpl?: typeof fetch
  env?: InfosimplesEnv
  /** Injetavel p/ teste — default: setTimeout real. */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Consulta a certidao ARISP pelo SQL do lote. Timeout 20s, 2 retries com
 * backoff 1s/3s em erro tecnico (nunca re-tenta not_found — evita custo).
 */
export async function consultarCartorioArisp(
  sqlLote: string,
  opts: ConsultarOptions = {},
): Promise<InfosimplesResult> {
  const env = opts.env ?? process.env
  const fetchImpl = opts.fetchImpl ?? fetch
  const sleep = opts.sleep ?? defaultSleep

  if (!isOwnerLookupEnabled(env)) {
    return {
      status: 'failed',
      errorMessage: 'owner_lookup_disabled: OWNER_LOOKUP_ENABLED != true ou INFOSIMPLES_TOKEN ausente',
    }
  }

  let lastError = 'unknown'

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BACKOFF_MS[attempt - 1])
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetchImpl(INFOSIMPLES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: env.INFOSIMPLES_TOKEN,
          sql: sqlLote,
          timeout: Math.floor(TIMEOUT_MS / 1000),
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        lastError = `HTTP ${res.status}`
        continue // erro tecnico → retry
      }

      const envelope = (await res.json()) as InfosimplesEnvelope
      const parsed = parseInfosimplesEnvelope(envelope)

      // failed vindo do envelope e erro de negocio/tecnico da API — retry
      // pode resolver instabilidade; success/not_found sao terminais.
      if (parsed.status === 'failed') {
        lastError = parsed.errorMessage
        continue
      }
      return parsed
    } catch (err) {
      lastError = controller.signal.aborted
        ? `timeout apos ${TIMEOUT_MS / 1000}s`
        : err instanceof Error
          ? err.message
          : 'network error'
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  return { status: 'failed', errorMessage: lastError }
}
