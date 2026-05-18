/**
 * HomeFlags — flags booleanas discriminantes do listing.
 *
 * Pattern transpilado de HomeHarvest (Pydantic HomeFlags) — booleanas
 * discriminantes sao superiores a string-status para queries SQL e
 * filtros front-end (sem string matching frageis).
 *
 * AC3: 7 booleans. Default `false` em todos (semantica conservadora —
 * so vira `true` quando ha evidencia explicita).
 *
 * Flags BR-especificas adicionadas vs upstream:
 *   - is_fisbo_inferred: heuristica FISBO Wave 2 confirmou (ADR-EPIC7-004)
 *   - is_pf_disclosed: pessoa fisica explicitamente disclosed
 *   - is_pj_disclosed: pessoa juridica explicitamente disclosed
 *   - has_creci_validated: CRECI conferido em buscacreci/COFECI (Story 7.7)
 *
 * Mantidas do upstream HomeHarvest:
 *   - is_pending, is_contingent, is_new_construction
 *
 * Ref: docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 1
 *
 * PUREZA: TS puro (ADR-EPIC7-006).
 */

import { z } from 'zod'

export const HomeFlagsSchema = z.object({
  is_pending: z.boolean().default(false),
  is_contingent: z.boolean().default(false),
  is_new_construction: z.boolean().default(false),
  is_fisbo_inferred: z.boolean().default(false),
  is_pf_disclosed: z.boolean().default(false),
  is_pj_disclosed: z.boolean().default(false),
  has_creci_validated: z.boolean().default(false),
})

export type HomeFlags = z.infer<typeof HomeFlagsSchema>
