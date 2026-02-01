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
  recommend      Get prompt recommendations
  impact <id>    Show downstream dependencies
  graph export   Export dependency graph
  categories     List all categories
  export         Export prompts to files
  i              Interactive browser

FLAGS:
  --json         Output as JSON
  --raw          Output raw prompt content
  --help, -h     Show help
  --version, -v  Show version`}</pre>

        <h2>Free vs Pro</h2>
        <p>
          The CLI is free to build and use with the public prompt library. Pro unlocks your private
          vault and premium content.
        </p>
        <ul>
          <li>
            <strong>Free:</strong> list/search/show/copy/render/export public prompts, bundles,
            and JSON output
          </li>
          <li>
            <strong>Pro:</strong> personal prompts (<code>list --mine</code>, <code>list --saved</code>,
            <code>search --mine</code>, <code>search --saved</code>, <code>search --all</code>),
            plus <code>save</code>, <code>sync</code>, <code>notes</code>, <code>collections</code>,
            <code>packs</code> (premium pack installs), <code>cost</code> (token/cost estimates),
            and metadata tools (<code>tags suggest</code>, <code>dedupe scan</code>)
          </li>
        </ul>
        <p>
          If you log in on a free plan, Pro-only flags will prompt you to upgrade.
        </p>
        <p>
          Learn more about Pro at{" "}
          <a href="https://pro.jeffreysprompts.com/pricing">pro.jeffreysprompts.com/pricing</a>.
        </p>

        <h2>Listing prompts</h2>
        <pre>{`# List all prompts
jfp list

# List prompts in a category
jfp list --category debugging

# List with JSON output
jfp list --json`}</pre>

        <h2>Recommendations</h2>
        <p>
          Use <code>recommend</code> to discover prompts you may like. If you have synced
          your saved prompts, the results are personalized; otherwise you&apos;ll see featured
          prompts.
        </p>
        <pre>{`# Personalized recommendations (uses saved prompts when available)
jfp recommend

# Related recommendations for a specific prompt
jfp recommend idea-wizard`}</pre>

        <h2>Cost estimates (Pro)</h2>
        <p>
          Estimate token usage and USD cost per prompt. Cost estimates require a Pro subscription.
        </p>
        <pre>{`# Estimate cost for a prompt
jfp cost idea-wizard

# Override model and output tokens
jfp cost idea-wizard --model gpt-4o-mini --output-tokens 500

# List supported pricing models
jfp cost --list-models

# View recent budget alerts
jfp cost --alerts --alerts-limit 10`}</pre>

        <h2>Metadata tools (Pro)</h2>
        <p>
          Use the metadata assistant to suggest tags or find likely duplicate prompts.
        </p>
        <pre>{`# Suggest tags/categories/descriptions for a prompt
jfp tags suggest idea-wizard

# Scan for near-duplicate prompts
jfp dedupe scan --min-score 0.9 --limit 10`}</pre>

        <h2>Impact analysis</h2>
        <p>
          Use <code>impact</code> to see what depends on a prompt, or export the full dependency graph.
          You can also include category/tag metadata or your collections as graph nodes.
        </p>
        <pre>{`# Show downstream dependencies
jfp impact idea-wizard

# Export dependency graph as JSON
jfp graph export --json

# Include categories and tags
jfp graph export --include-meta --json

# Include collections (requires login)
jfp graph export --include-collections --json`}</pre>

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
