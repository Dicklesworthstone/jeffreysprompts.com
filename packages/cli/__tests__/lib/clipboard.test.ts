/**
 * Unit tests for packages/cli/src/lib/clipboard.ts
 * Tests the clipboard copy function.
 * Since clipboard operations depend on system tools (pbcopy, xclip, etc.),
 * we test the function interface and behavior without mocking system commands.
 */

import { describe, it, expect } from "bun:test";
import { copyToClipboard } from "../../src/lib/clipboard";

describe("copyToClipboard", () => {
  it("returns a boolean", async () => {
    const result = await copyToClipboard("test");
    expect(typeof result).toBe("boolean");
  });

  it("handles empty string input", async () => {
    const result = await copyToClipboard("");
    expect(typeof result).toBe("boolean");
  });

  it("handles long string input", async () => {
    const longText = "x".repeat(10000);
    const result = await copyToClipboard(longText);
    expect(typeof result).toBe("boolean");
  });

  it("handles special characters", async () => {
    const result = await copyToClipboard('Hello "world" & <foo>');
    expect(typeof result).toBe("boolean");
  });

  it("handles unicode", async () => {
    const result = await copyToClipboard("Hello \u{1F600} world \u{2603}");
    expect(typeof result).toBe("boolean");
  });

  it("handles newlines", async () => {
    const result = await copyToClipboard("line1\nline2\nline3");
    expect(typeof result).toBe("boolean");
  });

  it("does not throw on any input", async () => {
    // The function should never throw - it returns false on failure
    await expect(copyToClipboard("safe")).resolves.toBeDefined();
  });
});
