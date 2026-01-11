/**
 * Real filesystem tests for render command
 *
 * Uses actual temp files for context loading instead of mocking.
 * Tests file context loading, truncation, and error handling.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { renderCommand } from "../../src/commands/render";

// Test helpers
let testDir: string;
let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
const originalArgv = process.argv;

// Create temp directory for context files
beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-render-test-"));
});

afterAll(() => {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    console.error("Failed to cleanup test dir:", e);
  }
});

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error("process.exit");
  }) as never;
  process.argv = ["node", "jfp", "render", "idea-wizard", "--PROJECT=Test"];
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
  process.argv = originalArgv;
});

describe("renderCommand", () => {
  describe("context file loading", () => {
    it("loads context from a real temp file", async () => {
      const contextFile = join(testDir, "context-test.txt");
      const contextContent = "This is test context content for rendering.";
      writeFileSync(contextFile, contextContent);

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
      });

      const payload = JSON.parse(output.join(""));
      expect(payload).toHaveProperty("id", "idea-wizard");
      expect(payload.rendered).toContain("## Context");
      expect(payload.rendered).toContain(contextContent);
      expect(payload.context).toHaveProperty("source", contextFile);
      expect(payload.context.truncated).toBe(false);
    });

    it("renders prompt content with context in JSON output", async () => {
      // Use absolute path to package.json (relative to test file location)
      const contextPath = new URL("../../package.json", import.meta.url).pathname;
      await renderCommand("idea-wizard", {
        json: true,
        context: contextPath,
        maxContext: "2000",
      });
      const payload = JSON.parse(output.join(""));
      expect(payload).toHaveProperty("id", "idea-wizard");
      expect(payload.rendered).toContain("Come up with your very best ideas");
      expect(payload.rendered).toContain("## Context");
      expect(payload.rendered).toContain("\"name\": \"@jeffreysprompts/cli\"");
    });

    it("handles large context files with different content", async () => {
      const contextFile = join(testDir, "large-context.txt");
      const largeContent = "Line of content.\n".repeat(100);
      writeFileSync(contextFile, largeContent);

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
        maxContext: "10000",
      });

      const payload = JSON.parse(output.join(""));
      expect(payload.context.characters).toBe(largeContent.length);
      expect(payload.context.truncated).toBe(false);
    });

    it("handles context files with special characters", async () => {
      const contextFile = join(testDir, "special-chars.txt");
      const specialContent = "Content with special chars: <html> & \"quotes\" 'apostrophes' `backticks`";
      writeFileSync(contextFile, specialContent);

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
      });

      const payload = JSON.parse(output.join(""));
      expect(payload.rendered).toContain(specialContent);
    });

    it("handles empty context file", async () => {
      const contextFile = join(testDir, "empty-context.txt");
      writeFileSync(contextFile, "");

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
      });

      const payload = JSON.parse(output.join(""));
      // Empty context shouldn't add context section
      expect(payload.context).toBeUndefined();
    });
  });

  describe("context truncation", () => {
    it("truncates context that exceeds maxContext", async () => {
      const contextFile = join(testDir, "truncate-test.txt");
      const longContent = "A".repeat(1000);
      writeFileSync(contextFile, longContent);

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
        maxContext: "100",
      });

      const payload = JSON.parse(output.join(""));
      expect(payload.context.truncated).toBe(true);
      expect(payload.context.characters).toBe(100);
      expect(payload.rendered).toContain("[Context from");
      expect(payload.rendered).toContain("truncated to 100 characters]");
    });

    it("does not truncate when context is within limit", async () => {
      const contextFile = join(testDir, "no-truncate.txt");
      const shortContent = "Short content";
      writeFileSync(contextFile, shortContent);

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
        maxContext: "10000",
      });

      const payload = JSON.parse(output.join(""));
      expect(payload.context.truncated).toBe(false);
      expect(payload.context.characters).toBe(shortContent.length);
      expect(payload.rendered).not.toContain("truncated");
    });

    it("uses default maxContext when not specified", async () => {
      const contextFile = join(testDir, "default-max.txt");
      const content = "Test content";
      writeFileSync(contextFile, content);

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
        // No maxContext specified - uses default
      });

      const payload = JSON.parse(output.join(""));
      expect(payload.context.truncated).toBe(false);
    });
  });

  describe("error handling", () => {
    it("exits when prompt is missing", async () => {
      await expect(renderCommand("missing-prompt", { json: true })).rejects.toThrow();
      // JSON errors go to console.log, not console.error
      const allOutput = output.join("\n");
      expect(allOutput).toContain("not_found");
      expect(exitCode).toBe(1);
    });

    it("exits when context file does not exist", async () => {
      const nonExistentFile = join(testDir, "does-not-exist.txt");

      await expect(
        renderCommand("idea-wizard", {
          json: true,
          context: nonExistentFile,
        })
      ).rejects.toThrow();

      const allOutput = output.join("\n");
      expect(allOutput).toContain("file_not_found");
      expect(allOutput).toContain("does-not-exist.txt");
      expect(exitCode).toBe(1);
    });

    it("provides descriptive error for non-existent context file", async () => {
      const badPath = join(testDir, "no-such-file.md");

      await expect(
        renderCommand("idea-wizard", {
          json: true,
          context: badPath,
        })
      ).rejects.toThrow();

      const payload = JSON.parse(output.join(""));
      expect(payload.error).toBe("file_not_found");
      expect(payload.message).toContain("no-such-file.md");
    });
  });

  describe("output modes", () => {
    it("outputs JSON in non-TTY environments (test environment)", async () => {
      // Note: In non-TTY (like tests), shouldOutputJson returns true by default
      // This is intentional for piping to other tools
      const contextFile = join(testDir, "non-tty-output.txt");
      writeFileSync(contextFile, "Non-TTY context content");

      await renderCommand("idea-wizard", {
        json: false, // Even with json: false, non-TTY outputs JSON
        context: contextFile,
      });

      // In non-TTY, we get JSON regardless of --json flag
      const parsedOutput = JSON.parse(output.join(""));
      expect(parsedOutput.id).toBe("idea-wizard");
      expect(parsedOutput.rendered).toContain("Come up with your very best ideas");
      expect(parsedOutput.rendered).toContain("Non-TTY context content");
    });

    it("includes context source in JSON output", async () => {
      const contextFile = join(testDir, "source-tracking.txt");
      writeFileSync(contextFile, "Source tracking content");

      await renderCommand("idea-wizard", {
        json: true,
        context: contextFile,
      });

      const payload = JSON.parse(output.join(""));
      expect(payload.context.source).toBe(contextFile);
    });
  });
});
