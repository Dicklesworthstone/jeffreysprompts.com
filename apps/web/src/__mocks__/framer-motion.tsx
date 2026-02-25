/**
 * Mock framer-motion for tests
 *
 * Replaces animation components with simple divs that render immediately.
 * This avoids animation timing issues in happy-dom.
 *
 * IMPORTANT: Hook mocks (useMotionValue, useSpring, etc.) use useRef to
 * return STABLE references across renders, matching real framer-motion
 * behavior. Without this, re-renders create new objects, causing unstable
 * useEffect dependencies and unexpected DOM node replacement.
 */

import * as React from "react";

// ============================================================================
// Mock MotionValue
// ============================================================================

interface MockMotionValue {
  __mockMotionValue: true;
  _value: number;
  get: () => number;
  set: (v: number) => void;
  on: () => () => void;
  onChange: () => () => void;
}

function createMotionValue(initial: number): MockMotionValue {
  const mv: MockMotionValue = {
    __mockMotionValue: true,
    _value: initial,
    get: () => mv._value,
    set: (v: number) => { mv._value = v; },
    on: () => () => {},
    onChange: () => () => {},
  };
  return mv;
}

function isMotionValue(v: unknown): v is MockMotionValue {
  return v !== null && v !== undefined && typeof v === "object" && (v as Record<string, unknown>).__mockMotionValue === true;
}

// ============================================================================
// Motion prop filtering
// ============================================================================

// Framer-motion specific props to filter out
const motionProps = [
  "initial", "animate", "exit", "transition", "variants",
  "whileHover", "whileTap", "whileFocus", "whileDrag", "whileInView",
  "drag", "dragConstraints", "dragDirectionLock", "dragElastic", "dragMomentum", "dragPropagation",
  "onDrag", "onDragStart", "onDragEnd", "onAnimationStart", "onAnimationComplete",
  "layout", "layoutId", "layoutDependency",
];

// Filter out framer-motion props from HTML elements
function filterMotionProps<T extends Record<string, unknown>>(props: T): Partial<T> {
  const filtered = { ...props };
  for (const prop of motionProps) {
    delete filtered[prop];
  }
  // Filter MotionValue objects out of style to avoid invalid DOM style values
  if (filtered.style && typeof filtered.style === "object") {
    const cleanStyle: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(filtered.style as Record<string, unknown>)) {
      if (!isMotionValue(v)) {
        cleanStyle[k] = v;
      }
    }
    (filtered as Record<string, unknown>).style = cleanStyle;
  }
  return filtered;
}

// ============================================================================
// Motion components
// ============================================================================

// Factory for motion element mocks — renders the raw HTML element with motion props filtered out
function createMotionComponent(tag: string) {
  const Component = React.forwardRef<HTMLElement, Record<string, unknown>>(
    ({ children, ...props }, ref) =>
      React.createElement(tag, { ref, ...filterMotionProps(props) }, children as React.ReactNode)
  );
  Component.displayName = `Motion${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
  return Component;
}

// All HTML element types used with motion.X across the codebase
export const motion: Record<string, ReturnType<typeof createMotionComponent>> = {
  div: createMotionComponent("div"),
  span: createMotionComponent("span"),
  button: createMotionComponent("button"),
  aside: createMotionComponent("aside"),
  nav: createMotionComponent("nav"),
  li: createMotionComponent("li"),
  p: createMotionComponent("p"),
  a: createMotionComponent("a"),
  form: createMotionComponent("form"),
  section: createMotionComponent("section"),
  article: createMotionComponent("article"),
  main: createMotionComponent("main"),
  header: createMotionComponent("header"),
  footer: createMotionComponent("footer"),
  h1: createMotionComponent("h1"),
  h2: createMotionComponent("h2"),
  h3: createMotionComponent("h3"),
  ul: createMotionComponent("ul"),
  ol: createMotionComponent("ol"),
  svg: createMotionComponent("svg"),
  circle: createMotionComponent("circle"),
  path: createMotionComponent("path"),
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

// ============================================================================
// Hooks — use useRef for stable references across renders
// ============================================================================

export function useAnimation() {
  const [controls] = React.useState(() => ({
    start: () => Promise.resolve(),
    stop: () => {},
    set: () => {},
  }));
  return controls;
}

export function useMotionValue(initial: number) {
  const [mv] = React.useState(() => createMotionValue(initial));
  return mv;
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

export function useInView() {
  return true;
}

export function useMotionTemplate(strings: TemplateStringsArray, ...values: unknown[]) {
  // Resolve MotionValue objects by calling .get(), pass other values through
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const resolved = isMotionValue(val) ? val.get() : val;
    result += String(resolved) + (strings[i + 1] || "");
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

export function animate() {
  return { stop: () => {} };
}

export const MotionConfig = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const LazyMotion = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const domAnimation = {};
