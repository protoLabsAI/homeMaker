/**
 * In-memory rate limiter for controlling message frequency.
 *
 * Tracks timestamps of actions per key and enforces:
 *   - cooldown: minimum seconds between consecutive actions
 *   - maxPerHour: maximum actions within a rolling 60-minute window
 *
 * Stale entries are pruned on each check to prevent unbounded memory growth.
 */

export interface RateLimiterConfig {
  /** Minimum seconds between consecutive actions */
  cooldownSeconds: number;
  /** Maximum actions allowed per rolling hour */
  maxPerHour: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Reason the action was blocked, if not allowed */
  reason?: string;
}

export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  /**
   * Check whether an action is allowed for the given key.
   * If allowed, the current timestamp is recorded.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Prune entries older than one hour
    const existing = this.timestamps.get(key) ?? [];
    const recent = existing.filter((ts) => ts > oneHourAgo);

    // Check cooldown: most recent action must be older than cooldownSeconds
    if (recent.length > 0) {
      const lastAction = recent[recent.length - 1];
      const elapsed = (now - lastAction) / 1000;
      if (elapsed < this.config.cooldownSeconds) {
        this.timestamps.set(key, recent);
        return {
          allowed: false,
          reason: `Cooldown active: ${Math.ceil(this.config.cooldownSeconds - elapsed)}s remaining`,
        };
      }
    }

    // Check hourly limit
    if (recent.length >= this.config.maxPerHour) {
      this.timestamps.set(key, recent);
      return {
        allowed: false,
        reason: `Hourly limit reached (${this.config.maxPerHour}/hr)`,
      };
    }

    // Action is allowed — record timestamp
    recent.push(now);
    this.timestamps.set(key, recent);
    return { allowed: true };
  }

  /** Reset all tracked timestamps (useful for testing) */
  reset(): void {
    this.timestamps.clear();
  }
}
