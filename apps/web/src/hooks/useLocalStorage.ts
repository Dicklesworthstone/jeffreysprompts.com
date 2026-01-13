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

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MutableRefObject,
} from "react";

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
  const latestValueRef: MutableRefObject<T> = useRef<T>(initialValue);
  const latestSerializedRef = useRef<string | null>(null);
  const latestKeyRef = useRef<string>(key);
  const hasLatestValueRef = useRef(false);
  const prevKeyRef = useRef<string>(key);
  const listenersRef = useRef(new Set<() => void>());

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Keep initialValueRef updated for resets without re-running effects every render
  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // Flush pending writes when switching keys
  useEffect(() => {
    const oldKey = prevKeyRef.current;
    if (oldKey !== key && debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      if (hasLatestValueRef.current) {
        try {
          window.localStorage.setItem(oldKey, JSON.stringify(latestValueRef.current));
        } catch {
          // Ignore errors on key-change flush
        }
      }
    }
    prevKeyRef.current = key;
    latestKeyRef.current = key;
    hasLatestValueRef.current = false;
    latestSerializedRef.current = null;
  }, [key]);

  const notifyListeners = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const readValue = useCallback((): T => {
    // Prevent hydration mismatch by returning initial value until mounted
    if (!isHydrated) {
      return initialValueRef.current;
    }

    if (hasLatestValueRef.current && latestKeyRef.current === key) {
      return latestValueRef.current;
    }
    if (typeof window === "undefined") return initialValueRef.current;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        latestSerializedRef.current = null;
        latestValueRef.current = initialValueRef.current;
        latestKeyRef.current = key;
        hasLatestValueRef.current = true;
        return latestValueRef.current;
      }
      if (
        hasLatestValueRef.current &&
        latestKeyRef.current === key &&
        latestSerializedRef.current === item
      ) {
        return latestValueRef.current;
      }
      const parsed = JSON.parse(item) as T;
      latestSerializedRef.current = item;
      latestValueRef.current = parsed;
      latestKeyRef.current = key;
      hasLatestValueRef.current = true;
      return parsed;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      latestSerializedRef.current = null;
      latestValueRef.current = initialValueRef.current;
      latestKeyRef.current = key;
      hasLatestValueRef.current = true;
      return initialValueRef.current;
    }
  }, [key, isHydrated]);

  const subscribe = useCallback(
    (listener: () => void) => {
      listenersRef.current.add(listener);
      if (typeof window === "undefined") {
        return () => listenersRef.current.delete(listener);
      }
      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) {
          if (event.newValue === null) {
            latestSerializedRef.current = null;
            latestValueRef.current = initialValueRef.current;
          } else {
            try {
              latestSerializedRef.current = event.newValue;
              latestValueRef.current = JSON.parse(event.newValue) as T;
            } catch (error) {
              console.warn(`Error reading localStorage key "${key}":`, error);
              latestSerializedRef.current = null;
              latestValueRef.current = initialValueRef.current;
            }
          }
          latestKeyRef.current = key;
          hasLatestValueRef.current = true;
          listener();
        }
      };
      window.addEventListener("storage", handleStorage);
      return () => {
        listenersRef.current.delete(listener);
        window.removeEventListener("storage", handleStorage);
      };
    },
    [key]
  );

  const storedValue = useSyncExternalStore(
    subscribe,
    readValue,
    () => initialValueRef.current
  );

  // Setter with debounced persistence
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(readValue()) : value;
    let serializedValue: string | null = null;
    let shouldRemove = false;
    try {
      if (typeof valueToStore === "undefined") {
        shouldRemove = true;
      } else {
        const nextSerialized = JSON.stringify(valueToStore) as string | undefined;
        if (typeof nextSerialized === "string") {
          serializedValue = nextSerialized;
        } else {
          shouldRemove = true;
        }
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
    latestValueRef.current = valueToStore;
    latestKeyRef.current = key;
    hasLatestValueRef.current = true;
    latestSerializedRef.current = shouldRemove ? null : serializedValue;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

    debounceRef.current = setTimeout(() => {
      try {
        if (shouldRemove) {
          window.localStorage.removeItem(key);
        } else if (serializedValue !== null) {
          window.localStorage.setItem(key, serializedValue);
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }, debounceMs);

      notifyListeners();
    },
    [key, debounceMs, readValue, notifyListeners]
  );

  // Remove from storage
  const removeValue = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      window.localStorage.removeItem(key);
      latestValueRef.current = initialValueRef.current;
      latestKeyRef.current = key;
      hasLatestValueRef.current = true;
      latestSerializedRef.current = null;
      notifyListeners();
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, notifyListeners]);

  // Persist on unmount if there's a pending debounce
  // NOTE: Only depends on `key`, NOT `storedValue` - we use latestValueRef to avoid
  // the stale closure bug where cleanup would write old values on every state change
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        // Use ref to get the actual latest value, not a stale closure
        if (hasLatestValueRef.current) {
          try {
            const serialized = JSON.stringify(latestValueRef.current);
            latestSerializedRef.current = serialized;
            window.localStorage.setItem(key, serialized);
          } catch {
            // Ignore errors on cleanup
          }
        }
      }
    };
  }, [key]);

  return [storedValue, setValue, removeValue];
}
