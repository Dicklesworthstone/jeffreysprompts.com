"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

interface GridTransitionProps {
  children: ReactNode;
  index: number;
}

/**
 * GridTransition - Hyper-optimized entrance for desktop cards.
 * 
 * Features:
 * - Particle-like staggered entrance (scale + rotate + fade)
 * - GPU-accelerated transforms
 * - Layout-aware movement
 */
export function GridTransition({ children, index }: GridTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return <>{children}</>;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, rotate: index % 2 === 0 ? -2 : 2, y: 30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 25,
        delay: Math.min(index * 0.04, 0.3),
      }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
