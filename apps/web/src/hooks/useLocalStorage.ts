"use client";

/**
 * useLocalStorage - Generic localStorage persistence hook
 *
 * WHEN TO USE THIS HOOK:
 * - Simple boolean flags (e.g., "user dismissed welcome banner")
 * - One-off primitive values that don't need global state
 * - Values that aren't shared between components
 *
 * WHEN TO USE TANSTACK STORE INSTEAD:
 * - Complex state objects (reading positions, user preferences)
 * - State shared across multiple components
 * - State that needs actions/reducers pattern
 *
 * EXISTING STORES (use these instead of this hook):
 * - readingStore: Document reading positions (@/stores/readingStore)
 *
 * @see @/hooks/useReadingPosition for the TanStack Store-based pattern
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

/**
 * Hook for persisting state to localStorage with SSR safety.
 * Includes debounced writes for performance.
 *
 * @param key - localStorage key
 * @param initialValue - Default value if nothing in storage
 * @param options - Configuration options
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: { debounceMs?: number } = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const { debounceMs = 300 } = options;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialValueRef = useRef<T>(initialValue);
  // Track latest value for use in cleanup (avoids stale closure bug)
  const latestValueRef: MutableRefObject<T | null> = useRef<T | null>(null);

  // Initialize state with initialValue to avoid hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Keep initialValueRef updated for resets without re-running effects every render
  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // Read from localStorage on mount or key change
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
        return;
      }
      setStoredValue(initialValueRef.current);
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setStoredValue(initialValueRef.current);
    }
  }, [key]);

  // Setter with debounced persistence
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;

        // Debounce the localStorage write
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
          }
        }, debounceMs);

        return valueToStore;
      });
    },
    [key, debounceMs]
  );

  // Remove from storage
  const removeValue = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValueRef.current);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key]);

  // Keep latestValueRef in sync (for use in cleanup without stale closure)
  useEffect(() => {
    latestValueRef.current = storedValue;
  }, [storedValue]);

  // Persist on unmount if there's a pending debounce
  // NOTE: Only depends on `key`, NOT `storedValue` - we use latestValueRef to avoid
  // the stale closure bug where cleanup would write old values on every state change
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        // Use ref to get the actual latest value, not a stale closure
        if (latestValueRef.current !== null) {
          try {
            window.localStorage.setItem(key, JSON.stringify(latestValueRef.current));
          } catch {
            // Ignore errors on cleanup
          }
        }
      }
    };
  }, [key]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue === null) {
          // Key was removed in another tab
          setStoredValue(initialValueRef.current);
        } else {
          try {
            setStoredValue(JSON.parse(e.newValue) as T);
          } catch {
            // Ignore parse errors
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}
