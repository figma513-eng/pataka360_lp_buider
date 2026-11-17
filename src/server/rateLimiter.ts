export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

export class SlidingRateLimiter {
  private readonly buckets = new Map<string, BucketEntry>();
  private readonly maxEntries: number;
  private lastPruneAt = Date.now();

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
  }

  private pruneExpired(now: number): void {
    if (now - this.lastPruneAt < 30_000 && this.buckets.size < this.maxEntries) {
      return;
    }
    this.lastPruneAt = now;
    for (const [key, entry] of this.buckets) {
      if (now >= entry.resetAt) {
        this.buckets.delete(key);
      }
    }
    if (this.buckets.size > this.maxEntries) {
      const overflow = this.buckets.size - this.maxEntries;
      let removed = 0;
      for (const key of this.buckets.keys()) {
        this.buckets.delete(key);
        removed += 1;
        if (removed >= overflow) break;
      }
    }
  }

  public consume(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.pruneExpired(now);

    const safeMax = Math.max(1, Math.floor(maxRequests));
    const safeWindow = Math.max(1000, Math.floor(windowMs));

    const existing = this.buckets.get(key);
    if (!existing || now >= existing.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + safeWindow });
      return {
        allowed: true,
        remaining: Math.max(0, safeMax - 1),
        retryAfterSeconds: Math.ceil(safeWindow / 1000),
      };
    }

    if (existing.count >= safeMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, safeMax - existing.count),
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  public resetKey(key: string): void {
    this.buckets.delete(key);
  }

  public reset(): void {
    this.buckets.clear();
  }
}

export const authRateLimiter = new SlidingRateLimiter(10_000);
export const apiRateLimiter = new SlidingRateLimiter(15_000);
