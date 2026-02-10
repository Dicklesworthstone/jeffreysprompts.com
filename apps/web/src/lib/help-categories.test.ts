/**
 * Tests for help-categories.ts — static help data
 */
import { describe, it, expect } from "vitest";
import { helpCategories } from "./help-categories";

describe("helpCategories", () => {
  it("has 3 categories", () => {
    expect(helpCategories).toHaveLength(3);
  });

  it("each category has required fields", () => {
    for (const cat of helpCategories) {
      expect(cat.slug).toBeTruthy();
      expect(cat.title).toBeTruthy();
      expect(cat.iconName).toBeTruthy();
      expect(cat.description).toBeTruthy();
      expect(Array.isArray(cat.articles)).toBe(true);
      expect(cat.articles.length).toBeGreaterThan(0);
    }
  });

  it("each article has slug and title", () => {
    for (const cat of helpCategories) {
      for (const article of cat.articles) {
        expect(article.slug).toBeTruthy();
        expect(article.title).toBeTruthy();
      }
    }
  });

  it("all slugs are unique", () => {
    const slugs = helpCategories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("includes getting-started, prompts, and cli categories", () => {
    const slugs = helpCategories.map((c) => c.slug);
    expect(slugs).toContain("getting-started");
    expect(slugs).toContain("prompts");
    expect(slugs).toContain("cli");
  });

  it("iconName values are valid lucide icons", () => {
    const validIcons = ["BookOpen", "Sparkles", "Terminal"];
    for (const cat of helpCategories) {
      expect(validIcons).toContain(cat.iconName);
    }
  });
});
