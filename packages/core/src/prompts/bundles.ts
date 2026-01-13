// packages/core/src/prompts/bundles.ts
// Prompt bundles - curated collections of related prompts

import type { Prompt } from "./types";
import { getPrompt } from "./registry";
import { escapeYamlValue, escapeYamlArrayItem } from "../export/yaml";

/**
 * Lucide icon name for bundle display
 */
export type BundleIcon =
  | "sparkles"
  | "rocket"
  | "code"
  | "file-text"
  | "brain"
  | "zap"
  | "package"
  | "star";

/**
 * Bundle interface - curated collection of related prompts
 */
export interface Bundle {
  /** Unique identifier (kebab-case) */
  id: string;

  /** Human-readable title */
  title: string;

  /** One-line description */
  description: string;

  /** Semantic version */
  version: string;

  /** Last update date (ISO 8601) */
  updatedAt: string;

  /** IDs of prompts included in this bundle */
  promptIds: string[];

  /** Workflow description - how to use these prompts together */
  workflow?: string;

  /** When to use this bundle */
  whenToUse?: string[];

  /** Author attribution */
  author: string;

  /** Featured on homepage */
  featured?: boolean;

  /** Lucide icon name for display */
  icon?: BundleIcon;
}

/**
 * Bundle registry - curated collections
 */
export const bundles: Bundle[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "Essential prompts for any project - ideation, documentation, and automation",
    version: "1.0.0",
    updatedAt: "2025-01-10",
    promptIds: ["idea-wizard", "readme-reviser", "robot-mode-maker"],
    workflow: `1. **Start with Idea Wizard** - Generate and evaluate improvement ideas
2. **Document with README Reviser** - Keep docs in sync with changes
3. **Automate with Robot-Mode Maker** - Build agent-friendly CLI interfaces`,
    whenToUse: [
      "When starting a new project",
      "When onboarding to an existing codebase",
      "When establishing agent-friendly workflows",
    ],
    author: "Jeffrey Emanuel",
    featured: true,
    icon: "rocket",
  },
  {
    id: "jeffrey-essentials",
    title: "Jeffrey's Essentials",
    description: "The core prompts from Jeffrey's 'My Favorite Prompts' series",
    version: "1.0.0",
    updatedAt: "2025-01-09",
    promptIds: ["idea-wizard", "readme-reviser", "robot-mode-maker"],
    author: "Jeffrey Emanuel",
    featured: false,
    icon: "star",
  },
];

/**
 * Get a bundle by ID
 */
export function getBundle(id: string): Bundle | undefined {
  return bundles.find((b) => b.id === id);
}

/**
 * Get all prompts in a bundle
 */
export function getBundlePrompts(bundle: Bundle, promptsMap?: Map<string, Prompt>): Prompt[] {
  return bundle.promptIds
    .map((id) => promptsMap ? promptsMap.get(id) : getPrompt(id))
    .filter((p): p is Prompt => p !== undefined);
}

/**
 * Generate SKILL.md content for a bundle (combined skill)
 * Creates a single skill file containing all prompts in the bundle
 */
export function generateBundleSkillMd(bundle: Bundle, promptsMap?: Map<string, Prompt>): string {
  const prompts = getBundlePrompts(bundle, promptsMap);

  const frontmatter = [
    "---",
    `name: ${escapeYamlValue(bundle.id)}`,
    `description: ${escapeYamlValue(bundle.description)}`,
    `version: ${escapeYamlValue(bundle.version)}`,
    `author: ${escapeYamlValue(bundle.author)}`,
    `type: bundle`,
    `prompts: [${prompts.map((p) => `"${escapeYamlArrayItem(p.id)}"`).join(", ")}]`,
    `source: https://jeffreysprompts.com/bundles/${bundle.id}`,
    "x_jfp_generated: true",
    "---",
    "",
  ].join("\n");

  const content: string[] = [`# ${bundle.title}`, "", bundle.description, ""];

  // Add workflow section if present
  if (bundle.workflow) {
    content.push("## Workflow");
    content.push("");
    content.push(bundle.workflow);
    content.push("");
  }

  // Add when to use section if present
  if (bundle.whenToUse && bundle.whenToUse.length > 0) {
    content.push("## When to Use This Bundle");
    content.push("");
    for (const item of bundle.whenToUse) {
      content.push(`- ${item}`);
    }
    content.push("");
  }

  // Add each prompt as a section
  content.push("---");
  content.push("");
  content.push("## Included Prompts");
  content.push("");

  for (const prompt of prompts) {
    content.push(`### ${prompt.title}`);
    content.push("");
    content.push(`*${prompt.description}*`);
    content.push("");
    content.push(prompt.content);
    content.push("");

    if (prompt.whenToUse && prompt.whenToUse.length > 0) {
      content.push("**When to use:**");
      for (const item of prompt.whenToUse) {
        content.push(`- ${item}`);
      }
      content.push("");
    }

    if (prompt.tips && prompt.tips.length > 0) {
      content.push("**Tips:**");
      for (const item of prompt.tips) {
        content.push(`- ${item}`);
      }
      content.push("");
    }

    content.push("---");
    content.push("");
  }

  // Attribution footer
  content.push(
    `*Bundle from [JeffreysPrompts.com](https://jeffreysprompts.com/bundles/${bundle.id})*`
  );
  content.push("");

  return frontmatter + content.join("\n");
}

/**
 * Get all featured bundles
 */
export const featuredBundles = bundles.filter((b) => b.featured);

/**
 * Bundles indexed by ID for fast lookup
 */
export const bundlesById = new Map(bundles.map((b) => [b.id, b]));
