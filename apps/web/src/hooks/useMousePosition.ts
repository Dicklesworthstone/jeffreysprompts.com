"use client";

import { useCallback, useRef } from "react";
import { useMotionValue } from "framer-motion";

/**
 * useMousePosition - Hook to track mouse position relative to an element.
 *
 * Uses refs internally to avoid re-renders on every mousemove.
 * Exposes motion values for reactive CSS (useMotionTemplate) and
 * a ref-based getter for imperative reads.
 */
export function useMousePosition() {
  const positionRef = useRef({ x: 0, y: 0, percentageX: 50, percentageY: 50 });

  const motionPercentageX = useMotionValue(50);
  const motionPercentageY = useMotionValue(50);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentageX = (x / rect.width) * 100;
    const percentageY = (y / rect.height) * 100;

    positionRef.current = { x, y, percentageX, percentageY };
    motionPercentageX.set(percentageX);
    motionPercentageY.set(percentageY);
  }, [motionPercentageX, motionPercentageY]);

  const resetMousePosition = useCallback(() => {
    positionRef.current = { x: 0, y: 0, percentageX: 50, percentageY: 50 };
    motionPercentageX.set(50);
    motionPercentageY.set(50);
  }, [motionPercentageX, motionPercentageY]);

  return {
    positionRef,
    motionPercentageX,
    motionPercentageY,
    handleMouseMove,
    resetMousePosition,
  };
}
