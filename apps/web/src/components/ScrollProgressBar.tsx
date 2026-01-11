"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollProgressBarProps {
  /** Additional className */
  className?: string;
  /** Color of the progress bar (default: indigo) */
  color?: "indigo" | "purple" | "gradient";
  /** Height of the bar in pixels (default: 3) */
  height?: number;
  /** Whether to show on mobile (default: true) */
  showOnMobile?: boolean;
}

/**
 * ScrollProgressBar - Visual indicator of scroll position.
 *
 * Features:
 * - Smooth spring animation
 * - Fixed to top of viewport
 * - Configurable color and height
 * - GPU-accelerated transforms
 *
 * @example
 * ```tsx
 * // In your layout.tsx
 * <ScrollProgressBar color="gradient" />
 * ```
 */
export function ScrollProgressBar({
  className,
  color = "indigo",
  height = 3,
  showOnMobile = true,
}: ScrollProgressBarProps) {
  const { scrollYProgress } = useScroll();
  const [isVisible, setIsVisible] = useState(false);

  // Smooth spring animation for progress
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Show bar only after scrolling starts
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (value) => {
      setIsVisible(value > 0.01);
    });
    return unsubscribe;
  }, [scrollYProgress]);

  const colorClasses = {
    indigo: "bg-indigo-600 dark:bg-indigo-500",
    purple: "bg-purple-600 dark:bg-purple-500",
    gradient: "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600",
  };

  return (
    <motion.div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 origin-left",
        colorClasses[color],
        !showOnMobile && "hidden md:block",
        className
      )}
      style={{
        scaleX,
        height,
        opacity: isVisible ? 1 : 0,
      }}
      initial={{ opacity: 0 }}
      transition={{ opacity: { duration: 0.2 } }}
      aria-hidden="true"
    />
  );
}

export default ScrollProgressBar;
