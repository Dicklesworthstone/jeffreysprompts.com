import type { Metadata } from "next";
import Link from "next/link";
import { HelpLayout, ArticleContent } from "@/components/help/HelpLayout";

export const metadata: Metadata = {
  title: "Exporting as Markdown or Skills - Help Center",
  description: "Learn how to export prompts as Markdown files or Claude Code Skills.",
};

export default function ExportingPage() {
  return (
    <HelpLayout
      title="Exporting as Markdown or Skills"
      category="prompts"
    >
      <ArticleContent>
        <p className="lead">
          Export prompts in formats optimized for different tools and workflows.
        </p>

        <h2>Export formats</h2>
        <p>
          JeffreysPrompts supports several export formats:
        </p>
        <ul>
          <li><strong>Plain text</strong> — Just the prompt content</li>
          <li><strong>Markdown</strong> — Prompt with title, description, and metadata</li>
          <li><strong>Claude Code Skill</strong> — SKILL.md format for Claude Code</li>
          <li><strong>JSON</strong> — Machine-readable with all metadata</li>
        </ul>

        <h2>Exporting a single prompt</h2>
        <p>
          When viewing a prompt, click the <strong>Export</strong> button and choose your format.
          The file will download to your computer.
        </p>

        <h2>Exporting multiple prompts</h2>
        <p>
          To export multiple prompts at once:
        </p>
        <ol>
          <li>Add prompts to your <Link href="/help/prompts/saving-to-basket">basket</Link></li>
          <li>Open your basket</li>
          <li>Click &quot;Export all&quot;</li>
          <li>Choose your format</li>
        </ol>
        <p>
          When exporting multiple prompts, you&apos;ll get a ZIP file containing one file per prompt.
        </p>

        <h2>Claude Code Skills format</h2>
        <p>
          <a href="https://claude.com/claude-code" target="_blank" rel="noopener noreferrer">
            Claude Code
          </a> is Anthropic&apos;s CLI coding agent. It supports custom Skills defined in SKILL.md files.
        </p>
        <p>
          When you export a prompt as a Claude Code Skill:
        </p>
        <ul>
          <li>The file is named <code>SKILL.md</code></li>
          <li>It includes YAML frontmatter with name and description</li>
          <li>The prompt content is formatted for Claude Code</li>
          <li>Usage instructions and examples are included</li>
        </ul>

        <h3>Installing a Skill</h3>
        <p>
          To use an exported Skill with Claude Code:
        </p>
        <ol>
          <li>Create a directory for your skill (e.g., <code>~/.claude/skills/my-skill/</code>)</li>
          <li>Move the SKILL.md file into that directory</li>
          <li>The skill is now available in Claude Code</li>
        </ol>

        <h3>Skill file structure</h3>
        <pre>{`---
name: code-reviewer
description: Reviews code for bugs, style, and best practices
---

# Code Reviewer

[Prompt content here]

## When to Use
- Before submitting a PR
- When reviewing someone else's code

## Examples
- "Review this function for potential bugs"
`}</pre>

        <h2>Markdown format</h2>
        <p>
          Markdown exports include:
        </p>
        <ul>
          <li>Title as H1</li>
          <li>Description and metadata</li>
          <li>The prompt content in a code block</li>
          <li>Usage tips and examples</li>
        </ul>
        <p>
          This format works well for documentation, note-taking apps, or sharing prompts in Git repositories.
        </p>

        <h2>Using exports with other tools</h2>
        <ul>
          <li>
            <strong>Cursor</strong> — Use Markdown exports as Cursor rules
          </li>
          <li>
            <strong>ChatGPT</strong> — Copy plain text into Custom Instructions
          </li>
          <li>
            <strong>Notion/Obsidian</strong> — Import Markdown files directly
          </li>
        </ul>

        <h2>CLI exports</h2>
        <p>
          You can also export prompts using the{" "}
          <Link href="/help/cli/basic-usage">jfp CLI</Link>:
        </p>
        <pre>{`# Export as Skill
jfp export --format skill "code-reviewer"

# Export as Markdown
jfp export --format md "code-reviewer"

# Export as JSON
jfp show "code-reviewer" --json > prompt.json`}</pre>
      </ArticleContent>
    </HelpLayout>
  );
}
