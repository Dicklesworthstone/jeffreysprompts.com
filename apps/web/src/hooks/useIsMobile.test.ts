/**
 * Unit tests for useIsMobile and useIsSmallScreen hooks
 * @module hooks/useIsMobile.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile, useIsSmallScreen } from "./useIsMobile";

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Reset window.innerWidth mock
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    vi.restoreAllMocks();
  });

  test("returns false for wide viewport (desktop)", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024 });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  test("returns true for narrow viewport (mobile)", () => {
    Object.defineProperty(window, "innerWidth", { value: 600 });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  test("respects custom breakpoint", () => {
    Object.defineProperty(window, "innerWidth", { value: 900 });

    // With default breakpoint (768), should be false
    const { result: result1 } = renderHook(() => useIsMobile());
    expect(result1.current).toBe(false);

    // With higher breakpoint (1024), should be true
    const { result: result2 } = renderHook(() =>
      useIsMobile({ breakpoint: 1024 })
    );
    expect(result2.current).toBe(true);
  });

  test("updates on resize", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024 });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, "innerWidth", { value: 600 });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(true);
  });

  test("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "orientationchange",
      expect.any(Function)
    );
  });
});

describe("useIsSmallScreen", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    vi.restoreAllMocks();
  });

  test("returns false for wide viewport", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024 });

    const { result } = renderHook(() => useIsSmallScreen());

    expect(result.current).toBe(false);
  });

  test("returns true for narrow viewport", () => {
    Object.defineProperty(window, "innerWidth", { value: 600 });

    const { result } = renderHook(() => useIsSmallScreen());

    expect(result.current).toBe(true);
  });

  test("respects custom breakpoint", () => {
    Object.defineProperty(window, "innerWidth", { value: 500 });

    // With default breakpoint (768), should be true
    const { result: result1 } = renderHook(() => useIsSmallScreen());
    expect(result1.current).toBe(true);

    // With lower breakpoint (400), should be false
    const { result: result2 } = renderHook(() => useIsSmallScreen(400));
    expect(result2.current).toBe(false);
  });

  test("updates on resize", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024 });

    const { result } = renderHook(() => useIsSmallScreen());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, "innerWidth", { value: 600 });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(true);
  });

  test("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useIsSmallScreen());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
  });

  test("handles breakpoint at boundary value", () => {
    // Test exactly at the breakpoint
    Object.defineProperty(window, "innerWidth", { value: 768 });

    const { result } = renderHook(() => useIsSmallScreen(768));
    // innerWidth < breakpoint, so 768 < 768 is false
    expect(result.current).toBe(false);

    // One pixel below should be true
    Object.defineProperty(window, "innerWidth", { value: 767 });
    const { result: result2 } = renderHook(() => useIsSmallScreen(768));
    expect(result2.current).toBe(true);
  });
});
