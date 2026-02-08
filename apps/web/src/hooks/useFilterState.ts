"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { categories as validCategories } from "@jeffreysprompts/core/prompts/registry";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

export type SortOption = "default" | "rating" | "votes" | "newest";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "rating", label: "Highest rated" },
  { value: "votes", label: "Most votes" },
  { value: "newest", label: "Newest first" },
];

export type MinRatingOption = 0 | 50 | 60 | 70 | 80 | 90;

export const MIN_RATING_OPTIONS: { value: MinRatingOption; label: string }[] = [
  { value: 0, label: "Any rating" },
  { value: 50, label: "50%+" },
  { value: 60, label: "60%+" },
  { value: 70, label: "70%+" },
  { value: 80, label: "80%+" },
  { value: 90, label: "90%+" },
];

export interface FilterState {
  query: string;
  category: PromptCategory | null;
  tags: string[];
  sortBy: SortOption;
  minRating: MinRatingOption;
}

export interface UseFilterStateReturn {
  filters: FilterState;
  setQuery: (query: string) => void;
  setCategory: (category: PromptCategory | null) => void;
  setTags: (tags: string[]) => void;
  toggleTag: (tag: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  setMinRating: (minRating: MinRatingOption) => void;
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
    // Validate category before casting to prevent invalid values from URL
    const category = categoryParam && validCategories.includes(categoryParam as PromptCategory)
      ? (categoryParam as PromptCategory)
      : null;
    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
    const sortByParam = searchParams.get("sort");
    const sortBy = (
      sortByParam && ["default", "rating", "votes", "newest"].includes(sortByParam)
        ? sortByParam
        : "default"
    ) as SortOption;
    const minRatingParam = searchParams.get("minRating");
    const minRating = (
      minRatingParam && [0, 50, 60, 70, 80, 90].includes(Number(minRatingParam))
        ? Number(minRatingParam)
        : 0
    ) as MinRatingOption;

    return { query, category, tags, sortBy, minRating };
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

      if ("sortBy" in updates) {
        if (updates.sortBy && updates.sortBy !== "default") {
          params.set("sort", updates.sortBy);
        } else {
          params.delete("sort");
        }
      }

      if ("minRating" in updates) {
        if (updates.minRating && updates.minRating > 0) {
          params.set("minRating", String(updates.minRating));
        } else {
          params.delete("minRating");
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

  const setSortBy = useCallback(
    (sortBy: SortOption) => {
      updateUrl({ sortBy });
    },
    [updateUrl]
  );

  const setMinRating = useCallback(
    (minRating: MinRatingOption) => {
      updateUrl({ minRating });
    },
    [updateUrl]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("category");
    params.delete("tags");
    params.delete("sort");
    params.delete("minRating");

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    router.push(newUrl, { scroll: false });
  }, [searchParams, router, pathname]);

  const hasActiveFilters = useMemo(
    () => Boolean(filters.query || filters.category || filters.tags.length > 0 || filters.minRating > 0),
    [filters]
  );

  return {
    filters,
    setQuery,
    setCategory,
    setTags,
    toggleTag,
    setSortBy,
    setMinRating,
    clearFilters,
    hasActiveFilters,
  };
}

export default useFilterState;
