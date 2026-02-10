/**
 * Unit tests for packages/core/src/prompts/schema.ts
 * Tests Zod schemas and validation functions with real and invalid data.
 * No mocks - imports real schemas and validates against them directly.
 */

import { describe, it, expect } from "bun:test";
import {
  PromptCategorySchema,
  PromptDifficultySchema,
  PromptVariableTypeSchema,
  PromptVariableSchema,
  PromptChangeSchema,
  PromptSchema,
  validatePrompt,
  validatePrompts,
} from "../../src/prompts/schema";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validPrompt = {
  id: "test-prompt",
  title: "Test Prompt",
  description: "A valid test prompt for unit testing",
  category: "ideation",
  tags: ["testing"],
  author: "Test Author",
  version: "1.0.0",
  created: "2026-01-01",
  content: "This is the prompt content that must be at least 20 characters long.",
};

const validVariable = {
  name: "PROJECT_NAME",
  label: "Project Name",
  type: "text" as const,
};

const validChange = {
  version: "1.1.0",
  date: "2026-02-01",
  type: "improvement" as const,
  summary: "Improved clarity of instructions",
};

// ---------------------------------------------------------------------------
// PromptCategorySchema
// ---------------------------------------------------------------------------

describe("PromptCategorySchema", () => {
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

  for (const category of validCategories) {
    it(`accepts "${category}"`, () => {
      expect(PromptCategorySchema.parse(category)).toBe(category);
    });
  }

  it("rejects invalid category", () => {
    expect(() => PromptCategorySchema.parse("invalid")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => PromptCategorySchema.parse("")).toThrow();
  });

  it("rejects number", () => {
    expect(() => PromptCategorySchema.parse(42)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PromptDifficultySchema
// ---------------------------------------------------------------------------

describe("PromptDifficultySchema", () => {
  for (const level of ["beginner", "intermediate", "advanced"]) {
    it(`accepts "${level}"`, () => {
      expect(PromptDifficultySchema.parse(level)).toBe(level);
    });
  }

  it("rejects invalid difficulty", () => {
    expect(() => PromptDifficultySchema.parse("expert")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PromptVariableTypeSchema
// ---------------------------------------------------------------------------

describe("PromptVariableTypeSchema", () => {
  for (const type of ["text", "multiline", "select", "file", "path"]) {
    it(`accepts "${type}"`, () => {
      expect(PromptVariableTypeSchema.parse(type)).toBe(type);
    });
  }

  it("rejects invalid type", () => {
    expect(() => PromptVariableTypeSchema.parse("number")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PromptVariableSchema
// ---------------------------------------------------------------------------

describe("PromptVariableSchema", () => {
  it("accepts valid variable with minimal fields", () => {
    const result = PromptVariableSchema.parse(validVariable);
    expect(result.name).toBe("PROJECT_NAME");
    expect(result.label).toBe("Project Name");
    expect(result.type).toBe("text");
  });

  it("accepts variable with all optional fields", () => {
    const full = {
      ...validVariable,
      description: "The name of the project",
      type: "select" as const,
      required: true,
      options: ["option-a", "option-b"],
      default: "option-a",
    };
    const result = PromptVariableSchema.parse(full);
    expect(result.required).toBe(true);
    expect(result.options).toEqual(["option-a", "option-b"]);
    expect(result.default).toBe("option-a");
  });

  it("rejects lowercase variable name", () => {
    expect(() =>
      PromptVariableSchema.parse({ ...validVariable, name: "project_name" })
    ).toThrow();
  });

  it("rejects variable name with spaces", () => {
    expect(() =>
      PromptVariableSchema.parse({ ...validVariable, name: "PROJECT NAME" })
    ).toThrow();
  });

  it("rejects empty label", () => {
    expect(() =>
      PromptVariableSchema.parse({ ...validVariable, label: "" })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PromptChangeSchema
// ---------------------------------------------------------------------------

describe("PromptChangeSchema", () => {
  it("accepts valid change", () => {
    const result = PromptChangeSchema.parse(validChange);
    expect(result.version).toBe("1.1.0");
    expect(result.type).toBe("improvement");
  });

  for (const type of ["improvement", "fix", "breaking"]) {
    it(`accepts change type "${type}"`, () => {
      const result = PromptChangeSchema.parse({ ...validChange, type });
      expect(result.type).toBe(type);
    });
  }

  it("rejects non-semver version", () => {
    expect(() =>
      PromptChangeSchema.parse({ ...validChange, version: "v1.0" })
    ).toThrow();
  });

  it("rejects non-ISO date", () => {
    expect(() =>
      PromptChangeSchema.parse({ ...validChange, date: "Jan 1, 2026" })
    ).toThrow();
  });

  it("rejects empty summary", () => {
    expect(() =>
      PromptChangeSchema.parse({ ...validChange, summary: "" })
    ).toThrow();
  });

  it("rejects invalid change type", () => {
    expect(() =>
      PromptChangeSchema.parse({ ...validChange, type: "patch" })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PromptSchema
// ---------------------------------------------------------------------------

describe("PromptSchema", () => {
  it("accepts a valid minimal prompt", () => {
    const result = PromptSchema.parse(validPrompt);
    expect(result.id).toBe("test-prompt");
    expect(result.title).toBe("Test Prompt");
    expect(result.category).toBe("ideation");
  });

  it("accepts prompt with all optional fields", () => {
    const full = {
      ...validPrompt,
      twitter: "@testuser",
      featured: true,
      difficulty: "advanced",
      estimatedTokens: 500,
      updatedAt: "2026-02-01",
      variables: [validVariable],
      whenToUse: ["When testing"],
      tips: ["Test tip"],
      examples: ["Example usage"],
      changelog: [validChange],
    };
    const result = PromptSchema.parse(full);
    expect(result.featured).toBe(true);
    expect(result.difficulty).toBe("advanced");
    expect(result.estimatedTokens).toBe(500);
    expect(result.variables).toHaveLength(1);
    expect(result.changelog).toHaveLength(1);
  });

  // ID validation
  it("rejects ID with uppercase", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, id: "Test-Prompt" })
    ).toThrow();
  });

  it("rejects ID starting with number", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, id: "1-test" })
    ).toThrow();
  });

  it("rejects ID with spaces", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, id: "test prompt" })
    ).toThrow();
  });

  it("rejects ID with consecutive hyphens", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, id: "test--prompt" })
    ).toThrow();
  });

  it("accepts single-word ID", () => {
    const result = PromptSchema.parse({ ...validPrompt, id: "test" });
    expect(result.id).toBe("test");
  });

  // Title validation
  it("rejects empty title", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, title: "" })
    ).toThrow();
  });

  it("rejects title over 100 characters", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, title: "x".repeat(101) })
    ).toThrow();
  });

  // Description validation
  it("rejects empty description", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, description: "" })
    ).toThrow();
  });

  it("rejects description over 200 characters", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, description: "x".repeat(201) })
    ).toThrow();
  });

  // Tags validation
  it("rejects empty tags array", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, tags: [] })
    ).toThrow();
  });

  it("rejects tags with uppercase", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, tags: ["Testing"] })
    ).toThrow();
  });

  it("rejects tags with spaces", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, tags: ["my tag"] })
    ).toThrow();
  });

  it("accepts kebab-case tags", () => {
    const result = PromptSchema.parse({ ...validPrompt, tags: ["multi-word-tag"] });
    expect(result.tags).toEqual(["multi-word-tag"]);
  });

  // Content validation
  it("rejects content shorter than 20 characters", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, content: "Too short" })
    ).toThrow();
  });

  // Version validation
  it("rejects non-semver version", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, version: "1.0" })
    ).toThrow();
  });

  // Date validation
  it("rejects non-ISO created date", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, created: "January 1, 2026" })
    ).toThrow();
  });

  // Twitter handle validation
  it("rejects twitter handle without @", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, twitter: "testuser" })
    ).toThrow();
  });

  it("accepts valid twitter handle", () => {
    const result = PromptSchema.parse({ ...validPrompt, twitter: "@test_user123" });
    expect(result.twitter).toBe("@test_user123");
  });

  // Estimated tokens validation
  it("rejects zero estimated tokens", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, estimatedTokens: 0 })
    ).toThrow();
  });

  it("rejects negative estimated tokens", () => {
    expect(() =>
      PromptSchema.parse({ ...validPrompt, estimatedTokens: -100 })
    ).toThrow();
  });

  // Missing required fields
  it("rejects missing id", () => {
    const { id: _, ...noId } = validPrompt;
    expect(() => PromptSchema.parse(noId)).toThrow();
  });

  it("rejects missing category", () => {
    const { category: _, ...noCat } = validPrompt;
    expect(() => PromptSchema.parse(noCat)).toThrow();
  });

  it("rejects missing content", () => {
    const { content: _, ...noContent } = validPrompt;
    expect(() => PromptSchema.parse(noContent)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// validatePrompt / validatePrompts
// ---------------------------------------------------------------------------

describe("validatePrompt", () => {
  it("returns parsed prompt on valid input", () => {
    const result = validatePrompt(validPrompt);
    expect(result.id).toBe("test-prompt");
    expect(result.title).toBe("Test Prompt");
  });

  it("throws on invalid input", () => {
    expect(() => validatePrompt({ id: "bad" })).toThrow();
  });

  it("strips unknown fields", () => {
    const result = validatePrompt({ ...validPrompt, unknownField: "hello" });
    expect((result as Record<string, unknown>).unknownField).toBeUndefined();
  });
});

describe("validatePrompts", () => {
  it("validates array of prompts", () => {
    const second = { ...validPrompt, id: "another-prompt" };
    const results = validatePrompts([validPrompt, second]);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("test-prompt");
    expect(results[1].id).toBe("another-prompt");
  });

  it("throws if any prompt is invalid", () => {
    expect(() => validatePrompts([validPrompt, { id: "bad" }])).toThrow();
  });

  it("handles empty array", () => {
    const results = validatePrompts([]);
    expect(results).toEqual([]);
  });
});
