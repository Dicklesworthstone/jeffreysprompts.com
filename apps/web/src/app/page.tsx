"use client";

import { Suspense, useMemo, useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { prompts, categories, tags } from "@jeffreysprompts/core/prompts/registry";
import { searchPrompts } from "@jeffreysprompts/core/search/engine";
import { Hero } from "@/components/Hero";
import { PromptGrid } from "@/components/PromptGrid";
import { CategoryFilter } from "@/components/CategoryFilter";
import { TagFilter } from "@/components/TagFilter";
import { PromptDetailModal } from "@/components/PromptDetailModal";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useFilterState } from "@/hooks/useFilterState";
import type { Prompt, PromptCategory } from "@jeffreysprompts/core/prompts/types";

function PromptGridFallback({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
      <div className="flex items-center justify-center gap-2 text-destructive mb-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">Something went wrong loading prompts.</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Try refreshing the page to reload the prompt list.
      </p>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
  );
}

function HomeContent() {
  const { filters, setQuery, setCategory, setTags, clearFilters, hasActiveFilters } =
    useFilterState();

  // Modal state for viewing prompt details
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<PromptCategory, number> = {} as Record<PromptCategory, number>;
    for (const prompt of prompts) {
      counts[prompt.category] = (counts[prompt.category] ?? 0) + 1;
    }
    return counts;
  }, []);

  // Compute tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const prompt of prompts) {
      for (const tag of prompt.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return counts;
  }, []);

  // Filter prompts based on search, category, and tags
  const filteredPrompts = useMemo(() => {
    let results: Prompt[];

    if (filters.query.trim()) {
      const searchResults = searchPrompts(filters.query, {
        category: filters.category ?? undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        limit: 50,
      });
      results = searchResults.map((r) => r.prompt);
    } else {
      results = [...prompts];

      if (filters.category) {
        results = results.filter((p) => p.category === filters.category);
      }

      if (filters.tags.length > 0) {
        results = results.filter((p) =>
          filters.tags.some((tag) => p.tags.includes(tag))
        );
      }
    }

    return results;
  }, [filters]);

  const handlePromptClick = useCallback((prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    // Delay clearing selected prompt for exit animation
    setTimeout(() => setSelectedPrompt(null), 200);
  }, []);

  const handlePromptCopy = useCallback((prompt: Prompt) => {
    // TODO: Show toast notification
    console.log("Copied prompt:", prompt.id);
  }, []);

  const handleRefresh = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Hero Section */}
      <Hero
        promptCount={prompts.length}
        categoryCount={categories.length}
        categories={categories}
        onSearch={setQuery}
        onCategorySelect={setCategory}
        selectedCategory={filters.category}
      />

      {/* Main Content */}
      <main className="container-wide px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Category Filter */}
            <CategoryFilter
              categories={categories}
              selected={filters.category}
              onChange={setCategory}
              counts={categoryCounts}
            />

            {/* Clear all filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Tag Filter */}
          <TagFilter
            tags={tags}
            selected={filters.tags}
            onChange={setTags}
            counts={tagCounts}
            maxVisible={12}
          />
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {filters.category ? (
                <span className="capitalize">{filters.category}</span>
              ) : filters.query ? (
                "Search Results"
              ) : (
                "All Prompts"
              )}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? "s" : ""}
              {filters.query && ` for "${filters.query}"`}
              {filters.tags.length > 0 && ` with tags: ${filters.tags.join(", ")}`}
            </p>
          </div>
        </div>

        {/* Prompt Grid */}
        <ErrorBoundary fallback={<PromptGridFallback onRefresh={handleRefresh} />}>
          <PromptGrid
            prompts={filteredPrompts}
            onPromptClick={handlePromptClick}
            onPromptCopy={handlePromptCopy}
          />
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="container-wide px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                JeffreysPrompts.com
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Curated prompts for agentic coding
              </p>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/Dicklesworthstone/jeffreysprompts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://x.com/doodlestein"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Twitter
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t dark:border-zinc-800 text-center">
            <p className="text-sm text-zinc-400">
              Install via CLI:{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded font-mono text-xs">
                curl -fsSL jeffreysprompts.com/install.sh | bash
              </code>
            </p>
          </div>
        </div>
      </footer>

      {/* Prompt Detail Modal */}
      <PromptDetailModal
        prompt={selectedPrompt}
        open={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />}>
      <HomeContent />
    </Suspense>
  );
}
