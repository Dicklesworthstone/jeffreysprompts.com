"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * MouseSpotlight - Desktop-only hyper-optimization.
 * Creates an atmospheric spotlight following the cursor across the viewport.
 * 
 * Features:
 * - Extremely subtle, adds depth without distraction
 * - GPU-accelerated via transform/opacity
 * - Only active on desktop (hover capable devices)
 */
export function MouseSpotlight() {
  const [isDesktop, setIsDesktop] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth the movement with spring physics
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    // Detect hover capability (desktop)
    const mediaQuery = window.matchMedia("(hover: hover)");
    setIsDesktop(mediaQuery.matches);

    if (!mediaQuery.matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  if (!isDesktop) return null;

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-30 opacity-40 dark:opacity-60 overflow-hidden"
      style={{
        background: `radial-gradient(600px circle at ${springX}px ${springY}px, rgba(99, 102, 241, 0.03), transparent 80%)`,
      }}
    />
  );
}

export default MouseSpotlight;