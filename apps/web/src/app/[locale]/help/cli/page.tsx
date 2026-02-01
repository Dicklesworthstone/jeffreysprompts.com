import type { Metadata } from "next";
import { HelpLayout, ArticleCard } from "@/components/help/HelpLayout";
import { helpCategories } from "@/lib/help-categories";

export const metadata: Metadata = {
  title: "CLI Tool - Help Center",
  description:
    "Learn how to use the jfp command-line interface for accessing prompts from your terminal.",
};

export default function CLIPage() {
  const category = helpCategories.find((c) => c.slug === "cli");

  return (
    <HelpLayout
      title="CLI Tool"
      description="Using the jfp command-line interface"
      category="cli"
    >
      <div className="grid gap-4">
        {category?.articles.map((article) => (
          <ArticleCard
            key={article.slug}
            href={`/help/cli/${article.slug}`}
            title={article.title}
            iconName="Terminal"
          />
        ))}
      </div>

      <div className="mt-8 p-5 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
          Why use the CLI?
        </h3>
        <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
          <li>Access prompts without leaving your terminal</li>
          <li>Integrate prompts into scripts and automation</li>
          <li>Fuzzy search with fzf-style interface</li>
          <li>JSON output for programmatic use</li>
          <li>Works great with AI coding agents</li>
        </ul>
      </div>

      <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-900 rounded-xl">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Dependency graphs
        </h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
          Export the prompt dependency graph and optionally expand it with metadata or collections.
        </p>
        <pre className="text-sm bg-white/80 dark:bg-slate-950/60 rounded-lg p-3 overflow-x-auto">
{`# Base graph
jfp graph export --json

# Include category + tag nodes
jfp graph export --include-meta --json

# Include collections (requires login)
jfp graph export --include-collections --json`}
        </pre>
      </div>

      <div className="mt-6 p-5 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
          Free vs Pro
        </h3>
        <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
          The CLI is free to build and use with public prompts. Pro unlocks private vault access,
          personal prompt search (<span className="font-mono">--mine</span>,{" "}
          <span className="font-mono">--saved</span>,{" "}
          <span className="font-mono">--all</span>), plus save, sync, notes, collections,
          premium packs (<span className="font-mono">jfp packs</span>), and offline cache.
        </p>
      </div>
    </HelpLayout>
  );
}
