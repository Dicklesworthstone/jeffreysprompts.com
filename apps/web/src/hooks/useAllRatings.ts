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

  const mountedRef = useRef(true);

  const fetchRatings = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/ratings/summaries", { signal });
      if (!res.ok) {
        throw new Error("Failed to fetch ratings");
      }
      const data = await res.json();
      if (mountedRef.current) {
        setState({
          summaries: data.summaries,
          loading: false,
          error: null,
          lastUpdated: data.generated_at,
        });
      }
    } catch (err) {
      // Don't update state for aborted requests
      if (err instanceof Error && err.name === "AbortError") return;
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    }
  }, []);

  const getRating = useCallback(
    (contentId: string): RatingSummary | null => {
      return state.summaries[contentId] ?? null;
    },
    [state.summaries]
  );

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    fetchRatings(controller.signal);

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetchRatings]);

  return {
    ...state,
    refresh: () => fetchRatings(),
    getRating,
  };
}

export default useAllRatings;
