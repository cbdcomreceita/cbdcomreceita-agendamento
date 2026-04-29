import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Centralized rate limiting via Upstash Redis.
 *
 * Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
 * Each limiter uses a sliding window so bursts don't get a free pass
 * at the boundary of a fixed window.
 *
 * Fail-open: if Upstash is unreachable, `tryCheckRateLimit` returns
 * { ok: true, degraded: true } and lets the request through. Better
 * to serve real traffic than to take down the site because an
 * auxiliary system is down. The degraded flag is logged so we
 * can spot extended outages.
 *
 * IPs are masked to /16 before being written to audit_events to keep
 * us LGPD-aligned (IP is treated as personal data).
 *
 * TODO: when CEP lookup moves to a server-side proxy (today fetchCep
 * runs in the browser and hits viacep.com.br directly), add an
 * `rl:cep` limiter here and wire it into the proxy route.
 */

const redis = Redis.fromEnv();

export const rateLimiters = {
  // Generates a real PIX and writes patient/booking/payment rows.
  // 5 attempts in 10 min per IP — enough for a legitimate retry on a
  // bad connection, tight enough to keep abuse from filling the DB.
  createBooking: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: true,
    prefix: "rl:booking",
  }),

  // MP retries a few times and rotates IPs from regional pools.
  // 60/min/IP gives MP plenty of room while still capping a brute-force
  // probe of the HMAC signature. Watch for `rate_limit_exceeded`
  // audit events with endpoint='webhook-mp' — if any come from MP's
  // real IPs in production, raise the limit or move to a per-mp_payment_id
  // strategy.
  webhookMp: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
    prefix: "rl:webhook-mp",
  }),

  // /agenda fetches slots once per mount. 15/min/IP is plenty for any
  // legitimate browse pattern and cuts the scraping budget compared to
  // a more permissive limit. Raise if real users complain.
  slots: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "1 m"),
    analytics: true,
    prefix: "rl:slots",
  }),
};

export type RateLimiterName = keyof typeof rateLimiters;

/**
 * Pull the client IP from a Headers object (Vercel sets x-forwarded-for
 * and x-real-ip on every request). Returns "unknown" if neither is
 * present so the limiter still has a stable identifier.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Mask IP for audit logging (LGPD: IP is personal data).
 *   IPv4: 192.168.1.42 → 192.168.x.x
 *   IPv6: 2001:db8:abcd:... → 2001:db8:...
 */
export function maskIp(ip: string): string {
  if (ip === "unknown") return ip;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
    return ip;
  }
  if (ip.includes(":")) {
    return ip.split(":").slice(0, 2).join(":") + ":...";
  }
  return ip;
}

export interface RateLimitOk {
  ok: true;
  /** True if the limiter could not be reached and we let the request through. */
  degraded?: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}

export interface RateLimitDenied {
  ok: false;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check a rate limit and return a structured result. Fail-open: any
 * Upstash error → { ok: true, degraded: true }. The caller decides
 * how to surface the rejection (route handler returns a 429 Response,
 * a server action returns a structured error).
 */
export async function tryCheckRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitOk | RateLimitDenied> {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    if (success) return { ok: true, limit, remaining, reset };
    return { ok: false, limit, remaining, reset };
  } catch (err) {
    console.error("[ratelimit] upstash unavailable:", err);
    return { ok: true, degraded: true };
  }
}

/**
 * Build a 429 Response (route handler convenience). Includes standard
 * X-RateLimit-* headers and a Retry-After in seconds.
 */
export function buildRateLimitResponse(denied: RateLimitDenied): Response {
  const retryAfterSec = Math.max(1, Math.ceil((denied.reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "rate_limit_exceeded", retryAfter: retryAfterSec }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(denied.limit),
        "X-RateLimit-Remaining": String(denied.remaining),
        "X-RateLimit-Reset": String(denied.reset),
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
