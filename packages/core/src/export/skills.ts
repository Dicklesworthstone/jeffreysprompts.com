/**
 * SKILL.md export for Claude Code skills integration
 */

import type { Prompt } from "../prompts/types";

/**
 * Generate SKILL.md content for a single prompt
 */
export function generateSkillMd(prompt: Prompt): string {
  const frontmatter = [
    "---",
    `name: ${prompt.id}`,
    `description: ${prompt.description}`,
    `version: ${prompt.version}`,
    `author: ${prompt.author}`,
    `category: ${prompt.category}`,
    `tags: [${prompt.tags.map((t) => `"${t}"`).join(", ")}]`,
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
 * Generate a unique HEREDOC delimiter that doesn't appear in content
 */
function getUniqueDelimiter(content: string, base: string = "JFP_SKILL"): string {
  let delimiter = base;
  let counter = 0;
  while (content.includes(delimiter)) {
    counter++;
    delimiter = `${base}_${counter}`;
  }
  return delimiter;
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
    const skillDir = `\$SKILLS_DIR/${prompt.id}`;
    const skillContent = generateSkillMd(prompt);
    // Use a unique delimiter for each prompt to avoid conflicts
    const delimiter = getUniqueDelimiter(skillContent);

    lines.push(`# Install ${prompt.title}`);
    lines.push(`mkdir -p "${skillDir}"`);
    lines.push(`cat > "${skillDir}/SKILL.md" << '${delimiter}'`);
    lines.push(skillContent);
    lines.push(delimiter);
    lines.push(`echo "  ✓ Installed ${prompt.id}"`);
    lines.push("");
  }

  lines.push("echo \"\"");
  lines.push(`echo "✓ Installed ${prompts.length} skill(s) to \$SKILLS_DIR"`);
  lines.push("echo \"  Skills will be available in your next Claude Code session.\"");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate skill folder structure as entries for zip creation
 * Returns array of { path, content } objects
 */
export function generateSkillEntries(prompts: Prompt[]): Array<{ path: string; content: string }> {
  return prompts.map((prompt) => ({
    path: `${prompt.id}/SKILL.md`,
    content: generateSkillMd(prompt),
  }));
}

/**
 * Generate a skills manifest for tracking installed skills
 */
export interface SkillManifestEntry {
  id: string;
  kind: "prompt" | "bundle";
  version: string;
  updatedAt: string;
  hash: string;
}

export interface SkillManifest {
  entries: SkillManifestEntry[];
}

/**
 * Compute hash of content (for manifest tracking)
 * Uses a simple djb2 hash - fast and deterministic
 */
export function computeSkillHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit
  }
  return hash.toString(16).padStart(8, "0");
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
