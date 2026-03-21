/**
 * Retry with exponential backoff — Story 3.5, AC7
 *
 * @param fn - async function to retry
 * @param maxRetries - max attempts (default 3)
 * @param baseDelayMs - base delay in ms (default 1000)
 * @returns result of fn
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(3, attempt) // 1s, 3s, 9s
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  throw lastError!
}
