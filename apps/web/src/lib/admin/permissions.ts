import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

export type AdminRole = "super_admin" | "admin" | "moderator" | "support";

export type AdminPermission =
  | "users.view"
  | "users.edit"
  | "users.suspend"
  | "users.delete"
  | "content.view_reported"
  | "content.moderate"
  | "content.delete"
  | "support.view"
  | "support.manage"
  | "billing.view"
  | "billing.refund"
  | "admins.view"
  | "admins.manage";

const ROLE_SET = new Set<AdminRole>([
  "super_admin",
  "admin",
  "moderator",
  "support",
]);

export const PERMISSIONS: Record<AdminPermission, AdminRole[]> = {
  // User management
  "users.view": ["moderator", "support", "admin", "super_admin"],
  "users.edit": ["admin", "super_admin"],
  "users.suspend": ["admin", "super_admin"],
  "users.delete": ["super_admin"],

  // Content moderation
  "content.view_reported": ["moderator", "support", "admin", "super_admin"],
  "content.moderate": ["moderator", "admin", "super_admin"],
  "content.delete": ["admin", "super_admin"],

  // Support tickets
  "support.view": ["support", "admin", "super_admin"],
  "support.manage": ["support", "admin", "super_admin"],

  // Billing
  "billing.view": ["support", "admin", "super_admin"],
  "billing.refund": ["admin", "super_admin"],

  // Admin management
  "admins.view": ["admin", "super_admin"],
  "admins.manage": ["super_admin"],
};

export interface AdminAuthResult {
  ok: boolean;
  role: AdminRole;
  reason?: "unauthorized" | "forbidden" | "admin_token_not_configured";
}

export type HeaderAccessor = { get(name: string): string | null };

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return request.headers.get("x-jfp-admin-token");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if strings are equal, false otherwise.
 */
function safeCompareTokens(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  // If lengths differ, still do the comparison to maintain constant time
  // but ensure we return false
  if (providedBuf.length !== expectedBuf.length) {
    // Compare against expected to prevent length-based timing leak
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}

function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isLocalOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function getAdminRoleFromHeaders(headers: HeaderAccessor): AdminRole {
  const raw = headers.get("x-jfp-admin-role");
  if (!raw) return "support";

  const normalized = raw.toLowerCase().replace(/-/g, "_");
  if (ROLE_SET.has(normalized as AdminRole)) {
    return normalized as AdminRole;
  }
  return "support";
}

/**
 * Check whether the request has the required admin permission.
 *
 * Auth strategy:
 * - ALWAYS require JFP_ADMIN_TOKEN in production (NODE_ENV === "production")
 * - In non-production, require explicit JFP_ADMIN_DEV_BYPASS=true to skip token check
 * - If token is set, require Bearer or x-jfp-admin-token to match.
 * - Role is supplied via x-jfp-admin-role header (defaults to support).
 *
 * Security notes:
 * - Dev bypass requires explicit opt-in to prevent accidental exposure
 * - Even with dev bypass, external origins are rejected for safety
 */
export function checkAdminPermission(
  request: NextRequest,
  permission: AdminPermission
): AdminAuthResult {
  const token = process.env.JFP_ADMIN_TOKEN;
  const role = getAdminRoleFromHeaders(request.headers);
  const isProduction = process.env.NODE_ENV === "production";
  const devBypassEnabled = process.env.JFP_ADMIN_DEV_BYPASS === "true";

  if (!token) {
    // In production, always require the token to be configured
    if (isProduction) {
      return { ok: false, role, reason: "admin_token_not_configured" };
    }

    // In non-production, only allow bypass if explicitly enabled
    if (devBypassEnabled) {
      // Additional safety: reject if request appears to come from external origin
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      const originOk = isLocalOrigin(origin);
      const hostOk = isLocalHost(host);
      if ((origin || host) && !originOk && !hostOk) {
        console.warn(
          "[Admin Auth] Dev bypass blocked: external origin detected",
          { origin, host, permission }
        );
        return { ok: false, role, reason: "unauthorized" };
      }

      console.warn(
        "[Admin Auth] Dev bypass active - configure JFP_ADMIN_TOKEN for production",
        { permission, role: "super_admin" }
      );
      return { ok: true, role: "super_admin" };
    }

    // No token and no bypass = deny
    return { ok: false, role, reason: "admin_token_not_configured" };
  }

  const providedToken = getTokenFromRequest(request);
  if (!providedToken || !safeCompareTokens(providedToken, token)) {
    return { ok: false, role, reason: "unauthorized" };
  }

  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles.includes(role)) {
    return { ok: false, role, reason: "forbidden" };
  }

  return { ok: true, role };
}
