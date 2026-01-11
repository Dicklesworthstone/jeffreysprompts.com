/**
 * Mock framer-motion for tests
 *
 * Replaces animation components with simple divs that render immediately.
 * This avoids animation timing issues in happy-dom.
 */

import * as React from "react";

// Framer-motion specific props to filter out
const motionProps = [
  "initial", "animate", "exit", "transition", "variants",
  "whileHover", "whileTap", "whileFocus", "whileDrag", "whileInView",
  "drag", "dragConstraints", "dragElastic", "dragMomentum", "dragPropagation",
  "onDrag", "onDragStart", "onDragEnd", "onAnimationStart", "onAnimationComplete",
  "layout", "layoutId", "layoutDependency",
];

// Filter out framer-motion props from HTML elements
function filterMotionProps<T extends Record<string, unknown>>(props: T): Partial<T> {
  const filtered = { ...props };
  for (const prop of motionProps) {
    delete filtered[prop];
  }
  return filtered;
}

// Simple motion div that renders children without animation
export const motion = {
  div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...filterMotionProps(props)}>
        {children}
      </div>
    )
  ),
  span: React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ children, ...props }, ref) => (
      <span ref={ref} {...filterMotionProps(props)}>
        {children}
      </span>
    )
  ),
  button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ children, ...props }, ref) => (
      <button ref={ref} {...filterMotionProps(props)}>
        {children}
      </button>
    )
  ),
};

// AnimatePresence that immediately unmounts exiting children
export function AnimatePresence({
  children,
}: {
  children: React.ReactNode;
  initial?: boolean;
  mode?: string;
}) {
  return <>{children}</>;
}

// No-op hooks
export function useAnimation() {
  return {
    start: () => Promise.resolve(),
    stop: () => {},
    set: () => {},
  };
}

export function useMotionValue(initial: number) {
  return {
    get: () => initial,
    set: () => {},
    onChange: () => () => {},
  };
}

export function useTransform() {
  return useMotionValue(0);
}

export function useSpring() {
  return useMotionValue(0);
}

export function useDragControls() {
  return { start: () => {} };
}

export function useReducedMotion() {
  return false;
}

export function useMotionTemplate(strings: TemplateStringsArray, ...values: unknown[]) {
  // Combine template strings with values
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += String(values[i]) + (strings[i + 1] || "");
  }
  return result;
}

export function useScroll() {
  return {
    scrollY: useMotionValue(0),
    scrollX: useMotionValue(0),
    scrollYProgress: useMotionValue(0),
    scrollXProgress: useMotionValue(0),
  };
}

export const MotionConfig = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const LazyMotion = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const domAnimation = {};
