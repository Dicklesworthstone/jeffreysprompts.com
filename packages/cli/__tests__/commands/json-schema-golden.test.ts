/**
 * Golden tests for JSON output schema stability
 *
 * These tests ensure that JSON output schemas remain stable across releases.
 * Breaking changes to these schemas will break agent integrations.
 *
 * IMPORTANT: If a test fails due to intentional schema changes:
 * 1. Update the expected schema in this file
 * 2. Increment the version in package.json (semver major for breaking changes)
 * 3. Document the change in CHANGELOG.md
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { listCommand } from "../../src/commands/list";
import { searchCommand } from "../../src/commands/search";
import { showCommand } from "../../src/commands/show";

// ============================================================================
// Test Utilities
// ============================================================================

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
    throw new Error("process.exit");
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

function getJsonOutput<T = unknown>(): T {
  return JSON.parse(output.join(""));
}

// ============================================================================
// Expected Schemas (Golden Outputs)
// ============================================================================

/**
 * Expected shape for a Prompt object in JSON output
 * This is the "golden" schema that agents depend on
 */
const EXPECTED_PROMPT_SCHEMA = {
  // Required fields - MUST exist
  requiredFields: [
    "id",
    "title",
    "description",
    "category",
    "tags",
    "author",
    "version",
    "content",
    "created",
  ] as const,

  // Optional fields - MAY exist
  optionalFields: [
    "twitter",
    "featured",
    "difficulty",
    "estimatedTokens",
    "updatedAt",
    "variables",
    "whenToUse",
    "tips",
    "examples",
    "changelog",
  ] as const,

  // Type constraints
  types: {
    id: "string",
    title: "string",
    description: "string",
    category: "string",
    tags: "array",
    author: "string",
    version: "string",
    content: "string",
    created: "string",
  } as const,
};

/**
 * Expected shape for a SearchResult object in JSON output
 */
const EXPECTED_SEARCH_RESULT_SCHEMA = {
  requiredFields: ["prompt", "score", "matchedFields"] as const,
  types: {
    prompt: "object",
    score: "number",
    matchedFields: "array",
  } as const,
};

/**
 * Expected shape for error payloads
 */
const EXPECTED_ERROR_SCHEMA = {
  notFound: { error: "not_found" },
};

// ============================================================================
// List Command Golden Tests
// ============================================================================

describe("list --json golden tests", () => {
  it("outputs an array of prompts", async () => {
    await listCommand({ json: true });
    const json = getJsonOutput<unknown[]>();

    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });

  it("each prompt has all required fields", async () => {
    await listCommand({ json: true });
    const json = getJsonOutput<Record<string, unknown>[]>();

    for (const prompt of json) {
      for (const field of EXPECTED_PROMPT_SCHEMA.requiredFields) {
        expect(prompt).toHaveProperty(field);
      }
    }
  });

  it("required fields have correct types", async () => {
    await listCommand({ json: true });
    const json = getJsonOutput<Record<string, unknown>[]>();
    const prompt = json[0];

    // Verify types match expected
    expect(typeof prompt.id).toBe("string");
    expect(typeof prompt.title).toBe("string");
    expect(typeof prompt.description).toBe("string");
    expect(typeof prompt.category).toBe("string");
    expect(Array.isArray(prompt.tags)).toBe(true);
    expect(typeof prompt.author).toBe("string");
    expect(typeof prompt.version).toBe("string");
    expect(typeof prompt.content).toBe("string");
    expect(typeof prompt.created).toBe("string");
  });

  it("tags array contains only strings", async () => {
    await listCommand({ json: true });
    const json = getJsonOutput<{ tags: unknown[] }[]>();

    for (const prompt of json) {
      for (const tag of prompt.tags) {
        expect(typeof tag).toBe("string");
      }
    }
  });

  it("category is a valid PromptCategory value", async () => {
    const validCategories = [
      "ideation",
      "documentation",
      "automation",
      "refactoring",
      "testing",
      "debugging",
      "workflow",
      "communication",
    ];

    await listCommand({ json: true });
    const json = getJsonOutput<{ category: string }[]>();

    for (const prompt of json) {
      expect(validCategories).toContain(prompt.category);
    }
  });

  it("version follows semver format", async () => {
    await listCommand({ json: true });
    const json = getJsonOutput<{ version: string }[]>();

    const semverRegex = /^\d+\.\d+\.\d+$/;
    for (const prompt of json) {
      expect(prompt.version).toMatch(semverRegex);
    }
  });

  it("id follows kebab-case format", async () => {
    await listCommand({ json: true });
    const json = getJsonOutput<{ id: string }[]>();

    const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const prompt of json) {
      expect(prompt.id).toMatch(kebabCaseRegex);
    }
  });

  it("created date is ISO 8601 format", async () => {
    await listCommand({ json: true });
    const json = getJsonOutput<{ created: string }[]>();

    for (const prompt of json) {
      // ISO 8601 date format check
      const date = new Date(prompt.created);
      expect(date.toString()).not.toBe("Invalid Date");
    }
  });

  it("filters preserve schema structure", async () => {
    // Test with category filter
    await listCommand({ json: true, category: "documentation" });
    const filtered = getJsonOutput<Record<string, unknown>[]>();

    expect(filtered.length).toBeGreaterThan(0);
    for (const prompt of filtered) {
      for (const field of EXPECTED_PROMPT_SCHEMA.requiredFields) {
        expect(prompt).toHaveProperty(field);
      }
    }
  });
});

