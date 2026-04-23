import { z } from 'zod'

/**
 * Validação de input para rotas /api/search/*
 *
 * Observações:
 * - Filtros "vazios" do frontend chegam como `null` (não `undefined`), então
 *   os campos correspondentes são `.nullable().optional()` (aceita ambos).
 * - Schemas usam `.passthrough()` para tolerar campos extras no payload sem
 *   falhar — o frontend evolui mais rápido que o contrato e queremos evitar
 *   quebrar busca por um campo novo inócuo.
 */

const NullableInt = (min: number, max: number) =>
  z.number().int().gte(min).lte(max).nullable().optional()

const NullableNum = (min: number, max?: number) =>
  (max !== undefined
    ? z.number().gte(min).lte(max)
    : z.number().gte(min)
  ).nullable().optional()

export const LocalSearchSchema = z.object({
  p_lat: z.number().gte(-90).lte(90),
  p_lng: z.number().gte(-180).lte(180),
  p_raio_metros: z.number().int().gte(10).lte(10000).default(2000),
  p_quartos_min: NullableInt(0, 20),
  p_quartos_max: NullableInt(0, 20),
  p_area_min: NullableNum(0, 100000),
  p_area_max: NullableNum(0, 100000),
  p_preco_min: NullableNum(0),
  p_preco_max: NullableNum(0),
  p_bairros: z.array(z.string().min(1).max(100)).max(20).nullable().optional(),
  p_fisbo_only: z.boolean().default(false),
  p_portal: z.enum(['zap', 'olx', 'vivareal']).nullable().optional(),
  p_limit: z.number().int().gte(1).lte(500).default(100),
})

export type LocalSearchInput = z.infer<typeof LocalSearchSchema>

const PortalEnum = z.enum(['zap', 'olx', 'vivareal'])

/**
 * Parâmetros da busca paramétrica enviados pelo front em `params`.
 * Aceita campos extras (passthrough) porque o front mistura filtros,
 * geo-referência e seleções (tipo_transacao, edificio_ids, etc.) que
 * nem sempre são conhecidos pela API de schema.
 */
export const PortalSearchParamsSchema = z
  .object({
    lat: z.number().gte(-90).lte(90).nullable().optional(),
    lng: z.number().gte(-180).lte(180).nullable().optional(),
    center_lat: z.number().gte(-90).lte(90).nullable().optional(),
    center_lng: z.number().gte(-180).lte(180).nullable().optional(),
    raio_metros: z.number().int().gte(10).lte(10000).nullable().optional(),
    bairros: z.array(z.string().min(1).max(100)).max(20).nullable().optional(),
    tipo_transacao: z.enum(['venda', 'aluguel']).optional(),
    edificio_ids: z.array(z.string().uuid()).max(500).nullable().optional(),
    portais: z.array(PortalEnum).max(3).optional(),
    quartos_min: NullableInt(0, 20),
    quartos_max: NullableInt(0, 20),
    suites_min: NullableInt(0, 20),
    banheiros_min: NullableInt(0, 20),
    banheiros_max: NullableInt(0, 20),
    area_min: NullableNum(0, 100000),
    area_max: NullableNum(0, 100000),
    preco_min: NullableNum(0),
    preco_max: NullableNum(0),
    fisbo_only: z.boolean().optional(),
    max_items_per_portal: z.number().int().gte(1).lte(500).optional(),
  })
  .passthrough()

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
