/**
 * Unit tests for admin permissions module
 * Tests RBAC permission checking and role hierarchy.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { PERMISSIONS, getServerAdminRole, checkAdminPermission } from "./permissions";
import type { AdminPermission } from "./permissions";

// Helper to create mock requests
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers(headers);
  return new NextRequest("http://localhost:3000/api/admin/test", { headers: h });
}

describe("PERMISSIONS", () => {
  it("has all expected permission keys", () => {
    const expected: AdminPermission[] = [
      "users.view", "users.edit", "users.suspend", "users.delete",
      "content.view_reported", "content.moderate", "content.delete",
      "support.view", "support.manage",
      "billing.view", "billing.refund",
      "admins.view", "admins.manage",
    ];
    for (const perm of expected) {
      expect(PERMISSIONS[perm]).toBeDefined();
      expect(Array.isArray(PERMISSIONS[perm])).toBe(true);
    }
  });

  it("super_admin has access to all permissions", () => {
    for (const [, roles] of Object.entries(PERMISSIONS)) {
      expect(roles).toContain("super_admin");
    }
  });

  it("users.delete is restricted to super_admin only", () => {
    expect(PERMISSIONS["users.delete"]).toEqual(["super_admin"]);
  });

  it("admins.manage is restricted to super_admin only", () => {
    expect(PERMISSIONS["admins.manage"]).toEqual(["super_admin"]);
  });

  it("moderator can view reported content", () => {
    expect(PERMISSIONS["content.view_reported"]).toContain("moderator");
  });

  it("support can view users", () => {
    expect(PERMISSIONS["users.view"]).toContain("support");
  });

  it("support cannot edit users", () => {
    expect(PERMISSIONS["users.edit"]).not.toContain("support");
  });
});

describe("getServerAdminRole", () => {
  const originalEnv = process.env.JFP_ADMIN_ROLE;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.JFP_ADMIN_ROLE;
    } else {
      process.env.JFP_ADMIN_ROLE = originalEnv;
    }
  });

  it("returns 'admin' when env var is not set", () => {
    delete process.env.JFP_ADMIN_ROLE;
    expect(getServerAdminRole()).toBe("admin");
  });

  it("returns the configured role", () => {
    process.env.JFP_ADMIN_ROLE = "super_admin";
    expect(getServerAdminRole()).toBe("super_admin");
  });

  it("normalizes dashes to underscores", () => {
    process.env.JFP_ADMIN_ROLE = "super-admin";
    expect(getServerAdminRole()).toBe("super_admin");
  });

  it("is case-insensitive", () => {
    process.env.JFP_ADMIN_ROLE = "MODERATOR";
    expect(getServerAdminRole()).toBe("moderator");
  });

  it("falls back to 'admin' for invalid role", () => {
    process.env.JFP_ADMIN_ROLE = "nonexistent_role";
    expect(getServerAdminRole()).toBe("admin");
  });
});

describe("checkAdminPermission", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup.JFP_ADMIN_TOKEN = process.env.JFP_ADMIN_TOKEN;
    envBackup.JFP_ADMIN_ROLE = process.env.JFP_ADMIN_ROLE;
    envBackup.NODE_ENV = process.env.NODE_ENV;
    envBackup.JFP_ADMIN_DEV_BYPASS = process.env.JFP_ADMIN_DEV_BYPASS;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.restoreAllMocks();
  });

  it("returns ok:true when valid Bearer token matches", () => {
    process.env.JFP_ADMIN_TOKEN = "test-secret-token";
    process.env.JFP_ADMIN_ROLE = "super_admin";
    const req = makeRequest({ authorization: "Bearer test-secret-token" });
    const result = checkAdminPermission(req, "users.view");
    expect(result.ok).toBe(true);
    expect(result.role).toBe("super_admin");
  });

  it("returns ok:true when valid x-jfp-admin-token header matches", () => {
    process.env.JFP_ADMIN_TOKEN = "test-token";
    process.env.JFP_ADMIN_ROLE = "admin";
    const req = makeRequest({ "x-jfp-admin-token": "test-token" });
    const result = checkAdminPermission(req, "users.view");
    expect(result.ok).toBe(true);
  });

  it("returns unauthorized when token does not match", () => {
    process.env.JFP_ADMIN_TOKEN = "correct-token";
    const req = makeRequest({ authorization: "Bearer wrong-token" });
    const result = checkAdminPermission(req, "users.view");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unauthorized");
  });

  it("returns unauthorized when no token provided", () => {
    process.env.JFP_ADMIN_TOKEN = "correct-token";
    const req = makeRequest({});
    const result = checkAdminPermission(req, "users.view");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unauthorized");
  });

  it("returns forbidden when role lacks permission", () => {
    process.env.JFP_ADMIN_TOKEN = "valid-token";
    process.env.JFP_ADMIN_ROLE = "support";
    const req = makeRequest({ authorization: "Bearer valid-token" });
    const result = checkAdminPermission(req, "users.delete");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("forbidden");
  });

  it("returns admin_token_not_configured in production with no token", () => {
    delete process.env.JFP_ADMIN_TOKEN;
    process.env.NODE_ENV = "production";
    const req = makeRequest({});
    const result = checkAdminPermission(req, "users.view");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("admin_token_not_configured");
  });

  it("allows dev bypass when enabled and request is from localhost", () => {
    delete process.env.JFP_ADMIN_TOKEN;
    process.env.NODE_ENV = "development";
    process.env.JFP_ADMIN_DEV_BYPASS = "true";
    const req = makeRequest({});
    // Host/Origin are forbidden request headers that happy-dom drops;
    // mock headers.get to simulate server-provided host header
    const origGet = req.headers.get.bind(req.headers);
    vi.spyOn(req.headers, "get").mockImplementation((name: string) => {
      if (name === "host") return "localhost:3000";
      return origGet(name);
    });
    const result = checkAdminPermission(req, "users.view");
    expect(result.ok).toBe(true);
    expect(result.role).toBe("super_admin");
  });

  it("blocks dev bypass from external origin", () => {
    delete process.env.JFP_ADMIN_TOKEN;
    process.env.NODE_ENV = "development";
    process.env.JFP_ADMIN_DEV_BYPASS = "true";
    const req = makeRequest({
      host: "example.com",
      origin: "https://attacker.com",
    });
    const result = checkAdminPermission(req, "users.view");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unauthorized");
  });
});
