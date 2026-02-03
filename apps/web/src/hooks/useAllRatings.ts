"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { RatingSummary } from "@/lib/ratings/rating-store";

interface AllRatingsState {
  summaries: Record<string, RatingSummary>;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface UseAllRatingsReturn extends AllRatingsState {
  refresh: () => Promise<void>;
  getRating: (contentId: string) => RatingSummary | null;
}

/**
 * Hook for fetching all prompt rating summaries at once.
 * Used for sorting/filtering prompts by rating.
 */
export function useAllRatings(): UseAllRatingsReturn {
  const [state, setState] = useState<AllRatingsState>({
    summaries: {},
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchedRef = useRef(false);

  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch("/api/ratings/summaries");
      if (!res.ok) {
        throw new Error("Failed to fetch ratings");
      }
      const data = await res.json();
      setState({
        summaries: data.summaries,
        loading: false,
        error: null,
        lastUpdated: data.generated_at,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  const getRating = useCallback(
    (contentId: string): RatingSummary | null => {
      return state.summaries[contentId] ?? null;
    },
    [state.summaries]
  );

  useEffect(() => {
    // Only fetch once on mount
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchRatings();
    }
  }, [fetchRatings]);

  return {
    ...state,
    refresh: fetchRatings,
    getRating,
  };
}

export default useAllRatings;
