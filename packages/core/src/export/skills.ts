/**
 * SKILL.md export for Claude Code skills integration
 */

import { createHash } from "crypto";
import type { Prompt } from "../prompts/types";
import type { Workflow } from "../prompts/workflows";
import { getPrompt } from "../prompts/registry";
import { escapeYamlValue, escapeYamlArrayItem } from "./yaml";

/**
 * Get a code fence that doesn't conflict with content.
 * Uses longer fences (````, `````, etc.) if content contains backticks.
 */
function getCodeFence(content: string): string {
  let fence = "```";
  while (content.includes(fence) && fence.length < 100) {
    fence += "`";
  }
  return fence;
}

/**
 * Generate SKILL.md content for a single prompt
 */
export function generateSkillMd(prompt: Prompt): string {
  const frontmatter = [
    "---",
    `name: ${escapeYamlValue(prompt.id)}`,
    `description: ${escapeYamlValue(prompt.description)}`,
    `version: ${escapeYamlValue(prompt.version)}`,
    `author: ${escapeYamlValue(prompt.author)}`,
    `category: ${escapeYamlValue(prompt.category)}`,
    `tags: [${prompt.tags.map((t) => `"${escapeYamlArrayItem(t)}"`).join(", ")}]`,
    `source: https://jeffreysprompts.com/prompts/${prompt.id}`,
    "x_jfp_generated: true",
    "---",
    "",
  ].join("\n");

  const content = [`# ${prompt.title}`, "", prompt.content, ""];

  if (prompt.whenToUse && prompt.whenToUse.length > 0) {
    content.push("## When to Use");
    content.push("");
    for (const item of prompt.whenToUse) {
      content.push(`- ${item}`);
    }
    content.push("");
  }

  if (prompt.tips && prompt.tips.length > 0) {
    content.push("## Tips");
    content.push("");
    for (const item of prompt.tips) {
      content.push(`- ${item}`);
    }
    content.push("");
  }

  if (prompt.examples && prompt.examples.length > 0) {
    content.push("## Examples");
    content.push("");
    for (const item of prompt.examples) {
      content.push(`- ${item}`);
    }
    content.push("");
  }

  // Attribution footer
  content.push("---");
  content.push("");
  content.push(`*From [JeffreysPrompts.com](https://jeffreysprompts.com/prompts/${prompt.id})*`);
  content.push("");

  return frontmatter + content.join("\n");
}

/**
 * Generate SKILL.md content for a workflow
 */
export function generateWorkflowSkillMd(workflow: Workflow): string {
  const frontmatter = [
    "---",
    `name: ${escapeYamlValue(workflow.id)}`,
    `description: ${escapeYamlValue(workflow.description)}`,
    `version: 1.0.0`,
    `category: workflow`,
    `source: https://jeffreysprompts.com/workflows/${workflow.id}`,
    "x_jfp_generated: true",
    "x_jfp_kind: workflow",
    "---",
    "",
  ].join("\n");

  const content: string[] = [`# ${workflow.title}`, "", workflow.description, ""];

  if (workflow.whenToUse.length) {
    content.push("## When to Use", "");
    for (const item of workflow.whenToUse) {
      content.push(`- ${item}`);
    }
    content.push("");
  }

  content.push("## Steps", "");

  workflow.steps.forEach((step, index) => {
    const prompt = getPrompt(step.promptId);
    const stepTitle = prompt?.title ?? step.promptId;
    content.push(`### Step ${index + 1}: ${stepTitle}`, "");
    content.push(`**Prompt ID:** \`${step.promptId}\``);
    content.push(`**Handoff note:** ${step.note}`);
    content.push("");

    if (!prompt) {
      content.push("_Prompt not found in registry._", "");
      return;
    }

    const fence = getCodeFence(prompt.content);
    content.push(fence);
    content.push(prompt.content);
    content.push(fence, "");
  });

  content.push("---", "");
  content.push(`*From [JeffreysPrompts.com](https://jeffreysprompts.com/workflows/${workflow.id})*`);
  content.push("");

  return frontmatter + content.join("\n");
}

/**
 * Generate a unique HEREDOC delimiter that doesn't appear in content
 */
