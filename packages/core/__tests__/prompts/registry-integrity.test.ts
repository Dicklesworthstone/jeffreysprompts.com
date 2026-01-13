
import { describe, it, expect } from "bun:test";
import { prompts } from "../../src/prompts/registry";
import { PromptSchema } from "../../src/prompts/schema";

describe("Registry Integrity", () => {
  it("should export a non-empty array of prompts", () => {
    expect(Array.isArray(prompts)).toBe(true);
    expect(prompts.length).toBeGreaterThan(0);
  });

  it("should contain unique IDs", () => {
    const ids = prompts.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should contain valid prompts according to schema", () => {
    for (const prompt of prompts) {
      const result = PromptSchema.safeParse(prompt);
      if (!result.success) {
        console.error(`Prompt ${prompt.id} invalid:`, result.error.format());
      }
      expect(result.success).toBe(true);
    }
  });

  it("should have valid content in all prompts", () => {
    for (const prompt of prompts) {
      expect(prompt.content).toBeDefined();
      expect(prompt.content.length).toBeGreaterThan(10);
    }
  });
});
