"use client";

/**
 * Hero - Truly next-level, high-performance hero section.
 *
 * Design principles:
 * - GPU-accelerated animated background (HeroBackground)
 * - Dramatic text reveal (CharacterReveal)
 * - Life-like animated statistics (AnimatedCounter)
 * - Highly interactive magnetic elements (MagneticButton)
 * - Staggered entrance animations for visual flow
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Sparkles, LayoutGrid, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";
import { HeroBackground } from "./HeroBackground";
import { CharacterReveal } from "./CharacterReveal";
import { AnimatedCounter } from "./AnimatedCounter";
import { MagneticButton } from "./MagneticButton";

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  const modifierKey =
    typeof navigator === "undefined"
      ? ""
      : navigator.platform?.includes("Mac")
        ? "⌘"
        : "Ctrl";

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
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center overflow-hidden py-16 sm:py-24">
      <HeroBackground />

      <div className="container-wide px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-full sm:max-w-4xl mx-auto">
          {/* Enhanced Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Curated prompts for agentic excellence
            </span>
          </motion.div>

          {/* Main headline - dramatic reveal */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white mb-6 leading-[1.1]">
            <CharacterReveal
              text="Jeffrey's Prompts"
              preset="cascade"
              stagger={0.04}
              className="justify-center"
            />
          </h1>

          {/* Tagline - smooth fade in */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-lg sm:text-2xl text-neutral-600 dark:text-neutral-400 mb-12 max-w-full sm:max-w-2xl mx-auto leading-relaxed"
          >
            Battle-tested patterns for Claude, GPT, and the next generation of AI coding assistants.
          </motion.p>

          {/* Stats - animated numbers with icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 mb-12"
          >
            <div className="flex flex-col items-center gap-1 group">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <AnimatedCounter
                  value={promptCount}
                  className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white"
                  delay={1}
                />
              </div>
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-widest">
                Prompts
              </div>
            </div>

            <div className="hidden sm:block w-px h-12 bg-neutral-200 dark:bg-neutral-800" />

            <div className="flex flex-col items-center gap-1 group">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                <AnimatedCounter
                  value={categoryCount}
                  className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white"
                  delay={1.2}
                />
              </div>
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-widest">
                Categories
              </div>
            </div>

            <div className="hidden sm:block w-px h-12 bg-neutral-200 dark:bg-neutral-800" />

            <div className="flex flex-col items-center gap-1 group">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <div className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white">
                  Free
                </div>
              </div>
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-widest">
                Forever
              </div>
            </div>
          </motion.div>

          {/* Search bar - refined with focus effects */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            onSubmit={handleSearchSubmit}
            className="max-w-full sm:max-w-2xl mx-auto mb-12"
          >
            <div className="relative group">
              <Search className={cn(
                "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300",
                isSearchFocused ? "text-indigo-500" : "text-neutral-400 group-hover:text-neutral-500"
              )} />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find your next favorite prompt..."
                aria-label="Search prompts"
                autoComplete="off"
                className={cn(
                  "w-full h-14 pl-14 pr-4 sm:pr-28",
                  "rounded-2xl border-2 border-neutral-200/50 dark:border-neutral-700/50",
                  "bg-white/60 dark:bg-neutral-800/60 backdrop-blur-xl",
                  "text-lg text-neutral-900 dark:text-white",
                  "placeholder:text-neutral-400",
                  "focus:outline-none focus:border-indigo-500/50 dark:focus:border-indigo-400/50",
                  "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] focus:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.2)]",
                  "transition-all duration-300"
                )}
              />
              <div
                className="absolute right-5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-neutral-400"
                suppressHydrationWarning
              >
                <kbd className="px-2 py-1 rounded bg-neutral-100/80 dark:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-600 font-mono shadow-sm">
                  {modifierKey}
                </kbd>
                <kbd className="px-2 py-1 rounded bg-neutral-100/80 dark:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-600 font-mono shadow-sm">
                  K
                </kbd>
              </div>
            </div>
          </motion.form>

          {/* Category pills - using MagneticButton for premium feel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4"
          >
            <div
              role="group"
              aria-label="Filter by category"
              className="flex items-center justify-center gap-3 flex-nowrap"
            >
              <MagneticButton
                type="button"
                variant={selectedCategory === null ? "primary" : "ghost"}
                strength={0.2}
                glowColor="rgba(99, 102, 241, 0.4)"
                className={cn(
                  "min-h-0 py-2 px-6 rounded-full text-sm",
                  selectedCategory === null
                    ? ""
                    : "bg-neutral-100/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                )}
                onClick={() => onCategorySelect?.(null)}
              >
                All
              </MagneticButton>

              {categories.map((category) => (
                <MagneticButton
                  key={category}
                  type="button"
                  variant={selectedCategory === category ? "primary" : "ghost"}
                  strength={0.15}
                  glowColor="rgba(99, 102, 241, 0.4)"
                  className={cn(
                    "min-h-0 py-2 px-6 rounded-full text-sm capitalize",
                    selectedCategory === category
                      ? ""
                      : "bg-neutral-100/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  )}
                  onClick={() => onCategorySelect?.(category)}
                >
                  {category}
                </MagneticButton>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subtle indicator for more content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-1 h-12 rounded-full bg-gradient-to-b from-indigo-500/50 to-transparent"
        />
      </motion.div>
    </section>
  );
}

export default Hero;
