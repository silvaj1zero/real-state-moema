/**
 * HomeFlags schema — AC3 + AC6.
 *
 * Cobre: defaults (todos false), parse partial, parse com todos true.
 */

import { describe, it, expect } from 'vitest'

import { HomeFlagsSchema } from '@/lib/schemas/epic7/home-flags'

describe('HomeFlagsSchema', () => {
  it('AC3: defaults all 7 flags to false when empty object passed', () => {
    const result = HomeFlagsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        is_pending: false,
        is_contingent: false,
        is_new_construction: false,
        is_fisbo_inferred: false,
        is_pf_disclosed: false,
        is_pj_disclosed: false,
        has_creci_validated: false,
      })
    }
  })

  it('accepts partial input and fills missing flags with false', () => {
    const result = HomeFlagsSchema.safeParse({
      is_pending: true,
      is_fisbo_inferred: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_pending).toBe(true)
      expect(result.data.is_fisbo_inferred).toBe(true)
      expect(result.data.is_contingent).toBe(false)
      expect(result.data.has_creci_validated).toBe(false)
    }
  })

  it('accepts all 7 flags set to true', () => {
    const all = {
      is_pending: true,
      is_contingent: true,
      is_new_construction: true,
      is_fisbo_inferred: true,
      is_pf_disclosed: true,
      is_pj_disclosed: true,
      has_creci_validated: true,
    }
    const result = HomeFlagsSchema.safeParse(all)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(all)
    }
  })

  it('rejects non-boolean value for a flag', () => {
    const result = HomeFlagsSchema.safeParse({
      is_pending: 'yes',
    })
    expect(result.success).toBe(false)
  })
})
