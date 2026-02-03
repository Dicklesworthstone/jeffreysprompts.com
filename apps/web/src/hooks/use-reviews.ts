"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Review, ReviewSummary, RatingContentType } from "@/lib/reviews/review-store";

interface ReviewsState {
  reviews: Review[];
  summary: ReviewSummary | null;
  userReview: Review | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  loading: boolean;
  error: string | null;
}

interface UseReviewsOptions {
  contentType: RatingContentType;
  contentId: string;
  limit?: number;
}

interface UseReviewsReturn extends ReviewsState {
  submitReview: (input: { rating: "up" | "down"; content: string; displayName?: string }) => Promise<boolean>;
  deleteReview: () => Promise<boolean>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReviews({
  contentType,
  contentId,
  limit = 10,
}: UseReviewsOptions): UseReviewsReturn {
  const [state, setState] = useState<ReviewsState>({
    reviews: [],
    summary: null,
    userReview: null,
    pagination: { total: 0, limit, offset: 0, hasMore: false },
    loading: true,
    error: null,
  });

  // Ref to track mounted state for safe state updates after async operations
  const mountedRef = useRef(true);

  const fetchReviews = useCallback(
    async (offset = 0, append = false, signal?: AbortSignal) => {
      const params = new URLSearchParams({
        contentType,
        contentId,
        limit: String(limit),
        offset: String(offset),
      });

      try {
        const res = await fetch(`/api/reviews?${params.toString()}`, { signal });
        if (!res.ok) {
          throw new Error("Failed to fetch reviews");
        }
        const data = await res.json();
        // Only update state if component is still mounted
        if (mountedRef.current) {
          setState((prev) => ({
            reviews: append ? [...prev.reviews, ...data.reviews] : data.reviews,
            summary: data.summary,
            userReview: data.userReview,
            pagination: data.pagination,
            loading: false,
            error: null,
          }));
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
    },
    [contentType, contentId, limit]
  );

  const submitReview = useCallback(
    async (input: {
      rating: "up" | "down";
      content: string;
      displayName?: string;
    }): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType,
            contentId,
            ...input,
          }),
        });

        if (!res.ok) {
          let errorMessage = "Failed to submit review";
          try {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
          } catch {
            // Response wasn't JSON, use default error
          }
          throw new Error(errorMessage);
        }

        const data = await res.json();
        setState((prev) => ({
          ...prev,
          reviews: data.isNew
            ? [data.review, ...prev.reviews]
            : prev.reviews.map((r) => (r.id === data.review.id ? data.review : r)),
          summary: data.summary,
          userReview: data.review,
          loading: false,
          error: null,
        }));
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
        return false;
      }
    },
    [contentType, contentId]
  );

  const deleteReview = useCallback(async (): Promise<boolean> => {
    if (!state.userReview) return false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/reviews/${state.userReview.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let errorMessage = "Failed to delete review";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // Response wasn't JSON, use default error
        }
        throw new Error(errorMessage);
      }

      setState((prev) => ({
        ...prev,
        reviews: prev.reviews.filter((r) => r.id !== prev.userReview?.id),
        userReview: null,
        pagination: {
          ...prev.pagination,
          total: Math.max(0, prev.pagination.total - 1),
        },
        loading: false,
        error: null,
      }));
      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
      return false;
    }
  }, [state.userReview]);

  const loadMore = useCallback(async () => {
    if (!state.pagination.hasMore || state.loading) return;
    await fetchReviews(state.pagination.offset + state.pagination.limit, true);
  }, [fetchReviews, state.pagination, state.loading]);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    fetchReviews(0, false, controller.signal);

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetchReviews]);

  return {
    ...state,
    submitReview,
    deleteReview,
    loadMore,
    refresh: () => fetchReviews(0, false),
  };
}

// Hook for voting on reviews
interface UseReviewVoteOptions {
  reviewId: string;
}

interface UseReviewVoteReturn {
  userVote: { isHelpful: boolean } | null;
  loading: boolean;
  error: string | null;
  vote: (isHelpful: boolean) => Promise<boolean>;
}

export function useReviewVote({ reviewId }: UseReviewVoteOptions): UseReviewVoteReturn {
  const [state, setState] = useState<{
    userVote: { isHelpful: boolean } | null;
    loading: boolean;
    error: string | null;
  }>({
    userVote: null,
    loading: true,
    error: null,
  });

  // Ref to track mounted state for safe state updates after async operations
  const mountedRef = useRef(true);

  const fetchVote = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, { signal });
      if (!res.ok) {
        throw new Error("Failed to fetch vote");
      }
      const data = await res.json();
      if (mountedRef.current) {
        setState({
          userVote: data.vote,
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
  }, [reviewId]);

  const vote = useCallback(
    async (isHelpful: boolean): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHelpful }),
        });

        if (!res.ok) {
          let errorMessage = "Failed to submit vote";
          try {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
          } catch {
            // Response wasn't JSON, use default error
          }
          throw new Error(errorMessage);
        }

        const data = await res.json();
        setState({
          userVote: { isHelpful: data.vote.isHelpful },
          loading: false,
          error: null,
        });
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
        return false;
      }
    },
    [reviewId]
  );

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    fetchVote(controller.signal);

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetchVote]);

  return {
    ...state,
    vote,
  };
}
