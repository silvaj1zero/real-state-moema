/**
 * Builder — construtora/incorporadora (pessoa juridica).
 *
 * Transpilado conceitualmente de HomeHarvest (Pydantic BuilderSchema).
 * Extensao BR: CNPJ regex.
 *
 * Distincao Broker vs Builder no contexto BR e feita por CNAE
 * (4110700/4120400 = Builder; 6822500/6831700 = Broker) — logica
 * em Story 7.3.
 *
 * Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
 *
 * PUREZA: TS puro (ADR-EPIC7-006).
 */

import { z } from 'zod'
import { CnpjRegex } from './broker'

export const BuilderSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  cnpj: z.string().regex(CnpjRegex).nullable(),
})

export type Builder = z.infer<typeof BuilderSchema>
