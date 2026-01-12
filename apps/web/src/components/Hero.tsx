"use client";

/**
 * Hero - Clean, minimal hero section (Stripe/Linear inspired)
 *
 * Design principles:
 * - Single fade-in animation for entire content block
 * - Static numbers (no animated counters)
 * - Clean typography hierarchy
 * - Horizontal scroll for category pills on mobile
 */

import { useState, useCallback, useRef } from "react";
import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

interface HeroProps {
  promptCount: number;
  categoryCount: number;
  categories: PromptCategory[];
  onSearch?: (query: string) => void;
  onCategorySelect?: (category: PromptCategory | null) => void;
  selectedCategory?: PromptCategory | null;
}

export function Hero({
  promptCount,
  categoryCount,
  categories,
  onSearch,
  onCategorySelect,
  selectedCategory,
}: HeroProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modifierKey] = useState(() => {
    if (typeof navigator !== "undefined" && navigator.platform?.includes("Mac")) {
      return "⌘";
    }
    return "Ctrl";
  });
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!onSearch) return;
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery, onSearch]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
      onSearch?.(searchQuery);
    },
    [searchQuery, onSearch]
  );

  return (
    <section className="relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900" />
      </div>

      <div className="container-wide px-4 sm:px-6 lg:px-8 pt-12 pb-8 sm:pt-16 sm:pb-10">
        {/* Single fade-in for entire content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Free prompts for AI coding agents
            </span>
          </div>

          {/* Main headline - clean, static */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white mb-4">
            Jeffrey&apos;s Prompts
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-xl mx-auto">
            Battle-tested prompts for Claude, GPT, and other AI coding assistants.
          </p>

          {/* Stats - static numbers, clean layout */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mb-8">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                {promptCount}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Prompts</div>
            </div>
            <div className="w-px h-10 bg-neutral-200 dark:bg-neutral-700" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                {categoryCount}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Categories</div>
            </div>
            <div className="w-px h-10 bg-neutral-200 dark:bg-neutral-700" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                Free
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Forever</div>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                aria-label="Search prompts"
                className={cn(
                  "w-full h-12 pl-12 pr-4 sm:pr-24",
                  "rounded-xl border border-neutral-200 dark:border-neutral-700",
                  "bg-white dark:bg-neutral-800",
                  "text-base text-neutral-900 dark:text-white",
                  "placeholder:text-neutral-400",
                  "focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:ring-offset-2",
                  "transition-shadow"
                )}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-neutral-400">
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono">
                  {modifierKey}
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono">
                  K
                </kbd>
              </div>
            </div>
          </form>

          {/* Category pills - horizontal scroll on mobile */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div
              role="group"
              aria-label="Filter by category"
              className="flex items-center justify-center gap-2 pb-2 min-w-max"
            >
              <button
                type="button"
                aria-pressed={selectedCategory === null}
                className={cn(
                  "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium",
                  "transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
                  selectedCategory === null
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
                onClick={() => onCategorySelect?.(null)}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selectedCategory === category}
                  className={cn(
                    "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium capitalize",
                    "transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
                    selectedCategory === category
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                  onClick={() => onCategorySelect?.(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
