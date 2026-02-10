/**
 * Unit tests for packages/core/src/template/render.ts and variables.ts
 * Tests template rendering, variable extraction, and variable helpers.
 * No mocks - all pure functions.
 */

import { describe, it, expect } from "bun:test";
import {
  renderPrompt,
  extractVariables,
  getMissingVariables,
  getDefaultValue,
} from "../../src/template/render";
import {
  getDynamicDefaults,
  formatVariableName,
  getVariablePlaceholder,
} from "../../src/template/variables";
import type { Prompt, PromptVariable } from "../../src/prompts/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePrompt(content: string, variables?: PromptVariable[]): Prompt {
  return {
    id: "test-template",
    title: "Test Template",
    description: "A test prompt for template rendering",
    category: "testing",
    tags: ["test"],
    author: "Test",
    version: "1.0.0",
    created: "2026-01-01",
    content,
    variables,
  };
}

// ---------------------------------------------------------------------------
// renderPrompt
// ---------------------------------------------------------------------------

describe("renderPrompt", () => {
  it("substitutes single variable", () => {
    const prompt = makePrompt("Hello {{NAME}}!");
    const result = renderPrompt(prompt, { NAME: "World" });
    expect(result).toBe("Hello World!");
  });

  it("substitutes multiple variables", () => {
    const prompt = makePrompt("{{GREETING}} {{NAME}}, welcome to {{PLACE}}.");
    const result = renderPrompt(prompt, {
      GREETING: "Hello",
      NAME: "Alice",
      PLACE: "Wonderland",
    });
    expect(result).toBe("Hello Alice, welcome to Wonderland.");
  });

  it("preserves unmatched placeholders", () => {
    const prompt = makePrompt("Hello {{NAME}}, your role is {{ROLE}}.");
    const result = renderPrompt(prompt, { NAME: "Bob" });
    expect(result).toBe("Hello Bob, your role is {{ROLE}}.");
  });

  it("handles content with no variables", () => {
    const prompt = makePrompt("No variables here.");
    const result = renderPrompt(prompt);
    expect(result).toBe("No variables here.");
  });

  it("applies default values from variables definition", () => {
    const prompt = makePrompt("Project: {{PROJECT_NAME}}", [
      {
        name: "PROJECT_NAME",
        label: "Project",
        type: "text",
        default: "MyProject",
      },
    ]);
    const result = renderPrompt(prompt);
    expect(result).toBe("Project: MyProject");
  });

  it("provided values override defaults", () => {
    const prompt = makePrompt("Project: {{PROJECT_NAME}}", [
      {
        name: "PROJECT_NAME",
        label: "Project",
        type: "text",
        default: "MyProject",
      },
    ]);
    const result = renderPrompt(prompt, { PROJECT_NAME: "CustomProject" });
    expect(result).toBe("Project: CustomProject");
  });

  it("handles whitespace in placeholders", () => {
    const prompt = makePrompt("Hello {{ NAME }} and {{  ROLE  }}!");
    const result = renderPrompt(prompt, { NAME: "Test", ROLE: "Admin" });
    expect(result).toBe("Hello Test and Admin!");
  });

  it("handles empty string values", () => {
    const prompt = makePrompt("Value: {{KEY}}.");
    const result = renderPrompt(prompt, { KEY: "" });
    expect(result).toBe("Value: .");
  });

  it("substitutes same variable multiple times", () => {
    const prompt = makePrompt("{{X}} and {{X}} again");
    const result = renderPrompt(prompt, { X: "hello" });
    expect(result).toBe("hello and hello again");
  });
});

// ---------------------------------------------------------------------------
// extractVariables
// ---------------------------------------------------------------------------