// ============================================================================
// Search Command Golden Tests
// ============================================================================

describe("search --json golden tests", () => {
  it("outputs an array of search results", async () => {
    await searchCommand("idea", { json: true });
    const json = getJsonOutput<unknown[]>();

    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
  });

  it("each result has all required SearchResult fields", async () => {
    await searchCommand("wizard", { json: true });
    const json = getJsonOutput<Record<string, unknown>[]>();

    for (const result of json) {
      for (const field of EXPECTED_SEARCH_RESULT_SCHEMA.requiredFields) {
        expect(result).toHaveProperty(field);
      }
    }
  });

  it("SearchResult fields have correct types", async () => {
    await searchCommand("wizard", { json: true });
    const json = getJsonOutput<Record<string, unknown>[]>();
    const result = json[0];

    expect(typeof result.prompt).toBe("object");
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.matchedFields)).toBe(true);
  });

  it("nested prompt has full Prompt schema", async () => {
    await searchCommand("wizard", { json: true });
    const json = getJsonOutput<{ prompt: Record<string, unknown> }[]>();
    const prompt = json[0].prompt;

    for (const field of EXPECTED_PROMPT_SCHEMA.requiredFields) {
      expect(prompt).toHaveProperty(field);
    }
  });

  it("score is a non-negative number", async () => {
    await searchCommand("documentation", { json: true });
    const json = getJsonOutput<{ score: number }[]>();

    for (const result of json) {
      expect(result.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("matchedFields contains valid field names", async () => {
    const validFields = [
      "title",
      "description",
      "content",
      "tags",
      "category",
      "id",
    ];

    await searchCommand("documentation", { json: true });
    const json = getJsonOutput<{ matchedFields: string[] }[]>();

    for (const result of json) {
      for (const field of result.matchedFields) {
        expect(validFields).toContain(field);
      }
    }
  });

  it("empty results return empty array, not error", async () => {
    await searchCommand("xyznonexistent123456789", { json: true });
    const json = getJsonOutput<unknown[]>();

    expect(Array.isArray(json)).toBe(true);
    expect(json).toEqual([]);
  });

  it("results are ordered by score descending", async () => {
    await searchCommand("documentation readme", { json: true });
    const json = getJsonOutput<{ score: number }[]>();

    if (json.length > 1) {
      for (let i = 1; i < json.length; i++) {
        expect(json[i - 1].score).toBeGreaterThanOrEqual(json[i].score);
      }
    }
  });
});

// ============================================================================
// Show Command Golden Tests
// ============================================================================

describe("show --json golden tests", () => {
  it("outputs a single prompt object (not array)", () => {
    showCommand("idea-wizard", { json: true });
    const json = getJsonOutput<unknown>();

    expect(typeof json).toBe("object");
    expect(Array.isArray(json)).toBe(false);
  });

  it("prompt has all required fields", () => {
    showCommand("idea-wizard", { json: true });
    const json = getJsonOutput<Record<string, unknown>>();

    for (const field of EXPECTED_PROMPT_SCHEMA.requiredFields) {
      expect(json).toHaveProperty(field);
    }
  });

  it("fields have correct types", () => {
    showCommand("idea-wizard", { json: true });
    const prompt = getJsonOutput<Record<string, unknown>>();

    expect(typeof prompt.id).toBe("string");
    expect(typeof prompt.title).toBe("string");
    expect(typeof prompt.content).toBe("string");
    expect(Array.isArray(prompt.tags)).toBe(true);
  });

  it("content field contains actual prompt text", () => {
    showCommand("idea-wizard", { json: true });
    const prompt = getJsonOutput<{ content: string }>();

    expect(prompt.content.length).toBeGreaterThan(100); // Real prompts are substantial
    expect(prompt.content).toContain("idea"); // idea-wizard mentions ideas
  });
});

// ============================================================================
// Error Payload Golden Tests
// ============================================================================

describe("error payload golden tests", () => {
  it("show --json returns exact error schema for missing prompt", () => {
    expect(() => showCommand("nonexistent-prompt-xyz", { json: true })).toThrow();
    const json = getJsonOutput<{ error: string }>();

    // This is the EXACT expected error payload
    expect(json).toEqual(EXPECTED_ERROR_SCHEMA.notFound);
  });

  it("show error payload has 'error' key (not 'message' or 'msg')", () => {
    expect(() => showCommand("nonexistent-prompt-xyz", { json: true })).toThrow();
    const json = getJsonOutput<Record<string, unknown>>();

    expect(json).toHaveProperty("error");
    expect(json).not.toHaveProperty("message");
    expect(json).not.toHaveProperty("msg");
  });

  it("show error exits with code 1", () => {
    expect(() => showCommand("nonexistent-prompt-xyz", { json: true })).toThrow();
    expect(exitCode).toBe(1);
  });

  it("search with no results returns empty array, not error", () => {
    searchCommand("zzzznonexistent999", { json: true });
    const json = getJsonOutput<unknown>();

    // Empty results should NOT be an error object
    expect(Array.isArray(json)).toBe(true);
    expect(json).toEqual([]);
  });

  it("list with no matches returns empty array, not error", () => {
    listCommand({ json: true, category: "nonexistent-category" as never });
    const json = getJsonOutput<unknown>();

    expect(Array.isArray(json)).toBe(true);
    expect(json).toEqual([]);
  });
});

// ============================================================================
// Cross-Command Consistency Tests
// ============================================================================

describe("cross-command schema consistency", () => {
  it("list and show return same prompt structure", () => {
    // Get a prompt from list
    listCommand({ json: true });
    const listOutput = getJsonOutput<Record<string, unknown>[]>();
    const fromList = listOutput.find(
      (p) => p.id === "idea-wizard"
    ) as Record<string, unknown>;

    // Reset and get same prompt from show
    output = [];
    showCommand("idea-wizard", { json: true });
    const fromShow = getJsonOutput<Record<string, unknown>>();

    // Keys should match
    const listKeys = Object.keys(fromList).sort();
    const showKeys = Object.keys(fromShow).sort();
    expect(listKeys).toEqual(showKeys);

    // Values should match
    expect(fromList.id).toBe(fromShow.id);
    expect(fromList.title).toBe(fromShow.title);
    expect(fromList.version).toBe(fromShow.version);
    expect(fromList.content).toBe(fromShow.content);
  });

  it("search result prompt matches show output", () => {
    // Get a prompt from search using a query that will definitely match
    searchCommand("wizard", { json: true });
    const searchOutput = getJsonOutput<{ prompt: Record<string, unknown> }[]>();

    // Find idea-wizard in results (may not be first)
    const searchResult = searchOutput.find((r) => r.prompt.id === "idea-wizard");
    expect(searchResult).toBeDefined();
    const fromSearch = searchResult!.prompt;

    // Reset and get same prompt from show
    output = [];
    showCommand("idea-wizard", { json: true });
    const fromShow = getJsonOutput<Record<string, unknown>>();

    // Values should match
    expect(fromSearch.id).toBe(fromShow.id);
    expect(fromSearch.title).toBe(fromShow.title);
    expect(fromSearch.content).toBe(fromShow.content);
  });
});
