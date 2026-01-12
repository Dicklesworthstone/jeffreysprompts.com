import type { Metadata } from "next";
import Link from "next/link";
import { HelpLayout, ArticleContent } from "@/components/help/HelpLayout";

export const metadata: Metadata = {
  title: "Search Commands - Help Center",
  description: "Learn how to search for prompts using the jfp CLI with fuzzy matching and filters.",
};

export default function SearchCommandsPage() {
  return (
    <HelpLayout
      title="Search Commands"
      category="cli"
    >
      <ArticleContent>
        <p className="lead">
          The jfp CLI includes powerful search capabilities with fuzzy matching and filtering.
        </p>

        <h2>Basic search</h2>
        <p>
          Search for prompts by keyword:
        </p>
        <pre>{`# Search all fields
jfp search "code review"

# Search returns matches from title, description, and content
jfp search debugging`}</pre>

        <h2>Fuzzy search</h2>
        <p>
          jfp uses fuzzy matching, so you don&apos;t need exact matches:
        </p>
        <pre>{`# Finds "idea-wizard" even with typos
jfp search "idee wizrd"

# Partial matches work
jfp search "refact"`}</pre>

        <h2>Interactive browser (fzf-style)</h2>
        <p>
          For an interactive experience similar to fzf:
        </p>
        <pre>{`# Launch interactive browser
jfp i`}</pre>
        <p>
          In interactive mode:
        </p>
        <ul>
          <li>Type to filter results in real-time</li>
          <li>Use arrow keys to navigate</li>
          <li>Press Enter to view a prompt</li>
          <li>Choose actions like copy, install, or export</li>
          <li>Press Esc to cancel</li>
        </ul>

        <h2>Search scopes (premium)</h2>
        <pre>{`# Search your personal prompts
jfp search "review" --mine

# Search saved prompts
jfp search "review" --saved

# Search everything (public + personal)
jfp search "review" --all

# Force local registry only
jfp search "review" --local`}</pre>
        <p>
          For exact category or tag filtering, use <code>jfp list --category</code> or{" "}
          <code>jfp list --tag</code>.
        </p>

        <h2>Limiting output</h2>
        <pre>{`# Show only top 5 results
jfp search "debugging" --limit 5

# Show first result only
jfp search "debugging" --limit 1`}</pre>

        <h2>JSON output for scripting</h2>
        <p>
          Use <code>--json</code> for programmatic access:
        </p>
        <pre>{`# Get JSON results
jfp search "automation" --json

# Pipe to jq for filtering
jfp search "robot" --json | jq '.results[0].id'

# Get just the IDs
jfp search "robot" --json | jq -r '.results[].id'`}</pre>

        <h2>Search tips</h2>
        <p>
          Queries are keyword-based. Use multiple words to narrow results:
        </p>
        <pre>{`# Multi-word query
jfp search "code review"

# Short query still works
jfp search automation`}</pre>

        <h2>Combining with other commands</h2>
        <pre>{`# Search then show the first result
jfp show "$(jfp search "wizard" --json | jq -r '.results[0].id')"

# Search and copy first result to clipboard
jfp show "$(jfp search "review" --json | jq -r '.results[0].id')" --raw | pbcopy

# Export all search results
jfp search "debugging" --json | jq -r '.results[].id' | xargs jfp export --format skill`}</pre>

        <h2>Registry cache</h2>
        <p>
          jfp uses a local prompt registry cache for fast searches:
        </p>
        <pre>{`# Force refresh the cache
jfp refresh

# View cache status
jfp status`}</pre>

        <h2>Examples</h2>
        <h3>Find prompts for a specific task</h3>
        <pre>{`# Find code review prompts
jfp search "code review"

# Browse debugging prompts by category
jfp list --category debugging`}</pre>

        <h3>Build a prompt toolkit</h3>
        <pre>{`# Find all prompts for a project type
jfp search "testing" --json > my-testing-prompts.json

# Export as Skills for Claude Code
jfp search "robot mode" --json | jq -r '.results[].id' | xargs jfp export --format skill`}</pre>

        <h2>Related</h2>
        <ul>
          <li>
            <Link href="/help/cli/basic-usage">Basic CLI usage</Link>
          </li>
          <li>
            <Link href="/help/prompts/exporting">Exporting prompts</Link>
          </li>
        </ul>
      </ArticleContent>
    </HelpLayout>
  );
}
