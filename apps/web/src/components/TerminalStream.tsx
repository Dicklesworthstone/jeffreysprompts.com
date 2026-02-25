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
 * - Performance optimized with requestAnimationFrame for silky smooth animation
 */
export function TerminalStream({ text, className }: TerminalStreamProps) {
  const [animatedText, setAnimatedText] = useState("");
  const [prevText, setPrevText] = useState(text);
  const prefersReducedMotion = useReducedMotion();

  if (text !== prevText) {
    setAnimatedText("");
    setPrevText(text);
  }

  useEffect(() => {
    if (prefersReducedMotion) return;

    let currentIndex = 0;
    let lastTime = 0;
    const charsPerSecond = 150; // High-speed agent feel
    let frameId: number;

    const stream = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;

      if (elapsed > 1000 / (charsPerSecond / 3)) {
        currentIndex += 3;
        setAnimatedText(text.slice(0, currentIndex));
        lastTime = timestamp;
      }

      if (currentIndex < text.length) {
        frameId = requestAnimationFrame(stream);
      }
    };

    frameId = requestAnimationFrame(stream);

    return () => cancelAnimationFrame(frameId);
  }, [text, prefersReducedMotion]);

  const displayedText = prefersReducedMotion ? text : animatedText;

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
