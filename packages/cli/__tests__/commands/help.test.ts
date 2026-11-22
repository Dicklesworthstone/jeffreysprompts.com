import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { helpCommand } from "../../src/commands/help";

let output: string[] = [];
const originalLog = console.log;
const originalWrite = process.stdout.write;

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
});

describe("helpCommand", () => {
  describe("JSON output", () => {
    it("outputs valid JSON", async () => {
      await helpCommand({ json: true });
      const json = JSON.parse(output.join(""));
      expect(typeof json).toBe("object");
    });

    it("includes name and version", async () => {
      await helpCommand({ json: true });
      const json = JSON.parse(output.join(""));
      expect(json.name).toBe("jfp");
      expect(json.version).toBeDefined();
    });

    it("includes documentation URL", async () => {
      await helpCommand({ json: true });
      const json = JSON.parse(output.join(""));
      expect(json.documentation).toBe("https://jeffreysprompts.com/docs");
    });

    it("includes categorized commands", async () => {
      await helpCommand({ json: true });
      const json = JSON.parse(output.join(""));

      expect(json.commands).toHaveProperty("listing_searching");
      expect(json.commands).toHaveProperty("viewing");
      expect(json.commands).toHaveProperty("copying_exporting");
      expect(json.commands).toHaveProperty("premium");
      expect(json.commands).toHaveProperty("bundles");
      expect(json.commands).toHaveProperty("registry");
      expect(json.commands).toHaveProperty("utilities");
    });

    it("each command has name and description", async () => {
      await helpCommand({ json: true });
      const json = JSON.parse(output.join(""));

      for (const [_, commands] of Object.entries(json.commands)) {
        for (const cmd of commands as { name: string; description: string }[]) {
          expect(cmd).toHaveProperty("name");
          expect(cmd).toHaveProperty("description");
          expect(typeof cmd.name).toBe("string");
          expect(typeof cmd.description).toBe("string");
        }
      }
    });

    it("includes examples", async () => {
      await helpCommand({ json: true });
      const json = JSON.parse(output.join(""));

      expect(Array.isArray(json.examples)).toBe(true);
      expect(json.examples.length).toBeGreaterThan(0);

      for (const example of json.examples) {
        expect(example).toHaveProperty("command");
        expect(example).toHaveProperty("description");
      }
    });
  });

  describe("schema stability (golden test)", () => {
    it("maintains stable JSON schema for agents", async () => {
      await helpCommand({ json: true });
      const json = JSON.parse(output.join(""));

      // These top-level keys MUST exist
      const requiredKeys = ["name", "version", "description", "documentation", "commands", "examples"];
      for (const key of requiredKeys) {
        expect(json).toHaveProperty(key);
      }

      // Commands structure MUST have these categories
      const requiredCategories = [
        "listing_searching",
        "viewing",
        "copying_exporting",
        "premium",
        "bundles",
        "registry",
        "utilities",
      ];
      for (const cat of requiredCategories) {
        expect(json.commands).toHaveProperty(cat);
        expect(Array.isArray(json.commands[cat])).toBe(true);
      }
    });
  });
});
