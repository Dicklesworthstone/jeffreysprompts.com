"use client";

import { Suspense, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { prompts, categories, tags } from "@jeffreysprompts/core/prompts/registry";
import { searchPrompts } from "@jeffreysprompts/core/search/engine";
import { Hero } from "@/components/Hero";
import { PromptGrid } from "@/components/PromptGrid";
import { CategoryFilter } from "@/components/CategoryFilter";
import { TagFilter } from "@/components/TagFilter";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { PromptDetailModal } from "@/components/PromptDetailModal";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useFilterState } from "@/hooks/useFilterState";
import { FeaturedPromptsSection } from "@/components/landing";
import { RecentlyViewedSidebar } from "@/components/history/RecentlyViewedSidebar";
import { AnimatedSection } from "@/components/AnimatedSection";
import { trackEvent } from "@/lib/analytics";
import { trackHistoryView } from "@/lib/history/client";
import { useAnnounceCount } from "@/hooks/useAnnounce";
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
  const modalCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFiltersRef = useRef<{
    query: string;
    category: PromptCategory | null;
    tags: string[];
  } | null>(null);

  // Screen reader announcements for filter results
  const announceResults = useAnnounceCount();

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

  // Count active filters for badge
  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category) count++;
    count += filters.tags.length;
    return count;
  }, [filters.query, filters.category, filters.tags]);

  // Get featured prompts (featured first, then by creation date)
  const featuredPrompts = useMemo(() => {
    const featured = prompts.filter((p) => p.featured);
    if (featured.length >= 6) return featured.slice(0, 6);
    // Fill with non-featured prompts if not enough featured
    const nonFeatured = prompts.filter((p) => !p.featured);
    return [...featured, ...nonFeatured].slice(0, 6);
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
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
    }
    modalCloseTimerRef.current = setTimeout(() => {
      setSelectedPrompt(null);
      modalCloseTimerRef.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (modalCloseTimerRef.current) {
        clearTimeout(modalCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!previousFiltersRef.current) {
      previousFiltersRef.current = filters;
      return;
    }

    const previous = previousFiltersRef.current;
    const categoryChanged = previous.category !== filters.category;
    const tagsChanged = previous.tags.join(",") !== filters.tags.join(",");
    const queryChanged = previous.query !== filters.query;

    if (categoryChanged || tagsChanged) {
      trackEvent("filter_apply", {
        category: filters.category ?? "all",
        tags: filters.tags.join(","),
        source: "browse",
      });
    }

    if (queryChanged && filters.query.trim()) {
      trackEvent("search", { query: filters.query.trim(), source: "browse" });
      trackHistoryView({ resourceType: "search", searchQuery: filters.query.trim(), source: "browse" });
    }

    previousFiltersRef.current = filters;
  }, [filters]);

  // Announce filtered results count to screen readers
  useEffect(() => {
    // Only announce when filters are active (not on initial load)
    if (hasActiveFilters) {
      announceResults(filteredPrompts.length, "prompt", "prompts");
    }
  }, [filteredPrompts.length, hasActiveFilters, announceResults]);

  const handleRefresh = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Hero Section */}
      <Hero
        promptCount={prompts.length}
        categoryCount={categories.length}
        categories={categories}
        onSearch={setQuery}
        onCategorySelect={setCategory}
        selectedCategory={filters.category}
      />

      {/* Featured Prompts Section */}
      <FeaturedPromptsSection
        prompts={featuredPrompts}
        totalCount={prompts.length}
        onPromptClick={handlePromptClick}
      />

      {/* Visual separator between Featured and Browse */}
      <div className="h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />

      {/* Browse All Prompts Section */}
      <main id="prompts-section" className="container-wide px-4 sm:px-6 lg:px-8 py-12">
        {/* Section Header */}
        <AnimatedSection variant="fadeUp" delay={0.1} className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Browse All Prompts
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Use filters to find exactly what you need
          </p>
        </AnimatedSection>

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
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              aria-label={hasActiveFilters ? `Clear all ${filterCount} active filters` : "No active filters to clear"}
              className={
                hasActiveFilters
                  ? "h-8 px-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                  : "h-8 px-3 text-sm font-medium text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-50"
              }
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Clear filters
              {hasActiveFilters && (
                <span className="ml-1.5 text-xs bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full">
                  {filterCount}
                </span>
              )}
            </Button>
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

        {/* Active Filter Chips */}
        <ActiveFilterChips
          query={filters.query}
          category={filters.category}
          tags={filters.tags}
          onRemoveQuery={() => setQuery("")}
          onRemoveCategory={() => setCategory(null)}
          onRemoveTag={(tag) => setTags(filters.tags.filter((t) => t !== tag))}
          onClearAll={clearFilters}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {/* Results count - contextual based on active filters */}
            <div className="flex items-center justify-between mb-8">
              <div>
                {hasActiveFilters ? (
                  <>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {filters.category ? (
                        <span className="capitalize">{filters.category}</span>
                      ) : filters.query ? (
                        "Search Results"
                      ) : (
                        "Filtered Results"
                      )}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? "s" : ""}
                      {filters.query && ` matching "${filters.query}"`}
                      {filters.tags.length > 0 && ` with tags: ${filters.tags.join(", ")}`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Showing all {filteredPrompts.length} prompts
                  </p>
                )}
              </div>
            </div>

            {/* Prompt Grid */}
            <ErrorBoundary fallback={<PromptGridFallback onRefresh={handleRefresh} />}>
              <PromptGrid
                prompts={filteredPrompts}
                onPromptClick={handlePromptClick}
              />
            </ErrorBoundary>
          </div>

          <div className="lg:pt-12">
            <RecentlyViewedSidebar />
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="container-wide px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Brand & Links */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-white">Jeffrey&apos;s Prompts</span>
              <a
                href="https://github.com/Dicklesworthstone/jeffreysprompts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a href="/help" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                Help
              </a>
              <a href="/contribute" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                Contribute
              </a>
            </div>

            {/* Pro Badge (subtle) */}
            <a
              href="https://pro.jeffreysprompts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Try Pro
            </a>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-500 dark:text-neutral-500">
            Free and open-source. Made by{" "}
            <a
              href="https://twitter.com/doodlestein"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              @doodlestein
            </a>
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
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950" />}>
      <HomeContent />
    </Suspense>
  );
}
