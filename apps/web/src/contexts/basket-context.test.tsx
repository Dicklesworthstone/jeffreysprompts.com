/**
 * Unit tests for BasketContext
 *
 * Tests basket state management: add, remove, clear, and persistence.
 * Philosophy: NO mocks - test real context behavior.
 *
 * @see @/contexts/basket-context.tsx
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasketProvider, useBasketContext } from "./basket-context";

const safeParse = (value: string | null): string[] => {
  if (!value) return [];
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
};

describe("BasketContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BasketProvider>{children}</BasketProvider>
  );

  describe("initialization", () => {
    it("starts with empty basket", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });
      expect(result.current.items).toEqual([]);
    });

    it("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useBasketContext());
      }).toThrow("useBasket must be used within BasketProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("addItem", () => {
    it("adds an item to the basket", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
      });

      expect(result.current.items).toContain("prompt-1");
      expect(result.current.items).toHaveLength(1);
    });

    it("adds multiple items", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
        result.current.addItem("prompt-2");
        result.current.addItem("prompt-3");
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items).toContain("prompt-1");
      expect(result.current.items).toContain("prompt-2");
      expect(result.current.items).toContain("prompt-3");
    });

    it("does not add duplicate items", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
        result.current.addItem("prompt-1");
        result.current.addItem("prompt-1");
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe("removeItem", () => {
    it("removes an item from the basket", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
        result.current.addItem("prompt-2");
      });

      act(() => {
        result.current.removeItem("prompt-1");
      });

      expect(result.current.items).not.toContain("prompt-1");
      expect(result.current.items).toContain("prompt-2");
      expect(result.current.items).toHaveLength(1);
    });

    it("handles removing non-existent item gracefully", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
      });

      act(() => {
        result.current.removeItem("non-existent");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items).toContain("prompt-1");
    });
  });

  describe("clearBasket", () => {
    it("removes all items from basket", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
        result.current.addItem("prompt-2");
        result.current.addItem("prompt-3");
      });

      expect(result.current.items).toHaveLength(3);

      act(() => {
        result.current.clearBasket();
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("handles clearing empty basket", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.clearBasket();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("isInBasket", () => {
    it("returns true for items in basket", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
      });

      expect(result.current.isInBasket("prompt-1")).toBe(true);
    });

    it("returns false for items not in basket", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      expect(result.current.isInBasket("non-existent")).toBe(false);
    });

    it("updates correctly after add/remove", () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      expect(result.current.isInBasket("prompt-1")).toBe(false);

      act(() => {
        result.current.addItem("prompt-1");
      });

      expect(result.current.isInBasket("prompt-1")).toBe(true);

      act(() => {
        result.current.removeItem("prompt-1");
      });

      expect(result.current.isInBasket("prompt-1")).toBe(false);
    });
  });

  describe("persistence", () => {
    it("persists to localStorage after debounce", async () => {
      const { result } = renderHook(() => useBasketContext(), { wrapper });

      act(() => {
        result.current.addItem("prompt-1");
        result.current.addItem("prompt-2");
      });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(500);
      });

      const stored = localStorage.getItem("jfp-basket");
      expect(stored).not.toBeNull();
      const parsed = safeParse(stored);
      expect(parsed).toContain("prompt-1");
      expect(parsed).toContain("prompt-2");
    });
  });
});
