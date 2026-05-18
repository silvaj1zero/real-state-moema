/**
 * Office — escritorio/filial (sede operacional do Broker).
 *
 * Transpilado conceitualmente de HomeHarvest (Pydantic OfficeSchema).
 * Estrutura mais leve que Broker — geralmente carrega contato direto
 * (telefone do escritorio, email institucional).
 *
 * Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
 *
 * PUREZA: TS puro (ADR-EPIC7-006).
 */

import { z } from 'zod'

export const OfficePhoneSchema = z.object({
  number: z.string(),
})

export type OfficePhone = z.infer<typeof OfficePhoneSchema>

export const OfficeSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  phones: z.array(OfficePhoneSchema).nullable(),
})

export type Office = z.infer<typeof OfficeSchema>
