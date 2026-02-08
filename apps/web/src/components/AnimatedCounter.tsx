"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
  /** Final value to count to */
  value: number;
  /** Duration of animation in seconds (default: 2) */
  duration?: number;
  /** Suffix to append (e.g., "+", "%") */
  suffix?: string;
  /** Prefix to prepend (e.g., "$") */
  prefix?: string;
  /** Class name for the container */
  className?: string;
  /** Stagger delay for multiple counters (default: 0) */
  delay?: number;
}

const numberFormatter = new Intl.NumberFormat("en-US");

/**
 * AnimatedCounter - Smooth counting animation for statistics.
 *
 * Uses spring physics for a more natural feel and is triggered by scroll visibility.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className,
  delay = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(0);

  // Using a spring for a more organic feel than a linear tween
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(value);
        hasAnimated.current = true;
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, motionValue, delay]);

  useEffect(() => {
    if (isInView && hasAnimated.current) {
      motionValue.set(value);
    }
  }, [value, isInView, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = numberFormatter.format(Math.floor(latest));
      }
    });
    return () => unsubscribe();
  }, [springValue]);

  return (
    <span className={className}>
      {prefix}
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
}

export default AnimatedCounter;