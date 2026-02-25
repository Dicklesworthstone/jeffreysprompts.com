/**
 * Unit tests for health check module
 * Tests readiness and status check functions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runReadyChecks, runStatusChecks } from "./checks";

const envBackup: Record<string, string | undefined> = {};

beforeEach(() => {
  envBackup.JFP_READY_CHECK_URL = process.env.JFP_READY_CHECK_URL;
  // Ensure no remote check URL is set (avoid network calls)
  delete process.env.JFP_READY_CHECK_URL;
});

afterEach(() => {
  if (envBackup.JFP_READY_CHECK_URL === undefined) {
    delete process.env.JFP_READY_CHECK_URL;
  } else {
    process.env.JFP_READY_CHECK_URL = envBackup.JFP_READY_CHECK_URL;
  }
});

describe("runReadyChecks", () => {
  it("returns a status and checks object", async () => {
    const result = await runReadyChecks();
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("checks");
  });

  it("status is 'ready' or 'degraded'", async () => {
    const result = await runReadyChecks();
    expect(["ready", "degraded"]).toContain(result.status);
  });

  it("includes registry check", async () => {
    const result = await runReadyChecks();
    expect(result.checks).toHaveProperty("registry");
  });

  it("registry check passes (prompts are loaded)", async () => {
    const result = await runReadyChecks();
    expect(result.checks.registry).toBe(true);
  });

  it("returns ready when all checks pass", async () => {
    const result = await runReadyChecks();
    expect(result.status).toBe("ready");
  });

  it("checks is a Record of string to boolean", async () => {
    const result = await runReadyChecks();
    for (const [key, value] of Object.entries(result.checks)) {
      expect(typeof key).toBe("string");
      expect(typeof value).toBe("boolean");
    }
  });
});

describe("runStatusChecks", () => {
  it("returns a status and checks object", async () => {
    const result = await runStatusChecks();
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("checks");
  });

  it("status is 'ready' or 'degraded'", async () => {
    const result = await runStatusChecks();
    expect(["ready", "degraded"]).toContain(result.status);
  });

  it("includes registry check with timing", async () => {
    const result = await runStatusChecks();
    expect(result.checks).toHaveProperty("registry");
    expect(result.checks.registry).toHaveProperty("ok");
    expect(result.checks.registry).toHaveProperty("durationMs");
  });

  it("registry check outcome has ok=true", async () => {
    const result = await runStatusChecks();
    expect(result.checks.registry.ok).toBe(true);
  });

  it("durationMs is a non-negative number", async () => {
    const result = await runStatusChecks();
    expect(result.checks.registry.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns ready when all checks pass", async () => {
    const result = await runStatusChecks();
    expect(result.status).toBe("ready");
  });
});
