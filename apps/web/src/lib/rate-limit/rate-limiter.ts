/**
 * Rate Limiter Module
 *
 * Provides rate limiting for API endpoints. Currently uses in-memory storage
 * which resets on serverless function cold starts and Vercel deployments.
 *
 * LIMITATION: In-memory rate limiting on serverless platforms like Vercel
 * provides only per-instance protection. Each function instance maintains
 * its own bucket state. For stronger protection, configure Upstash Redis
 * by setting UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
 *   const result = await limiter.check(key);
 *   if (!result.allowed) return rateLimitResponse(result);
 */

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Maximum number of active key buckets kept in memory */
  maxBuckets?: number;
  /** Optional identifier for this limiter (for logging) */
  name?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter implementation.
 *
 * Note: This resets on serverless cold starts and deployments.
 * For production use with stronger guarantees, use Upstash Redis.
 */
class InMemoryRateLimiter {
  private buckets = new Map<string, Bucket>();
  private config: RateLimitConfig;
  private maxBuckets: number;
  private lastPrune = 0;
  private pruneInterval = 60_000; // Prune expired buckets every minute

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.maxBuckets = Math.max(1, config.maxBuckets ?? 10_000);
  }

  private prune(now: number): void {
    if (now - this.lastPrune < this.pruneInterval) return;
    this.lastPrune = now;

    const entries = Array.from(this.buckets.entries());
    for (const [key, bucket] of entries) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private getBucket(key: string, now: number): Bucket {
    const existing = this.buckets.get(key);
    if (existing && now <= existing.resetAt) {
      return existing;
    }

    this.evictIfNeeded(now);

    const bucket: Bucket = {
      count: 0,
      resetAt: now + this.config.windowMs,
    };
    this.buckets.set(key, bucket);
    return bucket;
  }

  private evictIfNeeded(now: number): void {
    if (this.buckets.size < this.maxBuckets) return;

    // Prefer clearing naturally expired buckets first.
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
      if (this.buckets.size < this.maxBuckets) return;
    }

    // If still at capacity, drop oldest buckets to bound memory.
    while (this.buckets.size >= this.maxBuckets) {
      const oldestKey = this.buckets.keys().next().value;
      if (oldestKey === undefined) break;
      this.buckets.delete(oldestKey);
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    this.prune(now);

    const bucket = this.getBucket(key, now);
    bucket.count += 1;

    const allowed = bucket.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    return {
      allowed,
      remaining,
      resetAt: bucket.resetAt,
      retryAfterSeconds,
    };
  }

  /**
   * Check without incrementing the counter.
   * Useful for displaying rate limit status.
   */
  async peek(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || now > existing.resetAt) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: now + this.config.windowMs,
        retryAfterSeconds: 0,
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - existing.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return {
      allowed: existing.count <= this.config.maxRequests,
      remaining,
      resetAt: existing.resetAt,
      retryAfterSeconds,
    };
  }
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
  peek(key: string): Promise<RateLimitResult>;
}

/**
 * Create a rate limiter instance.
 *
 * Returns an in-memory implementation. For persistent rate limiting
 * across serverless instances, integrate with Upstash Redis.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  // Future: Check for UPSTASH_REDIS_REST_URL and return UpstashRateLimiter
  // if (process.env.UPSTASH_REDIS_REST_URL) {
  //   return new UpstashRateLimiter(config);
  // }

  return new InMemoryRateLimiter(config);
}

/**
 * Combine multiple rate limit checks. Returns the most restrictive result.
 * Useful for applying both IP and email-based limits.
 *
 * Note: All limiters are checked (and incremented) in parallel, even if one
 * would deny. This is intentional - we want to track all attempts.
 */
export async function checkMultipleLimits(
  checks: Array<{ limiter: RateLimiter; key: string }>
): Promise<RateLimitResult> {
  if (checks.length === 0) {
    // No limiters configured - allow everything
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: Date.now(),
      retryAfterSeconds: 0,
    };
  }

  const results = await Promise.all(checks.map(({ limiter, key }) => limiter.check(key)));

  // If any limiter denies, return the one with the longest wait time
  const deniedResults = results.filter((r) => !r.allowed);
  if (deniedResults.length > 0) {
    return deniedResults.reduce((maxWait, r) =>
      r.retryAfterSeconds > maxWait.retryAfterSeconds ? r : maxWait
    );
  }

  // All allowed - return the one with fewest remaining
  return results.reduce((min, r) => (r.remaining < min.remaining ? r : min));
}
