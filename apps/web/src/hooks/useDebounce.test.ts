/**
 * Unit tests for useDebounce and useDebouncedCallback hooks
 *
 * Tests debounce timing, pending state, immediate values, and cleanup.
 * Uses fake timers for precise control over debounce behavior.
 *
 * @see @/hooks/useDebounce.ts
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce, useDebouncedCallback } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("returns initial value immediately", () => {
      const { result } = renderHook(() => useDebounce("hello", 300));
      expect(result.current[0]).toBe("hello");
    });

    it("returns isPending as false initially", () => {
      const { result } = renderHook(() => useDebounce("hello", 300));
      expect(result.current[1]).toBe(false);
    });

    it("handles complex objects as initial value", () => {
      const obj = { name: "test", count: 42 };
      const { result } = renderHook(() => useDebounce(obj, 300));
      expect(result.current[0]).toEqual(obj);
    });

    it("handles arrays as initial value", () => {
      const arr = [1, 2, 3];
      const { result } = renderHook(() => useDebounce(arr, 300));
      expect(result.current[0]).toEqual(arr);
    });
  });

  describe("debounce behavior", () => {
    it("updates debounced value after delay", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "updated" });

      // Before delay, debounced value should still be initial
      // but isPending should be true
      expect(result.current[0]).toBe("initial");
      expect(result.current[1]).toBe(true);

      // After delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current[0]).toBe("updated");
      expect(result.current[1]).toBe(false);
    });

    it("only applies last value after multiple rapid changes", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "initial" } }
      );

      // Rapid changes
      rerender({ value: "change1" });
      rerender({ value: "change2" });
      rerender({ value: "change3" });

      // Still _initial, pending
      expect(result.current[0]).toBe("initial");
      expect(result.current[1]).toBe(true);

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should have the last value
      expect(result.current[0]).toBe("change3");
      expect(result.current[1]).toBe(false);
    });

    it("resets timer on each change", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "change1" });

      // Advance 200ms
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Still pending, not updated yet
      expect(result.current[0]).toBe("initial");
      expect(result.current[1]).toBe(true);

      // Change again, should reset timer
      rerender({ value: "change2" });

      // Advance another 200ms (total 400ms since change1, but only 200ms since change2)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Still pending because timer was reset
      expect(result.current[0]).toBe("initial");
      expect(result.current[1]).toBe(true);

      // Advance remaining 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now debounced
      expect(result.current[0]).toBe("change2");
      expect(result.current[1]).toBe(false);
    });
  });

  describe("immediate values (empty, null, undefined)", () => {
    it("applies empty string immediately without delay", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "initial" } }
      );

      rerender({ value: "" });

      // Empty string is immediate - no pending, value is already empty
      expect(result.current[0]).toBe("");
      expect(result.current[1]).toBe(false);
    });

    it("applies null immediately without delay", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce<string | null>(value, 300),
        { initialProps: { value: "initial" as string | null } }
      );

      rerender({ value: null });

      expect(result.current[0]).toBeNull();
      expect(result.current[1]).toBe(false);
    });

    it("applies undefined immediately without delay", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce<string | undefined>(value, 300),
        { initialProps: { value: "initial" as string | undefined } }
      );

      rerender({ value: undefined });

      expect(result.current[0]).toBeUndefined();
      expect(result.current[1]).toBe(false);
    });

    it("clears debounce when going from non-empty to empty", () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "" } }
      );

      // Start with empty
      expect(result.current[0]).toBe("");
      expect(result.current[1]).toBe(false);

      // Change to non-empty - should debounce
      rerender({ value: "typed" });
      expect(result.current[0]).toBe("");
      expect(result.current[1]).toBe(true);

      // Before debounce completes, go back to empty
      act(() => {
        vi.advanceTimersByTime(150);
      });
      rerender({ value: "" });

      // Should immediately be empty, not pending
      expect(result.current[0]).toBe("");
      expect(result.current[1]).toBe(false);
    });
  });

  describe("delay changes", () => {
    it("respects delay changes", () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: "initial", delay: 300 } }
      );

      // Change value with 300ms delay
      rerender({ value: "updated", delay: 300 });

      // Change delay to 100ms before 300ms passes
      rerender({ value: "updated", delay: 100 });

      // Advance 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should be debounced with new delay
      expect(result.current[0]).toBe("updated");
      expect(result.current[1]).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("clears timeout on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: "initial" } }
      );

      // Trigger a pending debounce
      rerender({ value: "updated" });

      unmount();

      // clearTimeout should have been called
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("returns a function and cancel function", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      expect(typeof result.current[0]).toBe("function");
      expect(typeof result.current[1]).toBe("function");
    });
  });

  describe("debounce behavior", () => {
    it("does not call callback immediately", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current[0]("arg1");
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("calls callback after delay", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current[0]("arg1");
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("arg1");
    });

    it("only calls callback once after multiple rapid calls", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current[0]("call1");
        result.current[0]("call2");
        result.current[0]("call3");
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("call3");
    });

    it("resets timer on each call", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current[0]("call1");
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      act(() => {
        result.current[0]("call2");
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Not yet called
      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("call2");
    });

    it("passes multiple arguments correctly", () => {
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useDebouncedCallback(callback as (...args: unknown[]) => unknown, 300)
      );

      act(() => {
        result.current[0]("arg1", 42, { key: "value" });
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith("arg1", 42, { key: "value" });
    });
  });

  describe("cancel function", () => {
    it("prevents pending callback from firing", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current[0]("arg1");
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Cancel before debounce completes
      act(() => {
        result.current[1]();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("allows new calls after cancel", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current[0]("first");
      });

      act(() => {
        result.current[1](); // cancel
      });

      act(() => {
        result.current[0]("second");
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("second");
    });

    it("is safe to call cancel when no pending callback", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      // Should not throw
      expect(() => {
        act(() => {
          result.current[1]();
        });
      }).not.toThrow();
    });
  });

  describe("callback reference updates", () => {
    it("uses latest callback when executed", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ cb }) => useDebouncedCallback(cb, 300),
        { initialProps: { cb: callback1 } }
      );

      act(() => {
        result.current[0]("arg");
      });

      // Update callback before debounce fires
      rerender({ cb: callback2 });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should use the updated callback
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith("arg");
    });
  });

  describe("cleanup", () => {
    it("clears timeout on unmount", () => {
      const callback = vi.fn();
      const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current[0]("arg");
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Callback should not have been called after unmount
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("delay changes", () => {
    it("applies new delay on subsequent calls", () => {
      const callback = vi.fn();

      const { result, rerender } = renderHook(
        ({ delay }) => useDebouncedCallback(callback, delay),
        { initialProps: { delay: 300 } }
      );

      // First call with 300ms delay
      act(() => {
        result.current[0]("call1");
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);

      // Change delay to 100ms
      rerender({ delay: 100 });

      // New call should use new delay
      act(() => {
        result.current[0]("call2");
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith("call2");
    });
  });
});
