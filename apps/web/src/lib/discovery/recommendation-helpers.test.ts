/**
 * Unit tests for recommendation preference helpers
 * @module lib/discovery/recommendation-helpers.test
 */

import { describe, test, expect } from "vitest";
import {
  formatCategoryLabel,
  sortUnique,
  parseTagCsv,
  formatCsv,
} from "./recommendation-helpers";

// ---------------------------------------------------------------------------
// formatCategoryLabel
// ---------------------------------------------------------------------------

describe("formatCategoryLabel", () => {
  test("capitalizes a single word", () => {
    expect(formatCategoryLabel("ideation")).toBe("Ideation");
  });

  test("capitalizes hyphenated words", () => {
    expect(formatCategoryLabel("code-review")).toBe("Code Review");
  });

  test("handles multiple hyphens", () => {
    expect(formatCategoryLabel("long-multi-word-category")).toBe("Long Multi Word Category");
  });

  test("handles empty string", () => {
    expect(formatCategoryLabel("")).toBe("");
  });

  test("handles single character parts", () => {
    expect(formatCategoryLabel("a-b-c")).toBe("A B C");
  });

  test("preserves already-capitalized input after split", () => {
    // Input "Documentation" has no hyphens → single part
    expect(formatCategoryLabel("Documentation")).toBe("Documentation");
  });
});

// ---------------------------------------------------------------------------
// sortUnique
// ---------------------------------------------------------------------------

describe("sortUnique", () => {
  test("sorts and deduplicates strings", () => {
    expect(sortUnique(["banana", "apple", "banana", "cherry"])).toEqual([
      "apple",
      "banana",
      "cherry",
    ]);
  });

  test("returns empty array for undefined", () => {
    expect(sortUnique(undefined)).toEqual([]);
  });

  test("returns empty array for empty array", () => {
    expect(sortUnique([])).toEqual([]);
  });

  test("handles single element", () => {
    expect(sortUnique(["only"])).toEqual(["only"]);
  });

  test("sorts case-sensitively by locale", () => {
    const result = sortUnique(["Zebra", "apple"]);
    // localeCompare: "apple" < "Zebra" in most locales
    expect(result[0]).toBe("apple");
    expect(result[1]).toBe("Zebra");
  });

  test("removes all duplicates", () => {
    expect(sortUnique(["x", "x", "x"])).toEqual(["x"]);
  });
});

// ---------------------------------------------------------------------------
// parseTagCsv
// ---------------------------------------------------------------------------

describe("parseTagCsv", () => {
  test("parses comma-separated tags", () => {
    expect(parseTagCsv("docs, readme, writing")).toEqual(["docs", "readme", "writing"]);
  });

  test("lowercases all tags", () => {
    expect(parseTagCsv("DOCS, ReadMe")).toEqual(["docs", "readme"]);
  });

  test("trims whitespace", () => {
    expect(parseTagCsv("  foo ,  bar  ,  baz  ")).toEqual(["bar", "baz", "foo"]);
  });

  test("removes empty entries from consecutive commas", () => {
    expect(parseTagCsv("foo,,bar,,,baz")).toEqual(["bar", "baz", "foo"]);
  });

  test("deduplicates tags", () => {
    expect(parseTagCsv("docs, docs, DOCS")).toEqual(["docs"]);
  });

  test("returns sorted results", () => {
    expect(parseTagCsv("z, a, m")).toEqual(["a", "m", "z"]);
  });

  test("handles empty string", () => {
    expect(parseTagCsv("")).toEqual([]);
  });

  test("handles whitespace-only string", () => {
    expect(parseTagCsv("  ,  ,  ")).toEqual([]);
  });

  test("handles single tag", () => {
    expect(parseTagCsv("ultrathink")).toEqual(["ultrathink"]);
  });
});

// ---------------------------------------------------------------------------
// formatCsv
// ---------------------------------------------------------------------------

describe("formatCsv", () => {
  test("joins array with comma and space", () => {
    expect(formatCsv(["docs", "readme"])).toBe("docs, readme");
  });

  test("handles single element", () => {
    expect(formatCsv(["only"])).toBe("only");
  });

  test("handles empty array", () => {
    expect(formatCsv([])).toBe("");
  });

  test("handles undefined", () => {
    expect(formatCsv(undefined)).toBe("");
  });

  test("preserves element casing", () => {
    expect(formatCsv(["Foo", "BAR"])).toBe("Foo, BAR");
  });
});
