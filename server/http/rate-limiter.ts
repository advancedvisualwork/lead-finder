interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter kept in memory. On Vercel each warm instance has its own copy, so this
 * is a best-effort abuse guard, not a global quota. Bounded by maxKeys to avoid memory leaks.
 */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
    private readonly now: () => number = Date.now,
  ) {}

  consume(key: string): RateLimitDecision {
    const now = this.now();
    const window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      this.makeRoom(now);
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    window.count++;
    const allowed = window.count <= this.limit;
    return { allowed, retryAfterSeconds: allowed ? 0 : Math.ceil((window.resetAt - now) / 1000) };
  }

  get size(): number {
    return this.windows.size;
  }

  /** Runs only when the map is full: drop expired windows, then the oldest if still full. */
  private makeRoom(now: number): void {
    if (this.windows.size < this.maxKeys) return;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
    if (this.windows.size >= this.maxKeys) {
      const oldestKey = this.windows.keys().next().value;
      if (oldestKey !== undefined) this.windows.delete(oldestKey);
    }
  }
}

/** Vercel sets x-forwarded-for; the first entry is the client address. */
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}
