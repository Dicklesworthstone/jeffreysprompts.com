/**
 * Unit tests for packages/core/src/export/json.ts
 * Tests JSON registry payload and prompt list generation.
 * No mocks - uses real registry data.
 */

import { describe, it, expect } from "bun:test";
import { buildRegistryPayload, buildPromptList } from "../../src/export/json";
import { prompts, categories, tags } from "../../src/prompts/registry";
import { bundles } from "../../src/prompts/bundles";
import { workflows } from "../../src/prompts/workflows";

// ---------------------------------------------------------------------------
// buildRegistryPayload
// ---------------------------------------------------------------------------

describe("buildRegistryPayload", () => {
  it("returns complete registry structure", () => {
    const payload = buildRegistryPayload();
    expect(payload.schemaVersion).toBe(1);
    expect(payload.version).toBe("1.0.0");
    expect(payload.generatedAt).toBeTruthy();
    expect(Array.isArray(payload.prompts)).toBe(true);
    expect(Array.isArray(payload.bundles)).toBe(true);
    expect(Array.isArray(payload.workflows)).toBe(true);
    expect(payload.meta).toBeDefined();
  });

  it("uses provided version", () => {
    const payload = buildRegistryPayload("2.5.0");
    expect(payload.version).toBe("2.5.0");
  });

  it("defaults to version 1.0.0", () => {
    const payload = buildRegistryPayload();
    expect(payload.version).toBe("1.0.0");
  });

  it("generates ISO timestamp", () => {
    const payload = buildRegistryPayload();
    expect(() => new Date(payload.generatedAt)).not.toThrow();
    const parsed = new Date(payload.generatedAt);
    expect(parsed.getTime()).toBeGreaterThan(0);
  });

  it("includes all prompts from registry", () => {
    const payload = buildRegistryPayload();
    expect(payload.prompts.length).toBe(prompts.length);
    expect(payload.prompts).toBe(prompts); // Same reference
  });

  it("includes all bundles", () => {
    const payload = buildRegistryPayload();
    expect(payload.bundles.length).toBe(bundles.length);
    expect(payload.bundles).toBe(bundles);
  });

  it("includes all workflows", () => {
    const payload = buildRegistryPayload();
    expect(payload.workflows.length).toBe(workflows.length);
    expect(payload.workflows).toBe(workflows);
  });

  it("meta.promptCount matches prompts array length", () => {
    const payload = buildRegistryPayload();
    expect(payload.meta.promptCount).toBe(payload.prompts.length);
  });

  it("meta.categories matches registry categories", () => {
    const payload = buildRegistryPayload();
    expect(payload.meta.categories).toEqual(categories as string[]);
  });

  it("meta.tags matches registry tags", () => {
    const payload = buildRegistryPayload();
    expect(payload.meta.tags).toEqual(tags);
  });

  it("is valid JSON when serialized", () => {
    const payload = buildRegistryPayload();
    const json = JSON.stringify(payload);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildPromptList
// ---------------------------------------------------------------------------

describe("buildPromptList", () => {
  it("returns array with same length as prompts", () => {
    const list = buildPromptList();
    expect(list.length).toBe(prompts.length);
  });

  it("includes only minimal fields", () => {
    const list = buildPromptList();
    for (const item of list) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(Array.isArray(item.tags)).toBe(true);
    }
  });

  it("does not include content field", () => {
    const list = buildPromptList();
    for (const item of list) {
      expect((item as Record<string, unknown>).content).toBeUndefined();
    }
  });

  it("does not include optional fields", () => {
    const list = buildPromptList();
    for (const item of list) {
      expect((item as Record<string, unknown>).author).toBeUndefined();
      expect((item as Record<string, unknown>).version).toBeUndefined();
      expect((item as Record<string, unknown>).whenToUse).toBeUndefined();
      expect((item as Record<string, unknown>).tips).toBeUndefined();
    }
  });

  it("preserves prompt ordering", () => {
    const list = buildPromptList();
    for (let i = 0; i < list.length; i++) {
      expect(list[i].id).toBe(prompts[i].id);
    }
  });

  it("matches source prompt values", () => {
    const list = buildPromptList();
    for (let i = 0; i < list.length; i++) {
      expect(list[i].title).toBe(prompts[i].title);
      expect(list[i].description).toBe(prompts[i].description);
      expect(list[i].category).toBe(prompts[i].category);
      expect(list[i].tags).toEqual(prompts[i].tags);
    }
  });
});
