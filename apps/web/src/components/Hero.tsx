"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Sparkles, Terminal, Download, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CharacterReveal } from "@/components/CharacterReveal";
import { AnimatedCounter, AnimatedText } from "@/components/AnimatedCounter";
import { MagneticButton } from "@/components/MagneticButton";
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
  const heroRef = useRef<HTMLElement>(null);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  // Mouse position for gradient effect (desktop only)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animation for mouse tracking
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Transform mouse position to gradient position (as percentage)
  const gradientX = useTransform(smoothMouseX, (v) => `${v}%`);
  const gradientY = useTransform(smoothMouseY, (v) => `${v}%`);

  // Scroll-based parallax for background orbs
  const { scrollY } = useScroll();
  const parallaxY1 = useTransform(scrollY, [0, 500], [0, -80]);
  const parallaxY2 = useTransform(scrollY, [0, 500], [0, -120]);
  const parallaxY3 = useTransform(scrollY, [0, 500], [0, -60]);
  const parallaxScale = useTransform(scrollY, [0, 300], [1, 0.95]);
  const parallaxOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  // Handle mouse move for gradient tracking
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!heroRef.current) return;

      const rect = heroRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY]
  );

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
    <section
      ref={heroRef}
      className="relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background gradient and orbs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950" />

        {/* Mouse-following gradient spotlight (desktop only) */}
        <motion.div
          className="absolute hidden md:block w-[800px] h-[800px] rounded-full bg-gradient-radial from-indigo-400/15 via-purple-400/10 to-transparent blur-3xl pointer-events-none"
          style={{
            left: gradientX,
            top: gradientY,
            x: "-50%",
            y: "-50%",
          }}
        />

        {/* Animated orbs with enhanced organic motion and parallax */}
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400/30 to-purple-400/20 blur-3xl"
          style={{ y: parallaxY1 }}
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-gradient-to-tl from-blue-400/25 to-cyan-400/15 blur-3xl"
          style={{ y: parallaxY2 }}
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-violet-400/10 to-transparent blur-2xl"
          style={{ y: parallaxY3, scale: parallaxScale }}
          animate={{
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="container-wide px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge - animated entrance */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-indigo-100/80 dark:bg-indigo-900/30 border border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </motion.div>
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Curated prompts for agentic coding
            </span>
          </motion.div>

          {/* Main headline - character-by-character reveal */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6">
            <CharacterReveal
              text="Jeffrey's Prompts"
              delay={0.2}
              stagger={0.025}
              preset="cascade"
              gradient
            />
          </h1>

          {/* Tagline - staggered fade-in */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            A curated collection of battle-tested prompts for Claude, GPT, and other AI coding assistants.
            Copy, customize, and supercharge your development workflow.
          </motion.p>

          {/* Stats - animated counters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            className="flex items-center justify-center gap-6 sm:gap-8 mb-8"
          >
            <div className="text-center">
              <AnimatedCounter
                value={promptCount}
                delay={0.8}
                duration={1.2}
                className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white"
              />
              <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Prompts</div>
            </div>
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.3, delay: 0.9 }}
              className="w-px h-10 sm:h-12 bg-zinc-200 dark:bg-zinc-700 origin-top"
            />
            <div className="text-center">
              <AnimatedCounter
                value={categoryCount}
                delay={1.0}
                duration={1.0}
                className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white"
              />
              <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Categories</div>
            </div>
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.3, delay: 1.1 }}
              className="w-px h-10 sm:h-12 bg-zinc-200 dark:bg-zinc-700 origin-top"
            />
            <div className="text-center">
              <AnimatedText
                text="Free"
                delay={1.2}
                className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white"
              />
              <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Forever</div>
            </div>
          </motion.div>

          {/* CTA Buttons - staggered entrance with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          >
            {/* Primary CTA with magnetic effect (desktop) */}
            <div className="hidden sm:block">
              <MagneticButton
                variant="primary"
                glowColor="rgb(99, 102, 241)"
                strength={0.2}
                className="gap-2 px-6 py-3"
              >
                <Download className="w-4 h-4" />
                Install CLI
              </MagneticButton>
            </div>
            {/* Mobile primary CTA (no magnetic - touch devices) */}
            <motion.div
              className="sm:hidden w-full"
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button size="lg" className="gap-2 px-6 min-h-[48px] w-full touch-manipulation">
                <Download className="w-4 h-4" />
                Install CLI
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button size="lg" variant="outline" className="gap-2 px-4 sm:px-6 min-h-[48px] w-full sm:w-auto touch-manipulation">
                <Terminal className="w-4 h-4 shrink-0" />
                <code className="text-xs font-mono truncate">
                  curl jeffreysprompts.com/install.sh | bash
                </code>
              </Button>
            </motion.div>
          </motion.div>

          {/* Search bar - animated entrance */}
          <motion.form
            onSubmit={handleSearchSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1, ease: "easeOut" }}
            className="max-w-xl mx-auto mb-8 px-2 sm:px-0"
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

          {/* Category filter pills - staggered entrance */}
          <motion.div
            role="group"
            aria-label="Filter by category"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 1.3,
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

      {/* Scroll indicator - enhanced animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-400"
      >
        <span className="text-xs">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight className="w-4 h-4 rotate-90" />
        </motion.div>
      </motion.div>
    </section>
  );
}

export default Hero;
