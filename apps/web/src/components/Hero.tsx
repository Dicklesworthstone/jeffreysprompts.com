"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CharacterReveal } from "@/components/CharacterReveal";
import { AnimatedCounter, AnimatedText } from "@/components/AnimatedCounter";
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
  // Initialize to "Ctrl" to match server-rendered HTML, update on mount
  const [modifierKey, setModifierKey] = useState("Ctrl");
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  // Detect platform and update modifier key on client-side only
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.platform?.includes("Mac")) {
      setModifierKey("⌘");
    }
  }, []);

  // Debounce search updates while typing
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      // SpotlightSearch handles this globally via document listener
    }
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950" />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="container-wide px-4 sm:px-6 lg:px-8 pt-8 pb-6 sm:pt-12 sm:pb-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge - fast entrance */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-indigo-100/80 dark:bg-indigo-900/30 border border-indigo-200/50 dark:border-indigo-800/50"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Free prompts for AI coding agents
            </span>
          </motion.div>

          {/* Main headline - faster character reveal */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
            <CharacterReveal
              text="Jeffrey's Prompts"
              delay={0.05}
              stagger={0.015}
              preset="cascade"
              gradient
            />
          </h1>

          {/* Tagline - fast fade-in */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
            className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-5 max-w-xl mx-auto"
          >
            Battle-tested prompts for Claude, GPT, and other AI coding assistants.
          </motion.p>

          {/* Stats - fast animated counters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: "easeOut" }}
            className="flex items-center justify-center gap-6 sm:gap-8 mb-6"
          >
            <div className="text-center">
              <AnimatedCounter
                value={promptCount}
                delay={0.3}
                duration={0.6}
                className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white"
              />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Prompts</div>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
            <div className="text-center">
              <AnimatedCounter
                value={categoryCount}
                delay={0.35}
                duration={0.5}
                className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white"
              />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Categories</div>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
            <div className="text-center">
              <AnimatedText
                text="Free"
                delay={0.4}
                className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white"
              />
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Forever</div>
            </div>
          </motion.div>

          {/* Search bar - the focal point */}
          <motion.form
            onSubmit={handleSearchSubmit}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.35, ease: "easeOut" }}
            className="max-w-xl mx-auto mb-6 px-2 sm:px-0"
          >
            <motion.div
              className="relative group"
              whileFocus={{ scale: 1.01 }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search prompts..."
                className="w-full h-14 sm:h-12 pl-12 pr-4 sm:pr-24 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all touch-manipulation"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-zinc-400">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 font-mono">
                  {modifierKey}
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 font-mono">K</kbd>
              </div>
            </motion.div>
          </motion.form>

          {/* Category filter pills - fast staggered entrance */}
          <motion.div
            role="group"
            aria-label="Filter by category"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.03,
                  delayChildren: 0.4,
                },
              },
            }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <motion.button
              type="button"
              aria-pressed={selectedCategory === null}
              variants={{
                hidden: { opacity: 0, scale: 0.8, y: 10 },
                visible: { opacity: 1, scale: 1, y: 0 },
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "inline-flex items-center rounded-full px-4 py-2 min-h-[44px] text-sm font-medium",
                "transition-colors touch-manipulation",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                selectedCategory === null
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              )}
              onClick={() => onCategorySelect?.(null)}
            >
              All
            </motion.button>
            {categories.map((category) => (
              <motion.button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                variants={{
                  hidden: { opacity: 0, scale: 0.8, y: 10 },
                  visible: { opacity: 1, scale: 1, y: 0 },
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "inline-flex items-center rounded-full px-4 py-2 min-h-[44px] text-sm font-medium capitalize",
                  "transition-colors touch-manipulation",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  selectedCategory === category
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                )}
                onClick={() => onCategorySelect?.(category)}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
