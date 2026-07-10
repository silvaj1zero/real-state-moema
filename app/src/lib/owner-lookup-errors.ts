/**
 * Taxonomia de erros do owner lookup — Story 6.7 (AC1/AC4).
 *
 * Mapeia o resultado da mutation (payload 200/404 ou OwnerLookupMutationError
 * com HTTP status) para o estado de UI do modal/botao. Puro e testavel.
 */

import { OwnerLookupMutationError } from '@/hooks/useOwnerLookup'
import type { OwnerLookupErrorBody, OwnerLookupResponse } from '@/lib/schemas/owner-lookup'

export type OwnerLookupUiState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'not_found'
  | 'error'
  | 'forbidden'
  | 'budget_exceeded'
  | 'disabled'

export interface OwnerLookupUiError {
  state: Exclude<OwnerLookupUiState, 'idle' | 'loading' | 'success'>
  message: string
}

function formatHHMM(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatBrl(v: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

/** Mensagens dos ACs 4 (mapeadas por HTTP status / payload). */
export function mapOwnerLookupError(err: unknown): OwnerLookupUiError {
  if (err instanceof OwnerLookupMutationError) {
    const body = (err.body ?? {}) as Partial<OwnerLookupErrorBody>

    switch (err.httpStatus) {
      case 429:
        return {
          state: 'forbidden',
          message: `Limite de 30 consultas/hora atingido. Tente novamente após ${formatHHMM(body.rate_reset_at)}.`,
        }
      case 402:
        return {
          state: 'budget_exceeded',
          message: `Orçamento mensal de consultas atingido (${formatBrl(body.budget_used)} de ${formatBrl(body.budget_limit)}). Aguarde próximo mês ou ajuste em Configurações.`,
        }
      case 503:
        return {
          state: 'disabled',
          message: 'Consulta a cartório ainda não ativada (aguardando contratação da API). Fale com o administrador.',
        }
      default:
        return {
          state: 'error',
          message: 'Erro ao consultar cartório. Tente novamente.',
        }
    }
  }

  return { state: 'error', message: 'Erro ao consultar cartório. Tente novamente.' }
}

/** Estado de UI derivado de um payload 2xx/404 do endpoint. */
export function mapOwnerLookupResult(result: OwnerLookupResponse): OwnerLookupUiState {
  if (result.status === 'success') return 'success'
  if (result.status === 'not_found') return 'not_found'
  return 'error'
}

/** Mensagem do estado not_found (AC4) — link GeoSampa renderizado pela UI. */
export const NOT_FOUND_MESSAGE = 'Cartório não localizou matrícula para este endereço.'
export const GEOSAMPA_URL = 'https://geosampa.prefeitura.sp.gov.br/'
