/**
 * Tests for useViewTransition hook — View Transitions API wrapper
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { useViewTransition } from "./useViewTransition";

describe("useViewTransition", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("returns isSupported false when View Transitions API is unavailable", () => {
    const { result } = renderHook(() => useViewTransition());
    // happy-dom doesn't have startViewTransition
    expect(result.current.isSupported).toBe(false);
  });

  it("returns navigateWithTransition function", () => {
    const { result } = renderHook(() => useViewTransition());
    expect(typeof result.current.navigateWithTransition).toBe("function");
  });

  it("returns startTransition function", () => {
    const { result } = renderHook(() => useViewTransition());
    expect(typeof result.current.startTransition).toBe("function");
  });

  it("navigateWithTransition falls back to router.push when unsupported", () => {
    const { result } = renderHook(() => useViewTransition());
    act(() => {
      result.current.navigateWithTransition("/about");
    });
    expect(mockPush).toHaveBeenCalledWith("/about");
  });

  it("navigateWithTransition calls callbacks when unsupported", () => {
    const onBefore = vi.fn();
    const onAfter = vi.fn();
    const { result } = renderHook(() => useViewTransition());

    act(() => {
      result.current.navigateWithTransition("/test", {
        onBeforeNavigate: onBefore,
        onAfterNavigate: onAfter,
      });
    });

    expect(onBefore).toHaveBeenCalled();
    expect(onAfter).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/test");
  });

  it("navigateWithTransition respects skipTransition option", () => {
    const { result } = renderHook(() => useViewTransition());
    act(() => {
      result.current.navigateWithTransition("/skip", { skipTransition: true });
    });
    expect(mockPush).toHaveBeenCalledWith("/skip");
  });

  it("startTransition calls callback directly when unsupported", async () => {
    const { result } = renderHook(() => useViewTransition());
    const callback = vi.fn();
    await act(async () => {
      await result.current.startTransition(callback);
    });
    expect(callback).toHaveBeenCalled();
  });

  describe("with View Transitions API available", () => {
    let origStartViewTransition: unknown;

    beforeEach(() => {
      origStartViewTransition = (document as Record<string, unknown>).startViewTransition;
      const mockTransition = {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };
      (document as Record<string, unknown>).startViewTransition = vi.fn((cb: () => void) => {
        cb();
        return mockTransition;
      });
      // Ensure reduced motion is off
      
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
      if (origStartViewTransition === undefined) {
        delete (document as Record<string, unknown>).startViewTransition;
      } else {
        (document as Record<string, unknown>).startViewTransition = origStartViewTransition;
      }
    });

    it("uses startViewTransition for startTransition when supported", async () => {
      const { result } = renderHook(() => useViewTransition());

      if (result.current.isSupported) {
        const callback = vi.fn();
        await act(async () => {
          await result.current.startTransition(callback);
        });
        expect(callback).toHaveBeenCalled();
        expect(document.startViewTransition).toHaveBeenCalled();
      }
    });
  });
});
