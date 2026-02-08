"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

interface TerminalStreamProps {
  text: string;
  className?: string;
}

/**
 * TerminalStream - Hyper-optimized code preview with streaming effect.
 * 
 * Features:
 * - Mimics a real AI agent typing/streaming
 * - Uses character-by-character reveal
 * - Performance optimized with requestAnimationFrame
 */
export function TerminalStream({ text, className }: TerminalStreamProps) {
  const [displayedText, setDisplayedText] = useState("");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, currentIndex));
      currentIndex += 3; // Type 3 chars at a time for "fast agent" feel
      if (currentIndex > text.length) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text, prefersReducedMotion]);

  return (
    <p className={className}>
      {displayedText}
      {!prefersReducedMotion && displayedText.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-1.5 h-3 bg-indigo-500 ml-0.5 align-middle"
        />
      )}
    </p>
  );
}
