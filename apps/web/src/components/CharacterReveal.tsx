"use client";

import { useRef, useMemo } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface CharacterRevealProps {
  /** Text to animate (character by character) */
  text: string;
  /** Additional className for the container */
  className?: string;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Stagger delay between characters (seconds) */
  stagger?: number;
  /** Animation style preset */
  preset?: "typewriter" | "cascade" | "wave" | "glitch" | "elastic";
  /** Whether to trigger animation only once */
  once?: boolean;
  /** Threshold for viewport intersection */
  threshold?: number;
  /** Preserve gradient styling on text */
  gradient?: boolean;
  /** Custom spring config */
  spring?: { stiffness?: number; damping?: number; mass?: number };
}

const presetConfigs = {
  typewriter: {
    hidden: { opacity: 0, y: 0 },
    visible: { opacity: 1, y: 0 },
    transition: { duration: 0.05 } as const,
  },
  cascade: {
    hidden: { opacity: 0, y: 40, rotateX: -90 },
    visible: { opacity: 1, y: 0, rotateX: 0 },
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
  wave: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  },
  glitch: {
    hidden: { opacity: 0, x: -10, filter: "blur(8px)" },
    visible: { opacity: 1, x: 0, filter: "blur(0px)" },
    transition: { type: "spring" as const, stiffness: 500, damping: 25 },
  },
  elastic: {
    hidden: { opacity: 0, scale: 0, rotate: -180 },
    visible: { opacity: 1, scale: 1, rotate: 0 },
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
} as const;

/**
 * CharacterReveal - Dramatic character-by-character text animation.
 *
 * Features:
 * - Multiple animation presets (typewriter, cascade, wave, glitch, elastic)
 * - Spring physics for natural motion
 * - Viewport-triggered animation
 * - Respects reduced motion preferences
 * - Supports gradient text styling
 *
 * @example
 * ```tsx
 * <h1 className="text-6xl font-bold">
 *   <CharacterReveal
 *     text="Welcome"
 *     preset="cascade"
 *     gradient
 *     stagger={0.03}
 *   />
 * </h1>
 * ```
 */
export function CharacterReveal({
  text,
  className,
  delay = 0,
  stagger = 0.03,
  preset = "cascade",
  once = true,
  threshold = 0.3,
  gradient = false,
  spring,
}: CharacterRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const prefersReducedMotion = useReducedMotion();

  const config = presetConfigs[preset];

  // Split text into words, then characters, preserving spaces
  const words = useMemo(() => {
    return text.split(" ").map((word) => word.split(""));
  }, [text]);

  // Skip animation entirely when user prefers reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          "flex flex-wrap justify-center",
          gradient &&
            "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text",
          className
        )}
        aria-label={text}
      >
        {words.map((word, wordIndex) => (
          <span key={wordIndex} className="inline-flex">
            {word.map((char, charIdx) => (
              <span
                key={`${char}-${charIdx}`}
                className={cn(
                  "inline-block",
                  gradient && "text-transparent"
                )}
                aria-hidden="true"
              >
                {char}
              </span>
            ))}
            {wordIndex < words.length - 1 && (
              <span className="inline-block w-[0.3em]" aria-hidden="true" />
            )}
          </span>
        ))}
      </div>
    );
  }

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const charVariants: Variants = {
    hidden: config.hidden,
    visible: {
      ...config.visible,
      transition: spring
        ? { type: "spring", ...spring }
        : config.transition,
    },
  };

  let charIndex = 0;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={cn(
        "flex flex-wrap justify-center",
        gradient &&
          "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text",
        className
      )}
      style={{ perspective: 1000 }}
      aria-label={text}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-flex">
          {word.map((char) => {
            const currentIndex = charIndex++;
            return (
              <motion.span
                key={`${char}-${currentIndex}`}
                variants={charVariants}
                className={cn(
                  "inline-block",
                  gradient && "text-transparent",
                  // Preserve transform origin for 3D effects
                  preset === "cascade" && "origin-top"
                )}
                style={{
                  transformStyle: "preserve-3d",
                }}
                aria-hidden="true"
              >
                {char}
              </motion.span>
            );
          })}
          {/* Add space between words (except after last word) */}
          {wordIndex < words.length - 1 && (
            <span className="inline-block w-[0.3em]" aria-hidden="true" />
          )}
        </span>
      ))}
    </motion.div>
  );
}

export default CharacterReveal;
