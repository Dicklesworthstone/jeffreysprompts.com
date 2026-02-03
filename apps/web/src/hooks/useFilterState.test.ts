/**
 * Unit tests for useFilterState hook
 *
 * Tests URL-synchronized filter state management.
 * Philosophy: Test real behavior with mocked Next.js navigation.
 *
 * @see @/hooks/useFilterState.ts
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFilterState } from "./useFilterState";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

// Mock Next.js navigation hooks
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => mockPathname,
}));

describe("useFilterState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("q");
    mockSearchParams.delete("category");
    mockSearchParams.delete("tags");
    mockSearchParams.delete("sort");
    mockSearchParams.delete("minRating");
    mockPathname = "/";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("returns empty filters when URL has no query params", () => {
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters).toEqual({
        query: "",
        category: null,
        tags: [],
        sortBy: "default",
        minRating: 0,
      });
    });

    it("parses query param from URL", () => {
      mockSearchParams.set("q", "wizard");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.query).toBe("wizard");
    });

    it("parses category param from URL", () => {
      mockSearchParams.set("category", "ideation");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.category).toBe("ideation");
    });

    it("parses tags param from URL (comma-separated)", () => {
      mockSearchParams.set("tags", "brainstorming,ultrathink,ai");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.tags).toEqual(["brainstorming", "ultrathink", "ai"]);
    });

    it("handles all params together", () => {
      mockSearchParams.set("q", "test query");
      mockSearchParams.set("category", "automation");
      mockSearchParams.set("tags", "cli,agent");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters).toEqual({
        query: "test query",
        category: "automation",
        tags: ["cli", "agent"],
        sortBy: "default",
        minRating: 0,
      });
    });

    it("parses sort param from URL", () => {
      mockSearchParams.set("sort", "rating");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.sortBy).toBe("rating");
    });

    it("defaults to 'default' for invalid sort param", () => {
      mockSearchParams.set("sort", "invalid");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.sortBy).toBe("default");
    });

    it("parses minRating param from URL", () => {
      mockSearchParams.set("minRating", "70");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.minRating).toBe(70);
    });

    it("defaults to 0 for invalid minRating param", () => {
      mockSearchParams.set("minRating", "invalid");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.minRating).toBe(0);
    });

    it("defaults to 0 for out-of-range minRating param", () => {
      mockSearchParams.set("minRating", "75");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.minRating).toBe(0);
    });

    it("handles empty tags param gracefully", () => {
      mockSearchParams.set("tags", "");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.tags).toEqual([]);
    });
  });

  describe("setQuery", () => {
    it("updates URL with query param", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setQuery("wizard");
      });

      expect(mockPush).toHaveBeenCalledWith("/?q=wizard", { scroll: false });
    });

    it("removes q param when query is empty", () => {
      mockSearchParams.set("q", "existing");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setQuery("");
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("preserves other params when setting query", () => {
      mockSearchParams.set("category", "ideation");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setQuery("test");
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=test"), { scroll: false });
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("category=ideation"), { scroll: false });
    });

    it("encodes special characters in query", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setQuery("test & demo");
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=test+%26+demo"), { scroll: false });
    });
  });

  describe("setCategory", () => {
    it("updates URL with category param", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setCategory("automation" as PromptCategory);
      });

      expect(mockPush).toHaveBeenCalledWith("/?category=automation", { scroll: false });
    });

    it("removes category param when null", () => {
      mockSearchParams.set("category", "existing");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setCategory(null);
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("preserves other params when setting category", () => {
      mockSearchParams.set("q", "wizard");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setCategory("ideation" as PromptCategory);
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=wizard"), { scroll: false });
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("category=ideation"), { scroll: false });
    });
  });

  describe("setTags", () => {
    it("updates URL with tags param (comma-separated)", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setTags(["brainstorming", "ai"]);
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("tags=brainstorming%2Cai"), { scroll: false });
    });

    it("removes tags param when array is empty", () => {
      mockSearchParams.set("tags", "existing");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setTags([]);
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("handles single tag", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setTags(["solo"]);
      });

      expect(mockPush).toHaveBeenCalledWith("/?tags=solo", { scroll: false });
    });
  });

  describe("toggleTag", () => {
    it("adds tag when not present", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.toggleTag("new-tag");
      });

      expect(mockPush).toHaveBeenCalledWith("/?tags=new-tag", { scroll: false });
    });

    it("removes tag when already present", () => {
      mockSearchParams.set("tags", "existing-tag");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.toggleTag("existing-tag");
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("adds to existing tags", () => {
      mockSearchParams.set("tags", "tag1,tag2");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.toggleTag("tag3");
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("tags=tag1%2Ctag2%2Ctag3"), { scroll: false });
    });

    it("removes from existing tags", () => {
      mockSearchParams.set("tags", "tag1,tag2,tag3");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.toggleTag("tag2");
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("tags=tag1%2Ctag3"), { scroll: false });
    });
  });

  describe("setSortBy", () => {
    it("updates URL with sort param", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setSortBy("rating");
      });

      expect(mockPush).toHaveBeenCalledWith("/?sort=rating", { scroll: false });
    });

    it("removes sort param when set to default", () => {
      mockSearchParams.set("sort", "rating");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setSortBy("default");
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("preserves other params when setting sort", () => {
      mockSearchParams.set("q", "test");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setSortBy("votes");
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=test"), { scroll: false });
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("sort=votes"), { scroll: false });
    });
  });

  describe("setMinRating", () => {
    it("updates URL with minRating param", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setMinRating(70);
      });

      expect(mockPush).toHaveBeenCalledWith("/?minRating=70", { scroll: false });
    });

    it("removes minRating param when set to 0", () => {
      mockSearchParams.set("minRating", "70");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setMinRating(0);
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("preserves other params when setting minRating", () => {
      mockSearchParams.set("q", "test");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setMinRating(80);
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=test"), { scroll: false });
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("minRating=80"), { scroll: false });
    });
  });

  describe("clearFilters", () => {
    it("removes all filter params from URL", () => {
      mockSearchParams.set("q", "wizard");
      mockSearchParams.set("category", "ideation");
      mockSearchParams.set("tags", "ai,brainstorming");
      mockSearchParams.set("sort", "rating");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("works when no filters are active", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
    });

    it("uses current pathname", () => {
      mockPathname = "/prompts";
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockPush).toHaveBeenCalledWith("/prompts", { scroll: false });
    });
  });

  describe("hasActiveFilters", () => {
    it("returns false when no filters are active", () => {
      const { result } = renderHook(() => useFilterState());

      expect(result.current.hasActiveFilters).toBe(false);
    });

    it("returns true when query is set", () => {
      mockSearchParams.set("q", "wizard");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when category is set", () => {
      mockSearchParams.set("category", "ideation");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when tags are set", () => {
      mockSearchParams.set("tags", "ai");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when multiple filters are set", () => {
      mockSearchParams.set("q", "test");
      mockSearchParams.set("category", "automation");
      mockSearchParams.set("tags", "cli,agent");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when minRating is set", () => {
      mockSearchParams.set("minRating", "70");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe("URL pathname handling", () => {
    it("preserves pathname when updating filters", () => {
      mockPathname = "/prompts/featured";
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setQuery("test");
      });

      expect(mockPush).toHaveBeenCalledWith("/prompts/featured?q=test", { scroll: false });
    });

    it("removes query string but keeps pathname when clearing filters", () => {
      mockPathname = "/custom-page";
      mockSearchParams.set("q", "test");
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockPush).toHaveBeenCalledWith("/custom-page", { scroll: false });
    });
  });

  describe("edge cases", () => {
    it("handles empty string category gracefully", () => {
      mockSearchParams.set("category", "");
      const { result } = renderHook(() => useFilterState());

      // Empty string is not a valid category, so it should be treated as null
      expect(result.current.filters.category).toBeNull();
    });

    it("filters out empty tag values", () => {
      mockSearchParams.set("tags", "valid,,another,");
      const { result } = renderHook(() => useFilterState());

      expect(result.current.filters.tags).toEqual(["valid", "another"]);
    });

    it("does not scroll on navigation", () => {
      const { result } = renderHook(() => useFilterState());

      act(() => {
        result.current.setQuery("test");
      });

      expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
    });
  });
});
