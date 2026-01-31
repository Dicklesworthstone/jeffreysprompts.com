"use client";

import { useState, useCallback, useEffect } from "react";
import type { RatingValue, RatingSummary } from "@/lib/ratings/rating-store";
import { getOrCreateLocalUserId } from "@/lib/history/client";

interface RatingState {
  summary: RatingSummary | null;
  userRating: RatingValue | null;
  loading: boolean;
  error: string | null;
}

interface UseRatingOptions {
  contentType: "prompt" | "bundle" | "workflow" | "collection" | "skill";
  contentId: string;
}

interface UseRatingReturn extends RatingState {
  rate: (value: RatingValue) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRating({ contentType, contentId }: UseRatingOptions): UseRatingReturn {
  const [state, setState] = useState<RatingState>({
    summary: null,
    userRating: null,
    loading: true,
    error: null,
  });

  const fetchRating = useCallback(async () => {
    const userId = getOrCreateLocalUserId();
    const params = new URLSearchParams({
      contentType,
      contentId,
      ...(userId ? { userId } : {}),
    });

    try {
      const res = await fetch(`/api/ratings?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch rating");
      }
      const data = await res.json();
      setState({
        summary: data.summary,
        userRating: data.userRating,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [contentType, contentId]);

  const rate = useCallback(
    async (value: RatingValue) => {
      const userId = getOrCreateLocalUserId();
      if (!userId) {
        setState((prev) => ({ ...prev, error: "User ID required" }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType,
            contentId,
            userId,
            value,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to submit rating");
        }

        const data = await res.json();
        setState({
          summary: data.summary,
          userRating: data.rating.value,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    [contentType, contentId]
  );

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  return {
    ...state,
    rate,
    refresh: fetchRating,
  };
}
