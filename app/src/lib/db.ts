/**
 * Direct PostgreSQL connection (bypasses PostgREST).
 * Used as workaround when PostgREST schema cache is stale.
 *
 * Requires DATABASE_URL env var with Supabase connection string.
 */

import postgres from 'postgres'

let sql: ReturnType<typeof postgres> | null = null

export function getDb() {
  if (sql) return sql

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('Missing DATABASE_URL env var. Get it from Supabase Dashboard > Settings > Database > Connection string (URI)')
  }

  sql = postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,       // Required: Supavisor transaction mode doesn't support prepared statements
    max_lifetime: 60 * 5, // 5 min — avoid stale connections in serverless
    username: 'postgres.hculsnvpyccnekfyficu', // Explicit: postgres.js parses dots in URL username incorrectly
  })

  return sql
}
