// packages/core/src/export/markdown.ts
// Generate standalone markdown files from prompts

import type { Prompt } from "../prompts/types";
import type { Workflow } from "../prompts/workflows";
import { getPrompt } from "../prompts/registry";

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
 * Generate standalone markdown for a single prompt
 */
export function generatePromptMarkdown(prompt: Prompt): string {
  const sections: string[] = [
    `# ${prompt.title}`,
    "",
    `> ${prompt.description}`,
    "",
    `**Category:** ${prompt.category}`,
    `**Tags:** ${prompt.tags.join(", ")}`,
    `**Author:** ${prompt.author}${prompt.twitter ? ` (${prompt.twitter})` : ""}`,
    `**Version:** ${prompt.version}`,
    "",
    "## Prompt",
    "",
  ];

  // Use a code fence that doesn't conflict with content
  const fence = getCodeFence(prompt.content);
  sections.push(fence, prompt.content, fence);

  if (prompt.whenToUse?.length) {
    sections.push("", "## When to Use", "");
    for (const item of prompt.whenToUse) {
      sections.push(`- ${item}`);
    }
  }

  if (prompt.tips?.length) {
    sections.push("", "## Tips", "");
    for (const tip of prompt.tips) {
      sections.push(`- ${tip}`);
    }
  }

  if (prompt.examples?.length) {
    sections.push("", "## Examples", "");
    for (const example of prompt.examples) {
      sections.push(`- ${example}`);
    }
  }

  sections.push(
    "",
    "---",
    "",
    `*From [JeffreysPrompts.com](https://jeffreysprompts.com/prompts/${prompt.id})*`
  );

  return sections.join("\n") + "\n";
}

/**
 * Generate markdown bundle for multiple prompts
 */
export function generateBundleMarkdown(prompts: Prompt[], title: string): string {
  const sections: string[] = [
    `# ${title}`,
    "",
    `A collection of ${prompts.length} prompts from JeffreysPrompts.com`,
    "",
    "## Table of Contents",
    "",
  ];

  for (const prompt of prompts) {
    sections.push(`- [${prompt.title}](#${prompt.id})`);
  }

  sections.push("");

  for (const prompt of prompts) {
    sections.push(
      "---",
      "",
      `<a id="${prompt.id}"></a>`,
      "",
      generatePromptMarkdown(prompt)
    );
  }

  return sections.join("\n");
}

/**
 * Generate markdown for a workflow (ordered prompt chain)
 */
export function generateWorkflowMarkdown(workflow: Workflow): string {
  const sections: string[] = [
    `# ${workflow.title}`,
    "",
    `> ${workflow.description}`,
  ];

  if (workflow.whenToUse.length) {
    sections.push("", "## When to Use", "");
    for (const item of workflow.whenToUse) {
      sections.push(`- ${item}`);
    }
  }

  sections.push("", "## Steps", "");

  workflow.steps.forEach((step, index) => {
    const prompt = getPrompt(step.promptId);
    const stepTitle = prompt?.title ?? step.promptId;

    sections.push(`### Step ${index + 1}: ${stepTitle}`, "");
    sections.push(`**Prompt ID:** \`${step.promptId}\``);
    sections.push(`**Handoff note:** ${step.note}`);

    if (!prompt) {
      sections.push("", "_Prompt not found in registry._", "");
      return;
    }

    sections.push("");
    const fence = getCodeFence(prompt.content);
    sections.push(fence);
    sections.push(prompt.content);
    sections.push(fence);
    sections.push("");
  });

  sections.push(
    "---",
    "",
    `*From [JeffreysPrompts.com](https://jeffreysprompts.com/workflows/${workflow.id})*`
  );

  return sections.join("\n") + "\n";
}
