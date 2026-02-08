"use client";

import { useCallback } from "react";

/**
 * PrecisionHaptic - Mobile hyper-optimization.
 * Provides granular, high-quality tactile feedback for premium "feel".
 */
export function usePrecisionHaptic() {
  const trigger = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    /** Light tap for selections/toggles */
    light: () => trigger(10),
    /** Medium tap for clicks/actions */
    medium: () => trigger(20),
    /** Success notification pattern */
    success: () => trigger([10, 30, 10]),
    /** Error/Failure warning pattern */
    error: () => trigger([50, 50, 50]),
    /** Impactful selection change */
    impact: () => trigger(40),
  };
}
