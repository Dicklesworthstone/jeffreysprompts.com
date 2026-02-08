"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * HeroBackground - A truly next-level, GPU-accelerated animated background.
 *
 * Design features:
 * - Layered mesh gradients with slow, organic movement
 * - Parallax effect based on scroll position
 * - Grainy texture overlay for premium depth
 * - Respects reduced motion settings
 * - Optimized for zero layout shift
 */
export function HeroBackground() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [mounted, setMounted] = useState(false);

  // Parallax transforms
  const y1 = useTransform(scrollY, [0, 500], [0, -50]);
  const y2 = useTransform(scrollY, [0, 500], [0, 50]);
  const rotate1 = useTransform(scrollY, [0, 1000], [0, 45]);
  const rotate2 = useTransform(scrollY, [0, 1000], [0, -45]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      {/* Base background */}
      <div className="absolute inset-0 bg-neutral-50 dark:bg-neutral-950 transition-colors duration-500" />

      {/* Animated Mesh Blobs */}
      {!prefersReducedMotion && (
        <>
          {/* Cyan Blob */}
          <motion.div
            style={{ y: y1, rotate: rotate1 }}
            animate={{
              x: [0, 50, -30, 0],
              y: [0, -40, 60, 0],
              scale: [1, 1.1, 0.9, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-[10%] -left-[10%] w-[50%] h-[60%] rounded-full bg-cyan-400/20 dark:bg-cyan-500/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen"
          />

          {/* Amber Blob */}
          <motion.div
            style={{ y: y2, rotate: rotate2 }}
            animate={{
              x: [0, -60, 40, 0],
              y: [0, 50, -40, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute top-[20%] -right-[10%] w-[45%] h-[55%] rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
          />

          {/* Purple Blob */}
          <motion.div
            animate={{
              x: [0, 40, -50, 0],
              y: [0, 60, -30, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-purple-400/10 dark:bg-purple-500/10 blur-[140px] mix-blend-multiply dark:mix-blend-screen"
          />
        </>
      )}

      {/* Static gradient for consistency if motion is reduced or disabled */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-neutral-950/50 dark:to-neutral-950" />

      {/* Grainy texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="hero-noise-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-noise-filter)" />
        </svg>
      </div>

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.1] dark:opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "40px 40px",
          color: "rgba(0,0,0,0.1)",
        }}
      />
      <div className="dark:block hidden absolute inset-0"
           style={{
             backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
             backgroundSize: "40px 40px",
           }}
      />
    </div>
  );
}

export default HeroBackground;
