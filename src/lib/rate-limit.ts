// Lightweight in-memory rate limiter.
// Note: state is per-instance. On Cloud Run with multiple instances each
// instance tracks independently — still effective against brute force since
// an attacker's requests hit a single instance at a time, and it never
// blocks legitimate cross-instance traffic.

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Periodically purge expired entries so the map doesn't grow unbounded.
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}

/**
 * Consume one unit against a key. Returns whether the action is allowed
 * and, if not, how many seconds until the window resets.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  sweep(now)

  const entry = store.get(key)
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true, retryAfter: 0 }
}

/** Clear a key's counter (e.g. after a successful login). */
export function resetRateLimit(key: string): void {
  store.delete(key)
}

/** Best-effort client IP extraction from proxy headers (Cloud Run). */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}
