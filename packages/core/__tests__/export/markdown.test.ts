/**
 * Unit tests for packages/core/src/export/markdown.ts
 * Tests markdown generation for prompts, bundles, and workflows.
 * No mocks - uses real registry data.
 */

import { describe, it, expect } from "bun:test";
import {
  generatePromptMarkdown,
  generateBundleMarkdown,
  generateWorkflowMarkdown,
} from "../../src/export/markdown";
import { prompts, getPrompt } from "../../src/prompts/registry";
import { workflows } from "../../src/prompts/workflows";
import type { Prompt } from "../../src/prompts/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const minimalPrompt: Prompt = {
  id: "test-md",
  title: "Test Markdown",
  description: "A test prompt for markdown generation",
  category: "testing",
  tags: ["test"],
  author: "Test Author",
  version: "1.0.0",
  created: "2026-01-01",
  content: "This is the test prompt content.",
};

const fullPrompt: Prompt = {
  ...minimalPrompt,
  id: "test-full-md",
  twitter: "@testuser",
  whenToUse: ["When testing markdown", "When verifying export"],
  tips: ["Check the output", "Verify sections"],
  examples: ["Example 1", "Example 2"],
};

const backtickPrompt: Prompt = {
  ...minimalPrompt,
  id: "test-backtick",
  content: "Here is some code:\n```\nconsole.log('hello')\n```\nEnd.",
};

// ---------------------------------------------------------------------------
// generatePromptMarkdown
// ---------------------------------------------------------------------------

describe("generatePromptMarkdown", () => {
  it("includes title as H1", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md).toContain("# Test Markdown");
  });

  it("includes description as blockquote", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md).toContain("> A test prompt for markdown generation");
  });

  it("includes metadata fields", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md).toContain("**Category:** testing");
    expect(md).toContain("**Tags:** test");
    expect(md).toContain("**Author:** Test Author");
    expect(md).toContain("**Version:** 1.0.0");
  });

  it("includes twitter handle when present", () => {
    const md = generatePromptMarkdown(fullPrompt);
    expect(md).toContain("(@testuser)");
  });

  it("omits twitter handle when absent", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md).not.toContain("(@");
  });

  it("includes content in code fence", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md).toContain("```");
    expect(md).toContain("This is the test prompt content.");
  });

  it("includes When to Use section when present", () => {
    const md = generatePromptMarkdown(fullPrompt);
    expect(md).toContain("## When to Use");
    expect(md).toContain("- When testing markdown");
    expect(md).toContain("- When verifying export");
  });

  it("omits When to Use section when absent", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md).not.toContain("## When to Use");
  });

  it("includes Tips section when present", () => {
    const md = generatePromptMarkdown(fullPrompt);
    expect(md).toContain("## Tips");
    expect(md).toContain("- Check the output");
  });

  it("includes Examples section when present", () => {
    const md = generatePromptMarkdown(fullPrompt);
    expect(md).toContain("## Examples");
    expect(md).toContain("- Example 1");
  });

  it("includes attribution footer", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md).toContain("JeffreysPrompts.com");
    expect(md).toContain(`/prompts/${minimalPrompt.id}`);
  });

  it("uses longer fence when content has backticks", () => {
    const md = generatePromptMarkdown(backtickPrompt);
    expect(md).toContain("````");
  });

  it("ends with newline", () => {
    const md = generatePromptMarkdown(minimalPrompt);
    expect(md.endsWith("\n")).toBe(true);
  });

  it("generates valid markdown for real prompts", () => {
    const realPrompt = getPrompt("idea-wizard")!;
    const md = generatePromptMarkdown(realPrompt);
    expect(md).toContain("# The Idea Wizard");
    expect(md).toContain("**Category:** ideation");
    expect(md).toContain("Come up with your very best ideas");
  });
});

// ---------------------------------------------------------------------------
// generateBundleMarkdown
// ---------------------------------------------------------------------------

describe("generateBundleMarkdown", () => {
  it("includes title as H1", () => {
    const md = generateBundleMarkdown([minimalPrompt], "Test Bundle");
    expect(md).toContain("# Test Bundle");
  });

  it("includes prompt count", () => {
    const md = generateBundleMarkdown([minimalPrompt, fullPrompt], "Two Prompts");
    expect(md).toContain("2 prompts");
  });

  it("includes table of contents", () => {
    const md = generateBundleMarkdown([minimalPrompt, fullPrompt], "Test");
    expect(md).toContain("## Table of Contents");
    expect(md).toContain(`[${minimalPrompt.title}]`);
    expect(md).toContain(`[${fullPrompt.title}]`);
  });

  it("includes anchor links for each prompt", () => {
    const md = generateBundleMarkdown([minimalPrompt], "Test");
    expect(md).toContain(`<a id="${minimalPrompt.id}"></a>`);
  });

  it("includes individual prompt markdown", () => {
    const md = generateBundleMarkdown([minimalPrompt], "Test");
    expect(md).toContain("# Test Markdown");
    expect(md).toContain("This is the test prompt content.");
  });

  it("includes dividers between prompts", () => {
    const md = generateBundleMarkdown([minimalPrompt, fullPrompt], "Test");
    expect(md).toContain("---");
  });
});

// ---------------------------------------------------------------------------
// generateWorkflowMarkdown
// ---------------------------------------------------------------------------

describe("generateWorkflowMarkdown", () => {
  it("generates markdown for real workflows", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    expect(md).toContain(`# ${workflow.title}`);
    expect(md).toContain(`> ${workflow.description}`);
  });

  it("includes When to Use section", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    if (workflow.whenToUse.length > 0) {
      expect(md).toContain("## When to Use");
    }
  });

  it("includes Steps section", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    expect(md).toContain("## Steps");
  });

  it("numbers steps correctly", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    expect(md).toContain("### Step 1:");
    if (workflow.steps.length > 1) {
      expect(md).toContain("### Step 2:");
    }
  });

  it("includes prompt content in steps", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    const firstStepPrompt = getPrompt(workflow.steps[0].promptId);
    if (firstStepPrompt) {
      expect(md).toContain(firstStepPrompt.content.slice(0, 50));
    }
  });

  it("includes step notes", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    expect(md).toContain(workflow.steps[0].note);
  });

  it("includes attribution footer", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    expect(md).toContain("JeffreysPrompts.com");
    expect(md).toContain(`/workflows/${workflow.id}`);
  });

  it("ends with newline", () => {
    const workflow = workflows[0];
    const md = generateWorkflowMarkdown(workflow);
    expect(md.endsWith("\n")).toBe(true);
  });
});
