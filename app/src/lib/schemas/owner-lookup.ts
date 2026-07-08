/**
 * Owner lookup Zod schemas + payload contracts — Story 6.6.
 *
 * Contrato HTTP do POST /api/owners/lookup (consumido pela UI da Story 6.7):
 *   200 — success (fresh ou cache_hit)
 *   400 — body invalido
 *   401 — nao autenticado
 *   402 — budget mensal excedido (payload inclui budget_used/budget_limit)
 *   404 — cartorio nao localizou matricula (status='not_found')
 *   429 — rate limit/hora excedido (header Retry-After + rate_reset_at)
 *   502 — erro tecnico na consulta (status='failed', retry manual)
 *   503 — feature flag OFF (OWNER_LOOKUP_ENABLED != 'true' ou sem token)
 */

import { z } from 'zod'

/** Body do POST /api/owners/lookup — edificio OU lote avulso (AC1). */
export const ownerLookupRequestSchema = z.union([
  z.object({
    edificio_id: z.uuid(),
  }),
  z.object({
    sql_lote: z.string().trim().min(1).max(40),
    endereco: z.string().trim().min(3).max(300),
  }),
])

export type OwnerLookupRequest = z.infer<typeof ownerLookupRequestSchema>

export type OwnerLookupStatus = 'pending' | 'success' | 'failed' | 'not_found'

/** Metadados de consumo devolvidos em toda resposta (nota tecnica 6.7). */
export interface OwnerLookupUsage {
  rate_remaining: number
  rate_reset_at: string | null
  budget_used: number
  budget_limit: number
}

/** Payload consolidado devolvido pelo endpoint. */
export interface OwnerLookupResponse extends OwnerLookupUsage {
  lookup_id: string | null
  status: OwnerLookupStatus
  cache_hit: boolean
  /** Idade do cache em dias (0 quando fresh). */
  cache_age_days: number
  edificio_id: string | null
  sql_lote: string | null
  matricula: string | null
  nome_proprietario: string | null
  cpf_cnpj_masked: string | null
  cartorio: string | null
  data_matricula: string | null
  ultima_transacao: string | null
  custo_brl: number
  error_message: string | null
}

/** Corpo de erro estruturado (402/429/503). */
export interface OwnerLookupErrorBody extends Partial<OwnerLookupUsage> {
  error:
    | 'unauthenticated'
    | 'validation_failed'
    | 'edificio_not_found'
    | 'sql_lote_unresolved'
    | 'rate_limit_exceeded'
    | 'budget_exceeded'
    | 'owner_lookup_disabled'
    | 'lookup_failed'
  message?: string
}

/**
 * Mascara CPF/CNPJ preservando SOMENTE os 2 ultimos digitos (AC10 — LGPD).
 * Nunca armazene ou logue o documento completo.
 */
export function maskCpfCnpj(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 4) return null
  const last2 = digits.slice(-2)
  // CNPJ (14 digitos) tem sufixo -XX igual ao CPF; a mascara e uniforme.
  return `***.***.***-${last2}`
}
