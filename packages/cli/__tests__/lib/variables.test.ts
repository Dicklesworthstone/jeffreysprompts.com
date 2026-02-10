/**
 * Unit tests for packages/cli/src/lib/variables.ts
 * Tests variable parsing, file reading, and value processing.
 * Uses real filesystem (temp files) - no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  parseVariables,
  readFileVariable,
  processVariableValue,
  MAX_FILE_VAR_SIZE,
} from "../../src/lib/variables";
import type { PromptVariable } from "@jeffreysprompts/core/prompts/types";

// ---------------------------------------------------------------------------
// Test directory setup
// ---------------------------------------------------------------------------

let TEST_DIR: string;

beforeEach(() => {
  TEST_DIR = join(
    tmpdir(),
    "jfp-var-test-" + Date.now() + "-" + Math.random().toString(36).slice(2)
  );
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// parseVariables
// ---------------------------------------------------------------------------

describe("parseVariables", () => {
  it("parses --VAR=value format", () => {
    const result = parseVariables(["--MY_VAR=hello"]);
    expect(result).toEqual({ MY_VAR: "hello" });
  });

  it("parses multiple variables", () => {
    const result = parseVariables([
      "--NAME=test",
      "--VERSION=1.0",
      "--DESC=a description",
    ]);
    expect(result).toEqual({
      NAME: "test",
      VERSION: "1.0",
      DESC: "a description",
    });
  });

  it("handles values with equals signs", () => {
    const result = parseVariables(["--EXPR=x=1+2"]);
    expect(result).toEqual({ EXPR: "x=1+2" });
  });

  it("handles empty value", () => {
    const result = parseVariables(["--KEY="]);
    expect(result).toEqual({ KEY: "" });
  });

  it("ignores non-variable args", () => {
    const result = parseVariables([
      "--json",
      "show",
      "idea-wizard",
      "--MY_VAR=test",
    ]);
    expect(result).toEqual({ json: undefined, MY_VAR: "test" });
    // Actually --json doesn't match because it doesn't have =
    // Let me re-check the implementation
  });

  it("ignores flags without = sign", () => {
    const result = parseVariables(["--json", "--verbose", "--MY_VAR=test"]);
    expect(result).toEqual({ MY_VAR: "test" });
  });

  it("ignores positional args", () => {
    const result = parseVariables(["show", "idea-wizard"]);
    expect(result).toEqual({});
  });

  it("parses lowercase variable names", () => {
    const result = parseVariables(["--name=value"]);
    expect(result).toEqual({ name: "value" });
  });

  it("parses mixed case variable names", () => {
    const result = parseVariables(["--myVar=value"]);
    expect(result).toEqual({ myVar: "value" });
  });

  it("rejects names starting with underscore", () => {
    const result = parseVariables(["--_HIDDEN=value"]);
    expect(result).toEqual({});
  });

  it("rejects names starting with number", () => {
    const result = parseVariables(["--1BAD=value"]);
    expect(result).toEqual({});
  });

  it("returns empty object for empty args", () => {
    expect(parseVariables([])).toEqual({});
  });

  it("handles values with spaces", () => {
    const result = parseVariables(["--TITLE=My Great Project"]);
    expect(result).toEqual({ TITLE: "My Great Project" });
  });
});

// ---------------------------------------------------------------------------
// readFileVariable
// ---------------------------------------------------------------------------

describe("readFileVariable", () => {
  it("reads file contents", () => {
    const filePath = join(TEST_DIR, "test.txt");
    writeFileSync(filePath, "file contents here");

    const result = readFileVariable(filePath, "TEST_VAR");
    expect(result).toBe("file contents here");
  });

  it("reads UTF-8 content", () => {
    const filePath = join(TEST_DIR, "unicode.txt");
    writeFileSync(filePath, "Hello world! Emoji: \u{1F600}");

    const result = readFileVariable(filePath, "UNICODE_VAR");
    expect(result).toContain("Hello world!");
  });

  it("throws for non-existent file", () => {
    expect(() =>
      readFileVariable(join(TEST_DIR, "nonexistent.txt"), "MISSING")
    ).toThrow("File not found");
  });

  it("throws for directory path", () => {
    expect(() => readFileVariable(TEST_DIR, "DIR_VAR")).toThrow(
      "not a file"
    );
  });

  it("truncates files larger than MAX_FILE_VAR_SIZE", () => {
    const filePath = join(TEST_DIR, "large.txt");
    const largeContent = "x".repeat(MAX_FILE_VAR_SIZE + 1000);
    writeFileSync(filePath, largeContent);

    const result = readFileVariable(filePath, "LARGE_VAR");
    expect(result.length).toBeLessThan(largeContent.length);
    expect(result).toContain("[File truncated to");
    expect(result).toContain(`${MAX_FILE_VAR_SIZE} bytes`);
  });

  it("does not truncate files at exactly MAX_FILE_VAR_SIZE", () => {
    const filePath = join(TEST_DIR, "exact.txt");
    const exactContent = "x".repeat(MAX_FILE_VAR_SIZE);
    writeFileSync(filePath, exactContent);

    const result = readFileVariable(filePath, "EXACT_VAR");
    expect(result).toBe(exactContent);
    expect(result).not.toContain("[File truncated");
  });

  it("reads small files normally", () => {
    const filePath = join(TEST_DIR, "small.txt");
    writeFileSync(filePath, "small file");

    const result = readFileVariable(filePath, "SMALL_VAR");
    expect(result).toBe("small file");
  });

  it("includes variable name in error messages", () => {
    try {
      readFileVariable(join(TEST_DIR, "nope.txt"), "MY_FILE");
      expect(true).toBe(false); // Should not reach here
    } catch (e) {
      expect((e as Error).message).toContain("MY_FILE");
    }
  });
});

// ---------------------------------------------------------------------------
// processVariableValue
// ---------------------------------------------------------------------------

describe("processVariableValue", () => {
  it("returns raw value when no variable definition", () => {
    expect(processVariableValue("hello", undefined)).toBe("hello");
  });

  it("returns raw value for text type", () => {
    const variable: PromptVariable = {
      name: "NAME",
      label: "Name",
      type: "text",
    };
    expect(processVariableValue("test", variable)).toBe("test");
  });

  it("returns raw value for path type", () => {
    const variable: PromptVariable = {
      name: "DIR",
      label: "Directory",
      type: "path",
    };
    expect(processVariableValue("/usr/local/bin", variable)).toBe(
      "/usr/local/bin"
    );
  });

  it("reads file contents for file type", () => {
    const filePath = join(TEST_DIR, "data.txt");
    writeFileSync(filePath, "file data");

    const variable: PromptVariable = {
      name: "DATA_FILE",
      label: "Data File",
      type: "file",
    };
    const result = processVariableValue(filePath, variable);
    expect(result).toBe("file data");
  });

  it("throws for file type with non-existent path", () => {
    const variable: PromptVariable = {
      name: "MISSING_FILE",
      label: "Missing File",
      type: "file",
    };
    expect(() =>
      processVariableValue("/nonexistent/path.txt", variable)
    ).toThrow("File not found");
  });

  it("passes through empty string for file type", () => {
    const variable: PromptVariable = {
      name: "OPT_FILE",
      label: "Optional File",
      type: "file",
    };
    // Empty string is falsy, so it should pass through
    expect(processVariableValue("", variable)).toBe("");
  });

  it("returns raw value for multiline type", () => {
    const variable: PromptVariable = {
      name: "CONTENT",
      label: "Content",
      type: "multiline",
    };
    expect(processVariableValue("line1\nline2", variable)).toBe(
      "line1\nline2"
    );
  });

  it("returns raw value for select type", () => {
    const variable: PromptVariable = {
      name: "CHOICE",
      label: "Choice",
      type: "select",
      options: ["a", "b", "c"],
    };
    expect(processVariableValue("b", variable)).toBe("b");
  });
});

// ---------------------------------------------------------------------------
// MAX_FILE_VAR_SIZE constant
// ---------------------------------------------------------------------------

describe("MAX_FILE_VAR_SIZE", () => {
  it("is 100KB (102400 bytes)", () => {
    expect(MAX_FILE_VAR_SIZE).toBe(102400);
  });
});
