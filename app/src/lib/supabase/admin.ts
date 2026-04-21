import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client (service role) for server-side API routes.
 * Bypasses RLS — only use in API routes, never expose to client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Verify cron secret for protected API routes */
export function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') return false
    return true
  }
  return auth === `Bearer ${secret}`
}
