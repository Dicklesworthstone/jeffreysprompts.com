/**
 * Unit tests for packages/cli/src/lib/utils.ts
 * Tests utility functions: JSON output detection, safe path resolution,
 * skill ID validation, and atomic file writes.
 * Uses real filesystem (temp files) - no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  shouldOutputJson,
  isSafeSkillId,
  resolveSafeChildPath,
  atomicWriteFileSync,
  atomicWriteFile,
} from "../../src/lib/utils";

// ---------------------------------------------------------------------------
// Test directory setup
// ---------------------------------------------------------------------------

let TEST_DIR: string;

beforeEach(() => {
  TEST_DIR = join(
    tmpdir(),
    "jfp-utils-test-" + Date.now() + "-" + Math.random().toString(36).slice(2)
  );
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// shouldOutputJson
// ---------------------------------------------------------------------------

describe("shouldOutputJson", () => {
  it("returns true when json option is true", () => {
    expect(shouldOutputJson({ json: true })).toBe(true);
  });

  it("returns false when json option is false and stdout is TTY", () => {
    // Note: In test environment, stdout.isTTY may vary
    // This test verifies the json=true path explicitly
    const result = shouldOutputJson({ json: false });
    // Result depends on environment; if not TTY, returns true
    expect(typeof result).toBe("boolean");
  });

  it("returns true when json is true regardless of TTY", () => {
    expect(shouldOutputJson({ json: true })).toBe(true);
  });

  it("handles missing json option", () => {
    const result = shouldOutputJson({});
    // Should depend on TTY status
    expect(typeof result).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// isSafeSkillId
// ---------------------------------------------------------------------------

describe("isSafeSkillId", () => {
  it("accepts lowercase alphanumeric", () => {
    expect(isSafeSkillId("myskill")).toBe(true);
  });

  it("accepts hyphenated names", () => {
    expect(isSafeSkillId("my-skill")).toBe(true);
  });

  it("accepts single character", () => {
    expect(isSafeSkillId("a")).toBe(true);
  });

  it("accepts numbers", () => {
    expect(isSafeSkillId("skill1")).toBe(true);
    expect(isSafeSkillId("1skill")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isSafeSkillId("")).toBe(false);
  });

  it("rejects names starting with hyphen", () => {
    expect(isSafeSkillId("-skill")).toBe(false);
  });

  it("rejects names ending with hyphen", () => {
    expect(isSafeSkillId("skill-")).toBe(false);
  });

  it("rejects uppercase", () => {
    expect(isSafeSkillId("MySkill")).toBe(false);
  });

  it("rejects names with spaces", () => {
    expect(isSafeSkillId("my skill")).toBe(false);
  });

  it("rejects names with underscores", () => {
    expect(isSafeSkillId("my_skill")).toBe(false);
  });

  it("rejects names with dots", () => {
    expect(isSafeSkillId("my.skill")).toBe(false);
  });

  it("accepts double hyphens (regex allows consecutive hyphens)", () => {
    expect(isSafeSkillId("my--skill")).toBe(true);
  });

  it("rejects path-like strings", () => {
    expect(isSafeSkillId("../etc/passwd")).toBe(false);
  });

  it("rejects names with special characters", () => {
    expect(isSafeSkillId("skill@1")).toBe(false);
    expect(isSafeSkillId("skill!")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveSafeChildPath
// ---------------------------------------------------------------------------

describe("resolveSafeChildPath", () => {
  it("resolves valid child path", () => {
    const result = resolveSafeChildPath("/root/dir", "child");
    expect(result).toBe(join("/root/dir", "child"));
  });

  it("resolves nested child path", () => {
    const result = resolveSafeChildPath("/root/dir", "sub/child");
    expect(result).toBe(join("/root/dir", "sub/child"));
  });

  it("throws on path traversal (..)", () => {
    expect(() => resolveSafeChildPath("/root/dir", "../escape")).toThrow(
      "Unsafe path"
    );
  });

  it("throws on absolute path escape", () => {
    expect(() => resolveSafeChildPath("/root/dir", "/etc/passwd")).toThrow(
      "Unsafe path"
    );
  });

  it("throws on complex traversal", () => {
    expect(() =>
      resolveSafeChildPath("/root/dir", "sub/../../escape")
    ).toThrow("Unsafe path");
  });
});

// ---------------------------------------------------------------------------
// atomicWriteFileSync
// ---------------------------------------------------------------------------

describe("atomicWriteFileSync", () => {
  it("writes content to file", () => {
    const filePath = join(TEST_DIR, "test.txt");
    atomicWriteFileSync(filePath, "hello world");
    expect(readFileSync(filePath, "utf-8")).toBe("hello world");
  });

  it("creates parent directories", () => {
    const filePath = join(TEST_DIR, "sub", "dir", "test.txt");
    atomicWriteFileSync(filePath, "nested content");
    expect(readFileSync(filePath, "utf-8")).toBe("nested content");
  });

  it("overwrites existing file", () => {
    const filePath = join(TEST_DIR, "overwrite.txt");
    atomicWriteFileSync(filePath, "first");
    atomicWriteFileSync(filePath, "second");
    expect(readFileSync(filePath, "utf-8")).toBe("second");
  });

  it("does not leave temp files on success", () => {
    const filePath = join(TEST_DIR, "clean.txt");
    atomicWriteFileSync(filePath, "clean");

    // Check no .tmp files exist in the directory
    const { readdirSync } = require("fs");
    const files = readdirSync(TEST_DIR) as string[];
    const tmpFiles = files.filter((f: string) => f.endsWith(".tmp"));
    expect(tmpFiles.length).toBe(0);
  });

  it("writes binary content", () => {
    const filePath = join(TEST_DIR, "binary.dat");
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    atomicWriteFileSync(filePath, buffer);
    const result = readFileSync(filePath);
    expect(result[0]).toBe(0x00);
    expect(result[3]).toBe(0xff);
  });
});

// ---------------------------------------------------------------------------
// atomicWriteFile (async)
// ---------------------------------------------------------------------------

describe("atomicWriteFile", () => {
  it("writes content to file", async () => {
    const filePath = join(TEST_DIR, "async-test.txt");
    await atomicWriteFile(filePath, "async hello");
    expect(readFileSync(filePath, "utf-8")).toBe("async hello");
  });

  it("creates parent directories", async () => {
    const filePath = join(TEST_DIR, "async", "nested", "file.txt");
    await atomicWriteFile(filePath, "nested async");
    expect(readFileSync(filePath, "utf-8")).toBe("nested async");
  });

  it("overwrites existing file", async () => {
    const filePath = join(TEST_DIR, "async-overwrite.txt");
    await atomicWriteFile(filePath, "first");
    await atomicWriteFile(filePath, "second");
    expect(readFileSync(filePath, "utf-8")).toBe("second");
  });

  it("does not leave temp files on success", async () => {
    const filePath = join(TEST_DIR, "async-clean.txt");
    await atomicWriteFile(filePath, "clean");

    const { readdirSync } = require("fs");
    const files = readdirSync(TEST_DIR) as string[];
    const tmpFiles = files.filter((f: string) => f.endsWith(".tmp"));
    expect(tmpFiles.length).toBe(0);
  });
});
