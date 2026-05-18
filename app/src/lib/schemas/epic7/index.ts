/**
 * Epic 7 — Schemas Zod unificados (barrel export).
 *
 * Superficie publica do pacote `app/src/lib/schemas/epic7/`. Stories 7.2-7.9
 * consomem schemas/types DAQUI — nao via import direto dos arquivos
 * individuais — para preservar refactors internos.
 *
 * Path canonico definido em ADR-EPIC7-006 (in-app monolith).
 *
 * PUREZA: todos os modulos reexportados sao TS puros (sem imports Node
 * ou Next.js) para permitir copy-on-build em Apify Actors e Supabase
 * Edge Functions. Nao adicionar imports impuros aqui.
 */

// Agent (corretor pessoa fisica)
export {
  AgentSchema,
  AgentPhoneSchema,
  CreciRegex,
  type Agent,
  type AgentPhone,
} from './agent'

// Broker (imobiliaria pessoa juridica)
export {
  BrokerSchema,
  CnpjRegex,
  type Broker,
} from './broker'

// Builder (construtora)
export { BuilderSchema, type Builder } from './builder'

// Office (escritorio/filial)
export {
  OfficeSchema,
  OfficePhoneSchema,
  type Office,
  type OfficePhone,
} from './office'

// Advertisers (composicao + classificacao)
export {
  AdvertisersSchema,
  AdvertiserClassificationSchema,
  ClassificationSignalSchema,
  type Advertisers,
  type AdvertiserClassification,
  type ClassificationSignal,
} from './advertisers'

// HomeFlags (7 booleans discriminantes)
export { HomeFlagsSchema, type HomeFlags } from './home-flags'

// PropertyEpic7 (envelope crawler -> persistence)
export {
  PropertyEpic7Schema,
  PortalEnum,
  type PropertyEpic7,
  type Portal,
} from './property-epic7'
