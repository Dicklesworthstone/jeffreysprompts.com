"use client";

import { useRef, useMemo } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextRevealProps {
  /** Text to animate (will split by words) */
  text: string;
  /** Additional className for the container */
  className?: string;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Duration per word (seconds) */
  wordDuration?: number;
  /** Stagger delay between words (seconds) */
  stagger?: number;
  /** Animation direction */
  direction?: "up" | "down" | "left" | "right";
  /** Whether to trigger animation only once */
  once?: boolean;
  /** Threshold for viewport intersection */
  threshold?: number;
  /** Preserve gradient styling on text */
  gradient?: boolean;
}

const directionOffsets = {
  up: { y: 20, x: 0 },
  down: { y: -20, x: 0 },
  left: { x: 20, y: 0 },
  right: { x: -20, y: 0 },
};

/**
 * TextReveal - Animated text component with word-by-word stagger effect.
 *
 * Features:
 * - Viewport-triggered animation
 * - Configurable direction and timing
 * - Respects reduced motion preferences
 * - Supports gradient text styling
 *
 * Note: This component renders as a div. For semantic HTML, wrap it in the
 * appropriate element (h1, h2, p, etc.) as shown in the example.
 *
 * @example
 * ```tsx
 * <h1 className="text-4xl font-bold">
 *   <TextReveal text="Welcome to Jeffrey's Prompts" gradient />
 * </h1>
 * ```
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  wordDuration = 0.5,
  stagger = 0.08,
  direction = "up",
  once = true,
  threshold = 0.3,
  gradient = false,
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const prefersReducedMotion = useReducedMotion();

  const words = useMemo(() => text.split(" "), [text]);
  const offset = directionOffsets[direction];

  // Skip animation entirely when user prefers reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          "flex flex-wrap justify-center",
          gradient && "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text",
          className
        )}
        aria-label={text}
      >
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={cn(
              "inline-block mr-[0.25em]",
              gradient && "text-transparent"
            )}
            aria-hidden="true"
          >
            {word}
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

  const wordVariants: Variants = {
    hidden: {
      opacity: 0,
      ...offset,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: wordDuration,
        ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={cn(
        "flex flex-wrap justify-center",
        gradient && "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text",
        className
      )}
      aria-label={text}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={wordVariants}
          className={cn(
            "inline-block mr-[0.25em]",
            gradient && "text-transparent"
          )}
          // Don't announce individual words to screen readers
          aria-hidden="true"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}

export default TextReveal;
