"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseInViewReturn<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isInView: boolean;
  hasBeenInView: boolean;
}

/**
 * Hook to detect when an element enters the viewport.
 * Used for scroll-reveal animations.
 *
 * @param options - Intersection Observer options
 * @param options.threshold - Visibility threshold (0-1), default 0.1
 * @param options.rootMargin - Root margin for earlier/later triggering
 * @param options.triggerOnce - If true, only triggers once (default: true)
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): UseInViewReturn<T> {
  const { threshold = 0.1, rootMargin = "0px 0px -50px 0px", triggerOnce = true } = options;

  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    let observer: IntersectionObserver | null = null;

    if (element) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;

          const inView = entry.isIntersecting;
          setIsInView(inView);

          if (inView) {
            setHasBeenInView(true);

            if (triggerOnce) {
              observer?.disconnect();
            }
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(element);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isInView, hasBeenInView };
}

/**
 * Hook for staggered scroll-reveal animations.
 * Returns multiple refs that can be applied to a list of elements.
 *
 * @param count - Number of elements to track
 * @param options - Intersection Observer options
 */
export function useInViewStagger(
  count: number,
  options: UseInViewOptions = {}
): { refs: RefObject<HTMLDivElement | null>[]; inViewStates: boolean[] } {
  const { threshold = 0.1, rootMargin = "0px 0px -50px 0px", triggerOnce = true } = options;

  const [inViewStates, setInViewStates] = useState<boolean[]>(() => Array(count).fill(false));

  const refs = useMemo<RefObject<HTMLDivElement | null>[]>(
    () => Array.from({ length: count }, () => ({ current: null })),
    [count]
  );

  const normalizedStates = useMemo(() => {
    if (inViewStates.length === count) return inViewStates;
    const next = inViewStates.slice(0, count);
    while (next.length < count) next.push(false);
    return next;
  }, [count, inViewStates]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    refs.forEach((ref, index) => {
      const element = ref.current;
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry) return;

            if (entry.isIntersecting) {
              setInViewStates((prev) => {
                const next = [...prev];
                next[index] = true;
                return next;
              });

              if (triggerOnce) {
                observer.disconnect();
              }
            } else if (!triggerOnce) {
              setInViewStates((prev) => {
                const next = [...prev];
                next[index] = false;
                return next;
              });
            }
          },
          { threshold, rootMargin }
        );

        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [count, refs, threshold, rootMargin, triggerOnce]);

  return { refs, inViewStates: normalizedStates };
}
