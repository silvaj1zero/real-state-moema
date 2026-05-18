/**
 * Agent — corretor/agente imobiliario individual (pessoa fisica).
 *
 * Transpilado conceitualmente de HomeHarvest (Pydantic AgentSchema).
 * Extensoes BR: CRECI regex + creci_validated flag.
 *
 * Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
 *
 * PUREZA: TS puro. Sem imports Node-specific nem Next.js — permite copy-on-build
 * em Apify Actors e Supabase Edge Functions (ADR-EPIC7-006).
 */

import { z } from 'zod'

/**
 * Telefone do Agent. `type` reflete uso (mobile no Brasil indica linha pessoal,
 * sinal usado pela heuristica FISBO em Story 7.3).
 */
export const AgentPhoneSchema = z.object({
  number: z.string(),
  type: z.enum(['office', 'mobile', 'fax']).nullable(),
  primary: z.boolean().nullable(),
})

export type AgentPhone = z.infer<typeof AgentPhoneSchema>

/**
 * CRECI — Conselho Regional de Corretores de Imoveis.
 * Formato: 1-6 digitos + separador opcional + letra UF opcional.
 * Exemplos validos: "12345", "12345-F", "123/SP", "1-A".
 */
export const CreciRegex = /^\d{1,6}[-/]?[A-Z]?$/

export const AgentSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  phones: z.array(AgentPhoneSchema).nullable(),
  creci: z.string().regex(CreciRegex).nullable(),
  creci_validated: z.boolean().default(false),
})

export type Agent = z.infer<typeof AgentSchema>
