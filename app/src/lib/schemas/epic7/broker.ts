/**
 * Broker — imobiliaria/corretora (pessoa juridica).
 *
 * Transpilado conceitualmente de HomeHarvest (Pydantic BrokerSchema).
 * Extensao BR: CNPJ regex (14 digitos, sem mascara).
 *
 * Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
 *
 * PUREZA: TS puro (ADR-EPIC7-006).
 */

import { z } from 'zod'

/**
 * CNPJ — Cadastro Nacional da Pessoa Juridica.
 * Formato: 14 digitos numericos (sem mascara/pontuacao).
 * Caller deve normalizar (`replace(/\D/g, '')`) antes de validar.
 */
export const CnpjRegex = /^\d{14}$/

export const BrokerSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  cnpj: z.string().regex(CnpjRegex).nullable(),
})

export type Broker = z.infer<typeof BrokerSchema>
