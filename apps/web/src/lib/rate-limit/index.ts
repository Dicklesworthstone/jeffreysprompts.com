import type { NextRequest } from "next/server";

export {
  createRateLimiter,
  checkMultipleLimits,
  type RateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
} from "./rate-limiter";

function parseForwardedIp(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const ip = headerValue.split(",")[0]?.trim();
  if (!ip) return null;
  return ip.slice(0, 128);
}

/**
 * Prefer platform-populated headers over user-controlled forwarding headers.
 *
 * In production we intentionally avoid raw `x-forwarded-for` because clients can spoof it.
 * In local/dev tests we keep it as a fallback for compatibility.
 */
export function getTrustedClientIp(request: NextRequest): string {
  return (
    parseForwardedIp(request.headers.get("x-vercel-forwarded-for")) ??
    parseForwardedIp(request.headers.get("x-real-ip")) ??
    (process.env.NODE_ENV !== "production"
      ? parseForwardedIp(request.headers.get("x-forwarded-for"))
      : null) ??
    "unknown"
  );
}
