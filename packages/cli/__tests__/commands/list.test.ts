import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { listCommand } from "../../src/commands/list";

// Capture human-readable logs and JSON stream output
let output: string[] = [];
const originalLog = console.log;
const originalWrite = process.stdout.write;
const originalIsTTY = process.stdout.isTTY;

beforeEach(() => {
  output = [];
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) => {
    output.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
    const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    done?.(null);
    return true;
  }) as typeof process.stdout.write;
});

afterEach(() => {
  console.log = originalLog;
  process.stdout.write = originalWrite;
  // Restore isTTY after each test
  Object.defineProperty(process.stdout, "isTTY", {
    value: originalIsTTY,
    writable: true,
    configurable: true,
  });
});

describe("listCommand", () => {
  describe("human-readable output", () => {
    beforeEach(() => {
      // Mock TTY to get human-readable output
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
    });

    it("should output all prompts", async () => {
      await listCommand({});
      const text = output.join("\n");
      expect(text).toContain("idea-wizard");
      expect(text).toContain("readme-reviser");
      expect(text).toContain("robot-mode-maker");
    });

    it("should filter by category", async () => {
      await listCommand({ category: "ideation" });
      const text = output.join("\n");
      expect(text).toContain("idea-wizard");
      expect(text).not.toContain("readme-reviser");
    });

    it("should filter by tag", async () => {
      await listCommand({ tag: "documentation" });
      const text = output.join("\n");
      expect(text).toContain("readme-reviser");
      expect(text).not.toContain("idea-wizard");
    });
  });

  describe("JSON output", () => {
    it("should output JSON payload with prompts array", async () => {
      await listCommand({ json: true });
      const json = JSON.parse(output.join(""));
      expect(Array.isArray(json.prompts)).toBe(true);
    });

    it("should include required fields in JSON", async () => {
      await listCommand({ json: true });
      const json = JSON.parse(output.join(""));

      for (const prompt of json.prompts) {
        expect(prompt).toHaveProperty("id");
        expect(prompt).toHaveProperty("title");
        expect(prompt).toHaveProperty("description");
        expect(prompt).toHaveProperty("category");
        expect(prompt).toHaveProperty("tags");
        expect(Array.isArray(prompt.tags)).toBe(true);
      }
    });

    it("should respect category filter in JSON output", async () => {
      await listCommand({ json: true, category: "documentation" });
      const json = JSON.parse(output.join(""));

      for (const prompt of json.prompts) {
        expect(prompt.category).toBe("documentation");
      }
    });

    it("should respect tag filter in JSON output", async () => {
      await listCommand({ json: true, tag: "ultrathink" });
      const json = JSON.parse(output.join(""));

      for (const prompt of json.prompts) {
        expect(prompt.tags).toContain("ultrathink");
      }
    });
  });

  describe("JSON schema stability (golden test)", () => {
    it("should maintain stable JSON schema for agents", async () => {
      await listCommand({ json: true });
      const json = JSON.parse(output.join(""));
      const firstPrompt = json.prompts[0];

      // These fields MUST exist - breaking changes break agent integrations
      const requiredFields = [
        "id",
        "title",
        "description",
        "category",
        "tags",
        "version",
      ];

      for (const field of requiredFields) {
        expect(firstPrompt).toHaveProperty(field);
      }

      // id must be a string
      expect(typeof firstPrompt.id).toBe("string");

      // tags must be array of strings
      expect(Array.isArray(firstPrompt.tags)).toBe(true);
      if (firstPrompt.tags.length > 0) {
        expect(typeof firstPrompt.tags[0]).toBe("string");
      }
    });
  });

  describe("authentication flags", () => {
    const originalEnvToken = process.env.JFP_TOKEN;
    const originalExit = process.exit;

    afterEach(() => {
      process.exit = originalExit;
      if (originalEnvToken === undefined) {
        delete process.env.JFP_TOKEN;
      } else {
        process.env.JFP_TOKEN = originalEnvToken;
      }
    });

    it("requires login for --mine", async () => {
      delete process.env.JFP_TOKEN;
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("EXIT_" + code);
      }) as never;

      try {
        await listCommand({ json: true, mine: true });
      } catch {
        // Expected
      }

      const parsed = JSON.parse(output.join(""));
      expect(parsed.error).toBe(true);
      expect(parsed.code).toBe("not_authenticated");
      expect(exitCode).toBe(1);
    });

    it("requires login for --saved", async () => {
      delete process.env.JFP_TOKEN;
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("EXIT_" + code);
      }) as never;

      try {
        await listCommand({ json: true, saved: true });
      } catch {
        // Expected
      }

      const parsed = JSON.parse(output.join(""));
      expect(parsed.error).toBe(true);
      expect(parsed.code).toBe("not_authenticated");
      expect(exitCode).toBe(1);
    });
  });
});
