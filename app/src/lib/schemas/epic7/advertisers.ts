/**
 * Advertisers — composicao do anunciante completo de um listing.
 *
 * Combina Agent + Broker + Builder + Office em um unico nodo, espelhando
 * exatamente o pattern HomeHarvest (Realtor.com MLS schema). Cada slot e
 * opcional (`.nullable()`) porque um anuncio pode ter so 1 ou ate 4
 * entidades preenchidas (ex.: FISBO = none; Agent + Broker = comum).
 *
 * AC2: `AdvertiserClassification` enum com 5 categorias canonicas:
 *   - agent: corretor pessoa fisica com CRECI
 *   - broker: imobiliaria pessoa juridica
 *   - builder: construtora/incorporadora
 *   - for_sale_by_owner: FISBO (proprietario anunciando direto)
 *   - unknown: classificacao nao foi possivel (default seguro)
 *
 * `classification_confidence` (0-1) e `classification_signals` (rastreabilidade
 * dos sinais que levaram a decisao) sao preenchidos pelo `classifyAdvertiser`
 * em Story 7.3.
 *
 * Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
 *
 * PUREZA: TS puro (ADR-EPIC7-006).
 */

import { z } from 'zod'

import { AgentSchema } from './agent'
import { BrokerSchema } from './broker'
import { BuilderSchema } from './builder'
import { OfficeSchema } from './office'

/**
 * AC2 — 5 categorias canonicas + unknown.
 *
 * `for_sale_by_owner` segue a convencao MLS internacional (FISBO).
 * Mantemos `unknown` como fallback explicito (em vez de `null`) para
 * forcar leituras downstream a tratarem o caso indeterminado.
 */
export const AdvertiserClassificationSchema = z.enum([
  'agent',
  'broker',
  'builder',
  'for_sale_by_owner',
  'unknown',
])

export type AdvertiserClassification = z.infer<
  typeof AdvertiserClassificationSchema
>

/**
 * Vocabulario fechado de sinais que justificam a classificacao.
 * Story 7.3 (classifyAdvertiser) preenche este array; Story 7.7
 * (creciService) pode adicionar `has_creci`.
 *
 * Sinais alinhados a heuristica FISBO Wave 2 (ADR-EPIC7-004).
 */
export const ClassificationSignalSchema = z.enum([
  'ddd_mobile',
  'no_creci_match',
  'single_listing',
  'name_appears_personal',
  'cnpj_match_construtora',
  'cnpj_match_imobiliaria',
  'has_creci',
])

export type ClassificationSignal = z.infer<typeof ClassificationSignalSchema>

export const AdvertisersSchema = z.object({
  agent: AgentSchema.nullable(),
  broker: BrokerSchema.nullable(),
  builder: BuilderSchema.nullable(),
  office: OfficeSchema.nullable(),
  classification: AdvertiserClassificationSchema,
  classification_confidence: z.number().min(0).max(1),
  classification_signals: z.array(ClassificationSignalSchema),
})

export type Advertisers = z.infer<typeof AdvertisersSchema>
