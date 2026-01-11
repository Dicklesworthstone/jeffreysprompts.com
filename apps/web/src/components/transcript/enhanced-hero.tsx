"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Clock,
  Sparkles,
  Terminal,
  Play,
  ChevronDown,
  MessageSquare,
  Code2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

interface EnhancedHeroProps {
  duration: string;
  messageCount: number;
  linesWritten: number;
  toolCalls: number;
}

// Floating orb component
function FloatingOrb({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 1, ease: "easeOut" }}
      className={cn("absolute rounded-full blur-3xl", className)}
    >
      <motion.div
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
        className="w-full h-full rounded-full"
      />
    </motion.div>
  );
}

// Animated grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-50 via-white to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                           linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--tw-gradient-from)_100%)] from-white dark:from-zinc-950" />
    </div>
  );
}

// Mini stat badge
function StatBadge({
  icon: Icon,
  value,
  label,
  delay,
  inView,
}: {
  icon: typeof Clock;
  value: number;
  label: string;
  delay: number;
  inView: boolean;
}) {
  const count = useCountUp({
    end: value,
    duration: 2500,
    delay: delay * 1000,
    enabled: inView,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-white/60 dark:bg-zinc-800/60",
        "backdrop-blur-md",
        "border border-zinc-200/50 dark:border-zinc-700/50",
        "shadow-sm"
      )}
    >
      <Icon className="w-4 h-4 text-violet-500" />
      <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
        {count.toLocaleString()}
      </span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
    </motion.div>
  );
}

export function EnhancedHero({
  duration,
  messageCount,
  linesWritten,
  toolCalls,
}: EnhancedHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setInView(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden"
    >
      <GridBackground />

      {/* Floating orbs */}
      <FloatingOrb
        className="w-[600px] h-[600px] -top-40 -left-40 bg-violet-400/20 dark:bg-violet-600/10"
        delay={0}
      />
      <FloatingOrb
        className="w-[500px] h-[500px] top-20 -right-40 bg-blue-400/20 dark:bg-blue-600/10"
        delay={0.3}
      />
      <FloatingOrb
        className="w-[400px] h-[400px] -bottom-20 left-1/4 bg-pink-400/15 dark:bg-pink-600/10"
        delay={0.6}
      />

      {/* Main content */}
      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </motion.div>
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            Complete Development Session
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
        >
          <span className="text-zinc-900 dark:text-zinc-100">Built in a </span>
          <span className="relative">
            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 dark:from-violet-400 dark:via-purple-400 dark:to-blue-400">
              Single Day
            </span>
            {/* Underline accent */}
            <motion.span
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="absolute -bottom-1 left-0 right-0 h-3 bg-violet-200/60 dark:bg-violet-800/30 -z-0 origin-left"
            />
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="text-lg sm:text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          The complete, unedited Claude Code session that designed, planned, and
          shipped this entire platform—from first prompt to production deploy.
        </motion.p>

        {/* Duration badge - large */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl shadow-zinc-900/10 dark:shadow-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50 mb-10"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {duration}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              of live coding
            </div>
          </div>
        </motion.div>

        {/* Mini stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-12"
        >
          <StatBadge
            icon={MessageSquare}
            value={messageCount}
            label="messages"
            delay={0.8}
            inView={inView}
          />
          <StatBadge
            icon={Zap}
            value={toolCalls}
            label="tool calls"
            delay={0.9}
            inView={inView}
          />
          <StatBadge
            icon={Code2}
            value={linesWritten}
            label="lines"
            delay={1.0}
            inView={inView}
          />
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => {
              document.getElementById("timeline")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className={cn(
              "group flex items-center gap-2 px-6 py-3 rounded-xl",
              "bg-zinc-900 dark:bg-white",
              "text-white dark:text-zinc-900",
              "font-medium",
              "shadow-lg shadow-zinc-900/20 dark:shadow-white/10",
              "hover:shadow-xl hover:scale-[1.02]",
              "transition-all duration-200"
            )}
          >
            <Play className="w-4 h-4" />
            <span>Explore Timeline</span>
          </button>
          <button
            onClick={() => {
              document.getElementById("stats")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl",
              "bg-white/60 dark:bg-zinc-800/60",
              "backdrop-blur-md",
              "border border-zinc-200 dark:border-zinc-700",
              "text-zinc-700 dark:text-zinc-300",
              "font-medium",
              "hover:bg-white dark:hover:bg-zinc-800",
              "hover:shadow-md",
              "transition-all duration-200"
            )}
          >
            <Terminal className="w-4 h-4" />
            <span>View Stats</span>
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-6 h-6 text-zinc-400" />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
