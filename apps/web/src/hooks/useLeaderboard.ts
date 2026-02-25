"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { LeaderboardEntry } from "@/app/api/ratings/leaderboard/route";

interface LeaderboardState {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
}

interface UseLeaderboardOptions {
  limit?: number;
  minVotes?: number;
}

interface UseLeaderboardReturn extends LeaderboardState {
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching the prompt leaderboard (top rated prompts).
 */
export function useLeaderboard(options: UseLeaderboardOptions = {}): UseLeaderboardReturn {
  const { limit = 10, minVotes = 1 } = options;

  const [state, setState] = useState<LeaderboardState>({
    entries: [],
    loading: true,
    error: null,
  });

  const mountedRef = useRef(true);

  const fetchLeaderboard = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("minVotes", String(minVotes));

      const res = await fetch(`/api/ratings/leaderboard?${params.toString()}`, { signal });
      if (!res.ok) {
        throw new Error("Failed to fetch leaderboard");
      }
      const data = await res.json();
      if (mountedRef.current) {
        setState({
          entries: data.entries,
          loading: false,
          error: null,
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
  }, [limit, minVotes]);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    fetchLeaderboard(controller.signal);

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetchLeaderboard]);

  return {
    ...state,
    refresh: () => fetchLeaderboard(),
  };
}

export default useLeaderboard;
