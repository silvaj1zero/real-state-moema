/**
 * PropertyEpic7 — envelope canonico do listing apos crawl, antes de
 * persistir em `scraped_listings`.
 *
 * Combina os 2 novos blocos Epic 7 (Advertisers + HomeFlags) com os
 * identificadores minimos que todo crawler emite. Campos especificos
 * do portal (preco, area, quartos, etc.) ficam em `raw_data` para nao
 * acoplar este schema a evolucao dos parsers — `scraped_listings`
 * permanece a fonte canonica das colunas escalares.
 *
 * Convencao: este schema descreve a interface CRAWLER -> PERSISTENCE.
 * Story 7.2 (PortalCrawler) emite isto; Story 7.5 (writer) persiste.
 *
 * Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
 *
 * PUREZA: TS puro (ADR-EPIC7-006).
 */

import { z } from 'zod'

import { AdvertisersSchema } from './advertisers'
import { HomeFlagsSchema } from './home-flags'

/**
 * Portais suportados Wave A. Sincronizado com `portal_scraping` enum
 * em Supabase (`20260318000001_000_extensions_and_types.sql`).
 */
export const PortalEnum = z.enum(['zap', 'olx', 'vivareal', 'mercadolivre'])

export type Portal = z.infer<typeof PortalEnum>

export const PropertyEpic7Schema = z.object({
  /** Portal de origem. */
  portal: PortalEnum,

  /** ID externo no portal (chave estavel para deduplicacao). */
  external_id: z.string().min(1),

  /** URL canonica do listing. */
  url: z.string().url(),

  /** Anunciante completo (Story 7.3 classifica). */
  advertisers: AdvertisersSchema.nullable(),

  /** Flags discriminantes (7 booleans, default false). */
  home_flags: HomeFlagsSchema,

  /**
   * Payload bruto especifico do portal. Mantemos sem schema rigido aqui
   * para permitir que parsers evoluam sem mudar este envelope. A
   * normalizacao para colunas escalares acontece no writer (Story 7.5).
   */
  raw_data: z.record(z.string(), z.unknown()).nullable(),
})

export type PropertyEpic7 = z.infer<typeof PropertyEpic7Schema>
