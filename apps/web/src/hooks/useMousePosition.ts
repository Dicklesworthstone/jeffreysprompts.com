"use client";

import { useState, useCallback } from "react";

/**
 * useMousePosition - Hook to track mouse position relative to an element.
 * 
 * Returns a set of values and a handler to be attached to onMouseMove.
 * This is more performant than a global window listener when used in lists (e.g. PromptCard).
 */
export function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0, percentageX: 50, percentageY: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const percentageX = (x / rect.width) * 100;
    const percentageY = (y / rect.height) * 100;

    setPosition({ x, y, percentageX, percentageY });
  }, []);

  const resetMousePosition = useCallback(() => {
    setPosition({ x: 0, y: 0, percentageX: 50, percentageY: 50 });
  }, []);

  return { ...position, handleMouseMove, resetMousePosition };
}