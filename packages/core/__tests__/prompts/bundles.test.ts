/**
 * Unit tests for packages/core/src/prompts/bundles.ts
 * Tests bundle data integrity, lookup functions, and SKILL.md generation.
 * No mocks - imports real registry data and validates against it.
 */

import { describe, it, expect } from "bun:test";
import {
  bundles,
  getBundle,
  getBundlePrompts,
  generateBundleSkillMd,
  featuredBundles,
  bundlesById,
} from "../../src/prompts/bundles";
import { prompts, promptsById, getPrompt } from "../../src/prompts/registry";

// ---------------------------------------------------------------------------
// Bundle data integrity
// ---------------------------------------------------------------------------

describe("bundles array", () => {
  it("should have at least one bundle", () => {
    expect(bundles.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", () => {
    const ids = bundles.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have required fields on all bundles", () => {
    for (const bundle of bundles) {
      expect(bundle.id).toBeTruthy();
      expect(bundle.title).toBeTruthy();
      expect(bundle.description).toBeTruthy();
      expect(bundle.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(bundle.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(bundle.promptIds)).toBe(true);
      expect(bundle.promptIds.length).toBeGreaterThan(0);
      expect(bundle.author).toBeTruthy();
    }
  });

  it("should reference only existing prompt IDs", () => {
    const allPromptIds = new Set(prompts.map((p) => p.id));
    for (const bundle of bundles) {
      for (const promptId of bundle.promptIds) {
        expect(allPromptIds.has(promptId)).toBe(true);
      }
    }
  });

  it("should have valid IDs (kebab-case)", () => {
    for (const bundle of bundles) {
      expect(bundle.id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
    }
  });
});

// ---------------------------------------------------------------------------
// featuredBundles
// ---------------------------------------------------------------------------

describe("featuredBundles", () => {
  it("should only include bundles with featured=true", () => {
    for (const bundle of featuredBundles) {
      expect(bundle.featured).toBe(true);
    }
  });

  it("should match filtered bundles array", () => {
    const expected = bundles.filter((b) => b.featured);
    expect(featuredBundles).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// bundlesById
// ---------------------------------------------------------------------------

describe("bundlesById", () => {
  it("should map all bundles by ID", () => {
    expect(bundlesById.size).toBe(bundles.length);
    for (const bundle of bundles) {
      expect(bundlesById.get(bundle.id)).toBe(bundle);
    }
  });

  it("should return undefined for non-existent ID", () => {
    expect(bundlesById.get("nonexistent")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getBundle
// ---------------------------------------------------------------------------

describe("getBundle", () => {
  it("should return bundle by ID", () => {
    const bundle = getBundle("getting-started");
    expect(bundle).toBeDefined();
    expect(bundle?.id).toBe("getting-started");
    expect(bundle?.title).toBe("Getting Started");
  });

  it("should return undefined for non-existent ID", () => {
    const result = getBundle("nonexistent");
    expect(result).toBeUndefined();
  });

  it("should find every bundle by its ID", () => {
    for (const bundle of bundles) {
      const found = getBundle(bundle.id);
      expect(found).toBe(bundle);
    }
  });
});

// ---------------------------------------------------------------------------
// getBundlePrompts
// ---------------------------------------------------------------------------

describe("getBundlePrompts", () => {
  it("should return resolved prompts for a bundle", () => {
    const bundle = bundles[0];
    const resolved = getBundlePrompts(bundle);
    expect(resolved.length).toBe(bundle.promptIds.length);
    for (let i = 0; i < resolved.length; i++) {
      expect(resolved[i].id).toBe(bundle.promptIds[i]);
    }
  });

  it("should use promptsMap when provided", () => {
    const bundle = bundles[0];
    const resolved = getBundlePrompts(bundle, promptsById);
    expect(resolved.length).toBe(bundle.promptIds.length);
    for (const prompt of resolved) {
      expect(prompt).toBe(promptsById.get(prompt.id));
    }
  });

  it("should filter out non-existent prompt IDs", () => {
    const fakeBundle = {
      id: "fake",
      title: "Fake",
      description: "Test",
      version: "1.0.0",
      updatedAt: "2026-01-01",
      promptIds: ["idea-wizard", "nonexistent-prompt-xyz"],
      author: "Test",
    };
    const resolved = getBundlePrompts(fakeBundle);
    expect(resolved.length).toBe(1);
    expect(resolved[0].id).toBe("idea-wizard");
  });

  it("should preserve ordering from promptIds", () => {
    for (const bundle of bundles) {
      const resolved = getBundlePrompts(bundle);
      const resolvedIds = resolved.map((p) => p.id);
      expect(resolvedIds).toEqual(bundle.promptIds);
    }
  });
});

// ---------------------------------------------------------------------------
// generateBundleSkillMd
// ---------------------------------------------------------------------------

describe("generateBundleSkillMd", () => {
  it("should generate valid SKILL.md content", () => {
    const bundle = getBundle("getting-started")!;
    const md = generateBundleSkillMd(bundle);

    // Should start with YAML frontmatter
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("name: getting-started");
    expect(md).toContain("type: bundle");
    expect(md).toContain("x_jfp_generated: true");
    expect(md).toContain("---");
  });

  it("should include bundle title as heading", () => {
    const bundle = bundles[0];
    const md = generateBundleSkillMd(bundle);
    expect(md).toContain(`# ${bundle.title}`);
  });

  it("should include bundle description", () => {
    const bundle = bundles[0];
    const md = generateBundleSkillMd(bundle);
    expect(md).toContain(bundle.description);
  });

  it("should include workflow section when present", () => {
    const bundleWithWorkflow = bundles.find((b) => b.workflow);
    if (bundleWithWorkflow) {
      const md = generateBundleSkillMd(bundleWithWorkflow);
      expect(md).toContain("## Workflow");
      expect(md).toContain(bundleWithWorkflow.workflow!);
    }
  });

  it("should include whenToUse section when present", () => {
    const bundleWithWhenToUse = bundles.find(
      (b) => b.whenToUse && b.whenToUse.length > 0
    );
    if (bundleWithWhenToUse) {
      const md = generateBundleSkillMd(bundleWithWhenToUse);
      expect(md).toContain("## When to Use This Bundle");
      for (const item of bundleWithWhenToUse.whenToUse!) {
        expect(md).toContain(`- ${item}`);
      }
    }
  });

  it("should include all prompt contents", () => {
    const bundle = bundles[0];
    const md = generateBundleSkillMd(bundle);
    const resolved = getBundlePrompts(bundle);
    for (const prompt of resolved) {
      expect(md).toContain(`### ${prompt.title}`);
      expect(md).toContain(prompt.content);
    }
  });

  it("should include attribution footer", () => {
    const bundle = bundles[0];
    const md = generateBundleSkillMd(bundle);
    expect(md).toContain("JeffreysPrompts.com");
    expect(md).toContain(`/bundles/${bundle.id}`);
  });

  it("should list prompt IDs in frontmatter", () => {
    const bundle = bundles[0];
    const md = generateBundleSkillMd(bundle);
    for (const promptId of bundle.promptIds) {
      expect(md).toContain(`"${promptId}"`);
    }
  });

  it("should accept custom promptsMap", () => {
    const bundle = bundles[0];
    const md = generateBundleSkillMd(bundle, promptsById);
    expect(md).toContain(`# ${bundle.title}`);
    const resolved = getBundlePrompts(bundle, promptsById);
    for (const prompt of resolved) {
      expect(md).toContain(`### ${prompt.title}`);
    }
  });
});
