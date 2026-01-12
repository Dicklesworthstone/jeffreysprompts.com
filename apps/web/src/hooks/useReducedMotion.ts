"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook to detect user's reduced motion preference.
 * Returns true if user prefers reduced motion (WCAG 2.3.3).
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * return (
 *   <motion.div
 *     animate={{ opacity: 1 }}
 *     transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
 *   />
 * );
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const handleChange = useCallback((event: MediaQueryListEvent) => {
    setPrefersReducedMotion(event.matches);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [handleChange]);

  return prefersReducedMotion;
}