export function getUniqueDelimiter(content: string, base: string = "JFP_SKILL"): string {
  const MAX_ATTEMPTS = 100;
  let delimiter = base;
  let counter = 0;
  while (content.includes(delimiter) && counter < MAX_ATTEMPTS) {
    counter++;
    delimiter = `${base}_${counter}`;
  }
  // Fallback with crypto random if we exhausted attempts
  if (counter >= MAX_ATTEMPTS && content.includes(delimiter)) {
    const suffix = createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 16);
    delimiter = `${base}_${suffix}`;
  }
  return delimiter;
}

const SAFE_SKILL_PATH_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

function getSafeSkillPathId(promptId: string): string {
  const trimmed = promptId.trim();
  if (SAFE_SKILL_PATH_ID.test(trimmed)) {
    return trimmed;
  }

  // Fallback: deterministic sanitization for shell/file path safety.
  const sanitized = trimmed
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 200);
  return sanitized || "skill";
}

/**
 * Generate a shell install script for a list of prompts
 * Creates HEREDOC-based installation that does not require downloading
 */
export function generateInstallScript(prompts: Prompt[], targetDir?: string): string {
  const skillsDir = targetDir ?? "$HOME/.config/claude/skills";

  const lines = [
    "#!/usr/bin/env bash",
    "# JeffreysPrompts.com skill installer",
    "# Generated automatically - installs prompts as Claude Code skills",
    "",
    "set -e",
    "",
    `SKILLS_DIR="${skillsDir}"`,
    "",
    "echo \"Installing JeffreysPrompts skills to \$SKILLS_DIR...\"",
    "",
  ];

  for (const prompt of prompts) {
    const safePromptId = getSafeSkillPathId(prompt.id);
    const skillDir = `\$SKILLS_DIR/${safePromptId}`;
    const skillContent = generateSkillMd(prompt);
    // Use a unique delimiter for each prompt to avoid conflicts
    const delimiter = getUniqueDelimiter(skillContent);

    // Sanitize title for shell comment: strip newlines and control chars
    const safeTitle = prompt.title.replace(/[\r\n]+/g, " ").replace(/[^\x20-\x7E]/g, "");
    lines.push(`# Install ${safeTitle}`);
    lines.push(`mkdir -p "${skillDir}"`);
    lines.push(`cat > "${skillDir}/SKILL.md" << '${delimiter}'`);
    lines.push(skillContent);
    lines.push(delimiter);
    lines.push(`echo "  ✓ Installed ${safePromptId}"`);
    lines.push("");
  }

  lines.push("echo \"\"");
  lines.push(`echo "✓ Installed ${prompts.length} skill(s) to \$SKILLS_DIR"`);
  lines.push("echo \"  Skills will be available in your next Claude Code session.\"");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a single-line shell command to install a skill via HEREDOC
 * Useful for "Copy to Clipboard" buttons
 */
export function generateInstallOneLiner(prompt: Prompt, options: { project?: boolean } = {}): string {
  const skillContent = generateSkillMd(prompt);
  const baseDir = options.project ? ".claude/skills" : "$HOME/.config/claude/skills";
  const skillDir = `${baseDir}/${getSafeSkillPathId(prompt.id)}`;
  const delimiter = getUniqueDelimiter(skillContent);

  return `mkdir -p "${skillDir}" && cat > "${skillDir}/SKILL.md" << '${delimiter}'\n${skillContent}\n${delimiter}`;
}

/**
 * Generate skill folder structure as entries for zip creation
 * Returns array of { path, content } objects
 */
export function generateSkillEntries(prompts: Prompt[]): Array<{ path: string; content: string }> {
  return prompts.map((prompt) => ({
    path: `${getSafeSkillPathId(prompt.id)}/SKILL.md`,
    content: generateSkillMd(prompt),
  }));
}

/**
 * Manifest entry for a single installed skill or bundle.
 */
export interface SkillManifestEntry {
  id: string;
  kind: "prompt" | "bundle";
  version: string;
  hash: string;
  updatedAt: string;
}

/**
 * Skills manifest for tracking installed JFP skills.
 */
export interface SkillManifest {
  entries: SkillManifestEntry[];
}

/**
 * Compute SHA256 hash of content (for manifest tracking)
 */
export function computeSkillHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Create a manifest entry for a prompt
 */
export function createManifestEntry(prompt: Prompt): SkillManifestEntry {
  const skillContent = generateSkillMd(prompt);
  const hash = computeSkillHash(skillContent);

  return {
    id: prompt.id,
    kind: "prompt",
    version: prompt.version,
    updatedAt: prompt.updatedAt ?? prompt.created,
    hash,
  };
}