describe("extractVariables", () => {
  it("extracts single variable", () => {
    expect(extractVariables("Hello {{NAME}}")).toEqual(["NAME"]);
  });

  it("extracts multiple variables", () => {
    const vars = extractVariables("{{A}} and {{B}} and {{C}}");
    expect(vars).toContain("A");
    expect(vars).toContain("B");
    expect(vars).toContain("C");
    expect(vars.length).toBe(3);
  });

  it("deduplicates variables", () => {
    const vars = extractVariables("{{X}} and {{X}} again");
    expect(vars).toEqual(["X"]);
  });

  it("returns empty array for no variables", () => {
    expect(extractVariables("No variables here")).toEqual([]);
  });

  it("handles whitespace in placeholders", () => {
    const vars = extractVariables("{{ NAME }} and {{  ROLE  }}");
    expect(vars).toContain("NAME");
    expect(vars).toContain("ROLE");
  });

  it("handles variables with underscores", () => {
    const vars = extractVariables("{{MY_VAR_NAME}}");
    expect(vars).toEqual(["MY_VAR_NAME"]);
  });

  it("handles variables with numbers", () => {
    const vars = extractVariables("{{VAR1}} and {{VAR2}}");
    expect(vars).toContain("VAR1");
    expect(vars).toContain("VAR2");
  });

  it("handles empty string", () => {
    expect(extractVariables("")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMissingVariables
// ---------------------------------------------------------------------------

describe("getMissingVariables", () => {
  it("returns empty when all required vars provided", () => {
    const prompt = makePrompt("{{NAME}}", [
      { name: "NAME", label: "Name", type: "text", required: true },
    ]);
    expect(getMissingVariables(prompt, { NAME: "value" })).toEqual([]);
  });

  it("returns missing required variables", () => {
    const prompt = makePrompt("{{NAME}} {{ROLE}}", [
      { name: "NAME", label: "Name", type: "text", required: true },
      { name: "ROLE", label: "Role", type: "text", required: true },
    ]);
    expect(getMissingVariables(prompt, { NAME: "value" })).toEqual(["ROLE"]);
  });

  it("ignores optional variables", () => {
    const prompt = makePrompt("{{NAME}} {{OPT}}", [
      { name: "NAME", label: "Name", type: "text", required: true },
      { name: "OPT", label: "Optional", type: "text" },
    ]);
    expect(getMissingVariables(prompt, { NAME: "value" })).toEqual([]);
  });

  it("considers default values as satisfying requirement", () => {
    const prompt = makePrompt("{{NAME}}", [
      {
        name: "NAME",
        label: "Name",
        type: "text",
        required: true,
        default: "default-name",
      },
    ]);
    expect(getMissingVariables(prompt, {})).toEqual([]);
  });

  it("considers empty string as not satisfying requirement", () => {
    const prompt = makePrompt("{{NAME}}", [
      { name: "NAME", label: "Name", type: "text", required: true },
    ]);
    expect(getMissingVariables(prompt, { NAME: "" })).toEqual(["NAME"]);
  });

  it("returns empty for prompts with no variables", () => {
    const prompt = makePrompt("No variables");
    expect(getMissingVariables(prompt, {})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getDefaultValue
// ---------------------------------------------------------------------------

describe("getDefaultValue", () => {
  it("returns default when defined", () => {
    const prompt = makePrompt("{{X}}", [
      { name: "X", label: "X", type: "text", default: "hello" },
    ]);
    expect(getDefaultValue(prompt, "X")).toBe("hello");
  });

  it("returns undefined when variable has no default", () => {
    const prompt = makePrompt("{{X}}", [
      { name: "X", label: "X", type: "text" },
    ]);
    expect(getDefaultValue(prompt, "X")).toBeUndefined();
  });

  it("returns undefined for non-existent variable", () => {
    const prompt = makePrompt("{{X}}", [
      { name: "X", label: "X", type: "text" },
    ]);
    expect(getDefaultValue(prompt, "Y")).toBeUndefined();
  });

  it("returns undefined when prompt has no variables", () => {
    const prompt = makePrompt("No vars");
    expect(getDefaultValue(prompt, "X")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getDynamicDefaults
// ---------------------------------------------------------------------------

describe("getDynamicDefaults", () => {
  it("sets CWD and PROJECT_NAME when cwd provided", () => {
    const defaults = getDynamicDefaults("/home/user/my-project");
    expect(defaults.CWD).toBe("/home/user/my-project");
    expect(defaults.PROJECT_NAME).toBe("my-project");
  });

  it("returns empty object when no cwd", () => {
    const defaults = getDynamicDefaults();
    expect(Object.keys(defaults).length).toBe(0);
  });

  it("handles trailing slashes", () => {
    const defaults = getDynamicDefaults("/home/user/project/");
    expect(defaults.PROJECT_NAME).toBe("project");
  });

  it("handles nested paths", () => {
    const defaults = getDynamicDefaults("/a/b/c/d/e");
    expect(defaults.PROJECT_NAME).toBe("e");
  });

  it("handles Windows-style paths", () => {
    const defaults = getDynamicDefaults("C:\\Users\\user\\project");
    expect(defaults.PROJECT_NAME).toBe("project");
  });
});

// ---------------------------------------------------------------------------
// formatVariableName
// ---------------------------------------------------------------------------

describe("formatVariableName", () => {
  it("converts UPPER_SNAKE_CASE to Title Case", () => {
    expect(formatVariableName("PROJECT_NAME")).toBe("Project Name");
  });

  it("handles single word", () => {
    expect(formatVariableName("CWD")).toBe("Cwd");
  });

  it("handles multiple underscores", () => {
    expect(formatVariableName("MY_LONG_VARIABLE_NAME")).toBe(
      "My Long Variable Name"
    );
  });
});

// ---------------------------------------------------------------------------
// getVariablePlaceholder
// ---------------------------------------------------------------------------

describe("getVariablePlaceholder", () => {
  it("returns file placeholder for file type", () => {
    expect(getVariablePlaceholder("FILE", "file")).toBe("Select a file...");
  });

  it("returns path placeholder for path type", () => {
    expect(getVariablePlaceholder("DIR", "path")).toBe("/path/to/directory");
  });

  it("returns multiline placeholder for multiline type", () => {
    expect(getVariablePlaceholder("CONTENT", "multiline")).toContain(
      "multiple lines"
    );
  });

  it("returns formatted name for text type", () => {
    expect(getVariablePlaceholder("PROJECT_NAME", "text")).toBe(
      "Project Name"
    );
  });

  it("returns formatted name for select type", () => {
    expect(getVariablePlaceholder("CHOICE", "select")).toBe("Choice");
  });

  it("returns formatted name for unknown type", () => {
    expect(getVariablePlaceholder("MY_VAR", "custom")).toBe("My Var");
  });
});
