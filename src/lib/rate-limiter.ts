/**
 * In-memory rate limiter — keyed on an arbitrary string (typically user_id).
 *
 * ⚠️  Per-process.  On multi-instance deployments each container keeps its
 *     own window.  For a single-container deployment this is fine.  Swap the
 *     Map for Redis / Upstash if you need a global limit later.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  limit: number; // max requests in one window
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Evict expired entries every 60 s so the map stays small.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}, 60_000);

export function checkRateLimit(
  key: string,
  cfg: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const rec = store.get(key);

  if (!rec || now >= rec.resetAt) {
    store.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { allowed: true, remaining: cfg.limit - 1, resetAt: now + cfg.windowMs };
  }

  if (rec.count >= cfg.limit) {
    return { allowed: false, remaining: 0, resetAt: rec.resetAt };
  }

  rec.count += 1;
  return { allowed: true, remaining: cfg.limit - rec.count, resetAt: rec.resetAt };
}

/** Pre-tuned limits used across the app. */
export const RATE_LIMITS = {
  /** POST /api/recipes — hits Anthropic, so kept tight. */
  recipeSubmission: { limit: 5, windowMs: 60_000 } as RateLimitConfig,
  /** GET /api/ingredients/suggest — lightweight autocomplete. */
  ingredientSuggest: { limit: 30, windowMs: 10_000 } as RateLimitConfig,
};
