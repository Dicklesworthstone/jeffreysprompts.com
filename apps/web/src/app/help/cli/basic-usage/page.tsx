import type { Metadata } from "next";
import Link from "next/link";
import { HelpLayout, ArticleContent } from "@/components/help/HelpLayout";

export const metadata: Metadata = {
  title: "Basic CLI Usage - Help Center",
  description: "Learn the essential jfp commands for accessing prompts from your terminal.",
};

export default function BasicUsagePage() {
  return (
    <HelpLayout
      title="Basic Usage"
      category="cli"
    >
      <ArticleContent>
        <p className="lead">
          The jfp CLI is designed for speed and simplicity. Here are the essential commands.
        </p>

        <h2>Quick start</h2>
        <p>
          Running <code>jfp</code> with no arguments shows a quick help guide:
        </p>
        <pre>{`$ jfp

JeffreysPrompts CLI - Access battle-tested prompts from your terminal

USAGE:
  jfp [command] [options]

COMMANDS:
  list           List all prompts
  show <id>      Show a specific prompt by ID
  search <query> Search prompts
  categories     List all categories
  export         Export prompts to files
  i              Interactive browser

FLAGS:
  --json         Output as JSON
  --raw          Output raw prompt content
  --help, -h     Show help
  --version, -v  Show version`}</pre>

        <h2>Listing prompts</h2>
        <pre>{`# List all prompts
jfp list

# List prompts in a category
jfp list --category debugging

# List with JSON output
jfp list --json`}</pre>

        <h2>Getting a specific prompt</h2>
        <p>
          Use the <code>show</code> command with a prompt ID:
        </p>
        <pre>{`# Get a prompt by ID
jfp show idea-wizard

# Output as JSON
jfp show idea-wizard --json

# Copy directly to clipboard (macOS)
jfp show idea-wizard --raw | pbcopy`}</pre>

        <h2>Viewing categories</h2>
        <pre>{`# List all categories
jfp categories

# Categories include prompt counts by default`}</pre>

        <h2>Output formats</h2>
        <p>
          jfp supports multiple output formats:
        </p>
        <ul>
          <li><strong>Default</strong> — Human-readable with colors</li>
          <li><code>--json</code> — Machine-readable JSON</li>
          <li><code>--raw</code> — Just the prompt content, no formatting</li>
          <li><code>export --format md</code> — Markdown export</li>
        </ul>
        <pre>{`# JSON for scripting
jfp show code-reviewer --json

# Raw prompt for piping
jfp show code-reviewer --raw | pbcopy

# Markdown for documentation
jfp export code-reviewer --format md --stdout > prompt.md`}</pre>

        <h2>Using with AI coding agents</h2>
        <p>
          jfp is optimized for use with AI coding agents like Claude Code:
        </p>
        <pre>{`# Get a prompt and pipe to an agent
jfp show code-reviewer --raw | claude

# Use JSON output for structured parsing
jfp search "debugging" --json --limit 5 | jq -r '.results[0].id'`}</pre>

        <h2>Common options</h2>
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--json</code></td>
              <td>Output as JSON</td>
            </tr>
            <tr>
              <td><code>--raw</code></td>
              <td>Just the content, no metadata</td>
            </tr>
            <tr>
              <td><code>--category &lt;cat&gt;</code></td>
              <td>Filter list by category</td>
            </tr>
            <tr>
              <td><code>--limit &lt;n&gt;</code></td>
              <td>Limit results (search/suggest)</td>
            </tr>
            <tr>
              <td><code>JFP_NO_COLOR=1</code></td>
              <td>Disable colored output (env var)</td>
            </tr>
          </tbody>
        </table>

        <h2>Exit codes</h2>
        <p>
          jfp uses standard exit codes:
        </p>
        <ul>
          <li><code>0</code> — Success</li>
          <li><code>1</code> — Error (most failures)</li>
          <li><code>130</code> — User cancelled an interactive prompt</li>
        </ul>

        <h2>Next steps</h2>
        <ul>
          <li>
            <Link href="/help/cli/search-commands">Learn advanced search commands</Link>
          </li>
          <li>
            <Link href="/help/prompts/exporting">Export prompts to files</Link>
          </li>
        </ul>
      </ArticleContent>
    </HelpLayout>
  );
}
