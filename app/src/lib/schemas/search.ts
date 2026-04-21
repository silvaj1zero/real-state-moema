import { z } from 'zod'

/**
 * Validação de input para rotas /api/search/*
 *
 * - lat/lng: limites razoáveis do globo (o app opera em São Paulo)
 * - raio_metros: 50m a 10km (filtro do UI permite valores discretos nesse range)
 * - limit: até 500 para evitar OOM no PostgREST
 */

export const LocalSearchSchema = z.object({
  p_lat: z.number().gte(-90).lte(90),
  p_lng: z.number().gte(-180).lte(180),
  p_raio_metros: z.number().int().gte(10).lte(10000).default(2000),
  p_quartos_min: z.number().int().gte(0).lte(20).nullable().optional(),
  p_quartos_max: z.number().int().gte(0).lte(20).nullable().optional(),
  p_area_min: z.number().gte(0).lte(100000).nullable().optional(),
  p_area_max: z.number().gte(0).lte(100000).nullable().optional(),
  p_preco_min: z.number().gte(0).nullable().optional(),
  p_preco_max: z.number().gte(0).nullable().optional(),
  p_bairros: z.array(z.string().min(1).max(100)).max(20).nullable().optional(),
  p_fisbo_only: z.boolean().default(false),
  p_portal: z.enum(['zap', 'olx', 'vivareal']).nullable().optional(),
  p_limit: z.number().int().gte(1).lte(500).default(100),
})

export type LocalSearchInput = z.infer<typeof LocalSearchSchema>

const PortalEnum = z.enum(['zap', 'olx', 'vivareal'])

export const PortalSearchParamsSchema = z.object({
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
  raio_metros: z.number().int().gte(10).lte(10000).optional(),
  bairros: z.array(z.string().min(1).max(100)).max(20).optional(),
  quartos_min: z.number().int().gte(0).lte(20).optional(),
  quartos_max: z.number().int().gte(0).lte(20).optional(),
  area_min: z.number().gte(0).lte(100000).optional(),
  area_max: z.number().gte(0).lte(100000).optional(),
  preco_min: z.number().gte(0).optional(),
  preco_max: z.number().gte(0).optional(),
  fisbo_only: z.boolean().optional(),
  max_items_per_portal: z.number().int().gte(1).lte(500).optional(),
})

export const ParametricSearchSchema = z.object({
  consultant_id: z.string().uuid(),
  portals: z.array(PortalEnum).min(1).max(3),
  params: PortalSearchParamsSchema,
})

export type ParametricSearchInput = z.infer<typeof ParametricSearchSchema>

export const HistoryQuerySchema = z.object({
  consultant_id: z.string().uuid(),
})

export const SearchIdParamSchema = z.object({
  searchId: z.string().uuid(),
})
