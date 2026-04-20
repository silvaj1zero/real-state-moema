/**
 * Direct PostgreSQL connection (bypasses PostgREST).
 * Used as workaround when PostgREST schema cache is stale.
 *
 * Uses individual params instead of URL because postgres.js
 * parses dots in usernames incorrectly (Supabase pooler uses
 * "postgres.PROJECT_REF" as username).
 */

import postgres from 'postgres'

let sql: ReturnType<typeof postgres> | null = null

export function getDb() {
  if (sql) return sql

  const host = process.env.DB_HOST || 'aws-1-sa-east-1.pooler.supabase.com'
  const password = process.env.DB_PASSWORD
  if (!password) {
    throw new Error('Missing DB_PASSWORD env var')
  }

  sql = postgres({
    host,
    port: 5432,
    database: 'postgres',
    username: 'postgres.hculsnvpyccnekfyficu',
    password,
    ssl: 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    max_lifetime: 60 * 5,
  })

  return sql
}
