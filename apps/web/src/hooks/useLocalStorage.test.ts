/**
 * Unit tests for useLocalStorage hook
 *
 * Tests localStorage persistence, SSR safety, debouncing, and cross-tab sync.
 * Philosophy: NO mocks of localStorage - test real behavior.
 *
 * @see @/hooks/useLocalStorage.ts
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe("initialization", () => {
    it("returns initial value when localStorage is empty", () => {
      const { result } = renderHook(() => useLocalStorage("test-key", "initial"));
      expect(result.current[0]).toBe("initial");
    });

    it("returns stored value when localStorage has data", () => {
      localStorage.setItem("test-key", JSON.stringify("stored"));
      const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

      // In test environment with happy-dom, effects run synchronously
      // so the stored value is available after effects run
      act(() => {
        vi.runAllTimers();
      });

      // After effect runs, should have stored value
      expect(result.current[0]).toBe("stored");
    });

    it("handles complex objects as initial value", () => {
      const initialObj = { name: "test", count: 42, nested: { value: true } };
      const { result } = renderHook(() => useLocalStorage("obj-key", initialObj));
      expect(result.current[0]).toEqual(initialObj);
    });

    it("handles arrays as initial value", () => {
      const initialArr = [1, 2, 3, "four"];
      const { result } = renderHook(() => useLocalStorage("arr-key", initialArr));
      expect(result.current[0]).toEqual(initialArr);
    });

    it("handles null as initial value", () => {
      const { result } = renderHook(() => useLocalStorage<string | null>("null-key", null));
      expect(result.current[0]).toBeNull();
    });
  });

  describe("setValue", () => {
    it("updates state immediately", () => {
      const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

      act(() => {
        result.current[1]("updated");
      });

      expect(result.current[0]).toBe("updated");
    });

    it("accepts a function updater", () => {
      const { result } = renderHook(() => useLocalStorage("counter", 0));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);

      act(() => {
        result.current[1]((prev) => prev + 10);
      });

      expect(result.current[0]).toBe(11);
    });

    it("persists to localStorage after debounce", async () => {
      const { result } = renderHook(() =>
        useLocalStorage("debounce-test", "initial", { debounceMs: 100 })
      );

      act(() => {
        result.current[1]("updated");
      });

      // Not yet persisted
      expect(localStorage.getItem("debounce-test")).toBeNull();

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(localStorage.getItem("debounce-test")).toBe(JSON.stringify("updated"));
    });

    it("handles rapid updates with debouncing", async () => {
      const { result } = renderHook(() =>
        useLocalStorage("rapid-test", 0, { debounceMs: 100 })
      );

      // Rapid updates
      act(() => {
        result.current[1](1);
        result.current[1](2);
        result.current[1](3);
      });

      // State should be latest
      expect(result.current[0]).toBe(3);

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Only final value should be persisted
      expect(localStorage.getItem("rapid-test")).toBe(JSON.stringify(3));
    });
  });

  describe("removeValue", () => {
    it("removes item from localStorage", () => {
      localStorage.setItem("remove-test", JSON.stringify("stored"));
      const { result } = renderHook(() => useLocalStorage("remove-test", "initial"));

      act(() => {
        result.current[2]();
      });

      expect(localStorage.getItem("remove-test")).toBeNull();
    });

    it("resets state to initial value", () => {
      const { result } = renderHook(() => useLocalStorage("reset-test", "initial"));

      act(() => {
        result.current[1]("changed");
      });
      expect(result.current[0]).toBe("changed");

      act(() => {
        result.current[2]();
      });
      expect(result.current[0]).toBe("initial");
    });
  });

  describe("cross-tab synchronization", () => {
    it("updates state when storage event fires", () => {
      const { result } = renderHook(() => useLocalStorage("sync-test", "initial"));

      // Simulate storage event from another tab
      act(() => {
        const event = new StorageEvent("storage", {
          key: "sync-test",
          newValue: JSON.stringify("from-other-tab"),
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe("from-other-tab");
    });

    it("ignores storage events for different keys", () => {
      const { result } = renderHook(() => useLocalStorage("my-key", "original"));

      act(() => {
        const event = new StorageEvent("storage", {
          key: "other-key",
          newValue: JSON.stringify("should-ignore"),
        });
        window.dispatchEvent(event);
      });

      expect(result.current[0]).toBe("original");
    });
  });

  describe("error handling", () => {
    it("handles invalid JSON in localStorage gracefully", () => {
      localStorage.setItem("invalid-json", "not valid json {");
      const { result } = renderHook(() => useLocalStorage("invalid-json", "fallback"));

      // Should use initial value when parse fails
      expect(result.current[0]).toBe("fallback");
    });
  });

  describe("key changes", () => {
    it("reads from new key when key changes", () => {
      localStorage.setItem("key-a", JSON.stringify("value-a"));
      localStorage.setItem("key-b", JSON.stringify("value-b"));

      const { result, rerender } = renderHook(
        ({ key }) => useLocalStorage(key, "default"),
        { initialProps: { key: "key-a" } }
      );

      // Allow effects to run
      act(() => {
        vi.runAllTimers();
      });

      rerender({ key: "key-b" });

      // Allow effects to run for new key
      act(() => {
        vi.runAllTimers();
      });

      // Value should reflect the new key's storage
      expect(result.current[0]).toBe("value-b");
    });

    it("resets to initial value when new key has no stored value", () => {
      localStorage.setItem("key-a", JSON.stringify("value-a"));

      const { result, rerender } = renderHook(
        ({ key }) => useLocalStorage(key, "default"),
        { initialProps: { key: "key-a" } }
      );

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current[0]).toBe("value-a");

      rerender({ key: "missing-key" });

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current[0]).toBe("default");
    });
  });
});
