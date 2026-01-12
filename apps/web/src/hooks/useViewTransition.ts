"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Check if the View Transitions API is supported
 */
function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof document.startViewTransition === "function"
  );
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface ViewTransitionOptions {
  /** Skip transition and navigate directly */
  skipTransition?: boolean;
  /** Callback before navigation */
  onBeforeNavigate?: () => void;
  /** Callback after navigation completes */
  onAfterNavigate?: () => void;
}

interface UseViewTransitionReturn {
  /** Whether view transitions are supported */
  isSupported: boolean;
  /** Navigate with a view transition */
  navigateWithTransition: (href: string, options?: ViewTransitionOptions) => void;
  /** Trigger a view transition for any DOM update */
  startTransition: (callback: () => void | Promise<void>) => Promise<void>;
}

/**
 * Hook for using the View Transitions API with Next.js navigation
 *
 * @example
 * ```tsx
 * const { navigateWithTransition, isSupported } = useViewTransition();
 *
 * <button onClick={() => navigateWithTransition('/about')}>
 *   About
 * </button>
 * ```
 */
export function useViewTransition(): UseViewTransitionReturn {
  const router = useRouter();
  const isNavigating = useRef(false);

  const isSupported = supportsViewTransitions() && !prefersReducedMotion();

  const startTransition = useCallback(
    async (callback: () => void | Promise<void>): Promise<void> => {
      if (!isSupported) {
        await callback();
        return;
      }

      try {
        const transition = document.startViewTransition(async () => {
          await callback();
        });
        await transition.finished;
      } catch {
        // Fallback if transition fails
        await callback();
      }
    },
    [isSupported]
  );

  const navigateWithTransition = useCallback(
    (href: string, options?: ViewTransitionOptions) => {
      // Prevent duplicate navigations
      if (isNavigating.current) return;

      const { skipTransition, onBeforeNavigate, onAfterNavigate } = options ?? {};

      // Skip if explicitly disabled or transitions not supported
      if (skipTransition || !isSupported) {
        onBeforeNavigate?.();
        router.push(href);
        onAfterNavigate?.();
        return;
      }

      isNavigating.current = true;
      onBeforeNavigate?.();

      try {
        const transition = document.startViewTransition(() => {
          router.push(href);
        });

        transition.finished
          .then(() => {
            onAfterNavigate?.();
          })
          .catch(() => {
            // Transition was skipped or failed, but navigation still happened
            onAfterNavigate?.();
          })
          .finally(() => {
            isNavigating.current = false;
          });
      } catch {
        // Fallback if startViewTransition fails
        router.push(href);
        onAfterNavigate?.();
        isNavigating.current = false;
      }
    },
    [router, isSupported]
  );

  return {
    isSupported,
    navigateWithTransition,
    startTransition,
  };
}

export default useViewTransition;
