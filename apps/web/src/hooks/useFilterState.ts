"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

export interface FilterState {
  query: string;
  category: PromptCategory | null;
  tags: string[];
}

export interface UseFilterStateReturn {
  filters: FilterState;
  setQuery: (query: string) => void;
  setCategory: (category: PromptCategory | null) => void;
  setTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Hook for managing filter state with URL synchronization
 */
export function useFilterState(): UseFilterStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse current filter state from URL
  const filters = useMemo<FilterState>(() => {
    const query = searchParams.get("q") ?? "";
    const categoryParam = searchParams.get("category");
    const category = categoryParam as PromptCategory | null;
    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];

    return { query, category, tags };
  }, [searchParams]);

  // Update URL with new params
  const updateUrl = useCallback(
    (updates: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      if ("query" in updates) {
        if (updates.query) {
          params.set("q", updates.query);
        } else {
          params.delete("q");
        }
      }

      if ("category" in updates) {
        if (updates.category) {
          params.set("category", updates.category);
        } else {
          params.delete("category");
        }
      }

      if ("tags" in updates) {
        if (updates.tags && updates.tags.length > 0) {
          params.set("tags", updates.tags.join(","));
        } else {
          params.delete("tags");
        }
      }

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      router.push(newUrl, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const setQuery = useCallback(
    (query: string) => {
      updateUrl({ query });
    },
    [updateUrl]
  );

  const setCategory = useCallback(
    (category: PromptCategory | null) => {
      updateUrl({ category });
    },
    [updateUrl]
  );

  const setTags = useCallback(
    (tags: string[]) => {
      updateUrl({ tags });
    },
    [updateUrl]
  );

  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag];
      updateUrl({ tags: newTags });
    },
    [filters.tags, updateUrl]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActiveFilters = useMemo(
    () => Boolean(filters.query || filters.category || filters.tags.length > 0),
    [filters]
  );

  return {
    filters,
    setQuery,
    setCategory,
    setTags,
    toggleTag,
    clearFilters,
    hasActiveFilters,
  };
}

export default useFilterState;
