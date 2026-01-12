"use client";

/**
 * useSwipeHint - Manages one-time swipe gesture hint visibility.
 *
 * Persists dismissal to localStorage so users only see the hint once.
 */

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const SWIPE_HINT_KEY = "jfp-swipe-hint-dismissed";

interface UseSwipeHintResult {
  /** Whether to show the swipe hint (false if dismissed) */
  showHint: boolean;
  /** Call this to dismiss the hint permanently */
  dismissHint: () => void;
  /** Reset the hint to show again (for testing) */
  resetHint: () => void;
}

export function useSwipeHint(): UseSwipeHintResult {
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    SWIPE_HINT_KEY,
    false,
    { debounceMs: 0 } // Immediate write for dismissal
  );

  const dismissHint = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  const resetHint = useCallback(() => {
    setDismissed(false);
  }, [setDismissed]);

  return {
    showHint: !dismissed,
    dismissHint,
    resetHint,
  };
}
