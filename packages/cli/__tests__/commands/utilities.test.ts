/**
 * Tests for utility commands — categories, tags, about
 *
 * Uses JSON output mode to validate data structures.
 * Requires registry to be loadable.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { categoriesCommand, tagsCommand, aboutCommand } from "../../src/commands/utilities";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

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
    throw new Error(`process.exit(${code})`);
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

describe("categoriesCommand", () => {
  it("outputs valid JSON array", async () => {
    await categoriesCommand({ json: true });
    expect(exitCode).toBeUndefined();
    const json = JSON.parse(output.join(""));
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });

  it("each category has name and count", async () => {
    await categoriesCommand({ json: true });
    const json = JSON.parse(output.join(""));
    for (const cat of json) {
      expect(typeof cat.name).toBe("string");
      expect(typeof cat.count).toBe("number");
    }
  });
});

describe("tagsCommand", () => {
  it("outputs valid JSON array", async () => {
    await tagsCommand({ json: true });
    expect(exitCode).toBeUndefined();
    const json = JSON.parse(output.join(""));
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });

  it("each tag has name and count", async () => {
    await tagsCommand({ json: true });
    const json = JSON.parse(output.join(""));
    for (const tag of json) {
      expect(typeof tag.name).toBe("string");
      expect(typeof tag.count).toBe("number");
    }
  });

  it("tags are sorted by count descending", async () => {
    await tagsCommand({ json: true });
    const json = JSON.parse(output.join(""));
    const counts = json.map((t: { count: number }) => t.count);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });
});

describe("aboutCommand", () => {
  it("outputs valid JSON with project info", async () => {
    await aboutCommand({ json: true });
    expect(exitCode).toBeUndefined();
    const json = JSON.parse(output.join(""));
    expect(json.name).toBe("jfp");
    expect(json.version).toBeDefined();
  });

  it("includes prompt count", async () => {
    await aboutCommand({ json: true });
    const json = JSON.parse(output.join(""));
    expect(typeof json.prompts).toBe("number");
    expect(json.prompts).toBeGreaterThan(0);
  });

  it("includes website URL", async () => {
    await aboutCommand({ json: true });
    const json = JSON.parse(output.join(""));
    expect(json.website).toContain("jeffreysprompts.com");
  });
});
