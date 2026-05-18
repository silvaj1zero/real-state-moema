/**
 * LGPD crypto helpers — Epic 7 Story 7.10.
 *
 * Thin facade over `vault.ts`. Exposed as a separate module because the story
 * file references `lib/lgpd-crypto.ts` explicitly and downstream consumers
 * (story 7.4 crawler PF) import from this name.
 *
 * All encryption goes through Supabase Vault (managed key, never exposed to
 * application code). See `docs/poc/7.10-vault-availability-check.md`.
 */

export {
  storeLeadPII as encryptLeadField,
  getLeadPII as decryptLeadField,
  storeLeadPIIBatch as encryptLeadFieldsBatch,
} from '@/lib/vault'

export type { LeadPIIField } from '@/lib/vault'
