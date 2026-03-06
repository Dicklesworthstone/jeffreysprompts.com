import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReviews, useReviewVote } from "./use-reviews";
import {
  setFetchMock,
  mockFetchSuccess,
  mockFetchError,
  fixtures,
} from "@/test-utils/fetch-fixtures";

const {
  review: mockReview,
  reviewSummary: mockSummary,
  reviewsGetResponse,
  reviewsEmptyResponse,
  reviewSubmitResponse,
  voteResponse,
  voteNullResponse,
  voteSubmitResponse,
} = fixtures;

describe("useReviews", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("fetches reviews on mount", async () => {
    const fetchMock = mockFetchSuccess(reviewsGetResponse);
    setFetchMock(fetchMock);

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "idea-wizard" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.reviews[0].id).toBe(mockReview.id);
    expect(result.current.summary?.totalReviews).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("passes sortBy parameter in fetch URL", async () => {
    const fetchMock = mockFetchSuccess(reviewsEmptyResponse);
    setFetchMock(fetchMock);

    renderHook(() =>
      useReviews({
        contentType: "prompt",
        contentId: "idea-wizard",
        sortBy: "most-helpful",
      })
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("sortBy=most-helpful");
  });

  it("handles fetch error gracefully", async () => {
    setFetchMock(mockFetchError());

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "idea-wizard" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to fetch reviews");
    expect(result.current.reviews).toHaveLength(0);
  });

  it("submits a new review", async () => {
    let callCount = 0;
    setFetchMock(vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(reviewsEmptyResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(reviewSubmitResponse),
      });
    }));

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "idea-wizard" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let submitResult: boolean | undefined;
    await act(async () => {
      submitResult = await result.current.submitReview({
        rating: "up",
        content: "Great prompt for brainstorming product ideas.",
      });
    });

    expect(submitResult).toBe(true);
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.userReview?.id).toBe(mockReview.id);
  });

  it("handles submit error", async () => {
    let callCount = 0;
    setFetchMock(vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(reviewsEmptyResponse),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Review too short" }),
      });
    }));

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "idea-wizard" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let submitResult: boolean | undefined;
    await act(async () => {
      submitResult = await result.current.submitReview({
        rating: "up",
        content: "Short",
      });
    });

    expect(submitResult).toBe(false);
    expect(result.current.error).toBe("Review too short");
  });

  it("loads more reviews with pagination", async () => {
    const page1Response = {
      ...reviewsGetResponse,
      pagination: { total: 2, limit: 1, offset: 0, hasMore: true },
    };
    const page2Response = {
      reviews: [{ ...mockReview, id: "review:prompt:idea-wizard:user-2", userId: "user-2" }],
      summary: mockSummary,
      userReview: null,
      pagination: { total: 2, limit: 1, offset: 1, hasMore: false },
    };

    let callCount = 0;
    setFetchMock(vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(page1Response),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(page2Response),
      });
    }));

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "idea-wizard", limit: 1 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pagination.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.reviews).toHaveLength(2);
    expect(result.current.pagination.hasMore).toBe(false);
  });

  it("updates summary after deleting the current user's review", async () => {
    const initialResponse = {
      ...reviewsGetResponse,
      reviews: [mockReview],
      userReview: mockReview,
      summary: mockSummary,
      pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
    };
    const deleteResponse = {
      success: true,
      summary: {
        ...mockSummary,
        totalReviews: 0,
        averageHelpfulness: 0,
        recentReviews: 0,
      },
    };

    let callCount = 0;
    setFetchMock(vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(deleteResponse),
      });
    }));

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "idea-wizard" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let deleteResult: boolean | undefined;
    await act(async () => {
      deleteResult = await result.current.deleteReview();
    });

    expect(deleteResult).toBe(true);
    expect(result.current.userReview).toBeNull();
    expect(result.current.reviews).toHaveLength(0);
    expect(result.current.summary?.totalReviews).toBe(0);
  });

  it("restores pagination offset after deleting a newly submitted review", async () => {
    const initialResponse = {
      reviews: [],
      summary: {
        ...mockSummary,
        totalReviews: 15,
      },
      userReview: null,
      pagination: { total: 15, limit: 10, offset: 0, hasMore: true },
    };
    const submitResponse = {
      ...reviewSubmitResponse,
      summary: {
        ...mockSummary,
        totalReviews: 16,
      },
      isNew: true,
    };
    const deleteResponse = {
      success: true,
      summary: {
        ...mockSummary,
        totalReviews: 15,
      },
    };

    let callCount = 0;
    setFetchMock(vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialResponse),
        });
      }
      if (callCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(submitResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(deleteResponse),
      });
    }));

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "idea-wizard" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitReview({
        rating: "up",
        content: "Great prompt for brainstorming product ideas.",
      });
    });

    expect(result.current.pagination.offset).toBe(1);

    await act(async () => {
      await result.current.deleteReview();
    });

    expect(result.current.pagination.offset).toBe(0);
  });
});

describe("useReviewVote", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("fetches existing vote on mount", async () => {
    setFetchMock(mockFetchSuccess(voteResponse));

    const { result } = renderHook(() =>
      useReviewVote({ reviewId: "review:prompt:idea-wizard:user-1" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.userVote?.isHelpful).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("submits a vote", async () => {
    let callCount = 0;
    setFetchMock(vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(voteNullResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(voteSubmitResponse),
      });
    }));

    const { result } = renderHook(() =>
      useReviewVote({ reviewId: "review:prompt:idea-wizard:user-1" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let voteResult: boolean | undefined;
    await act(async () => {
      voteResult = await result.current.vote(false);
    });

    expect(voteResult).toBe(true);
    expect(result.current.userVote?.isHelpful).toBe(false);
    expect(result.current.review?.notHelpfulCount).toBe(1);
  });

  it("handles vote error", async () => {
    let callCount = 0;
    setFetchMock(vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(voteNullResponse),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Cannot vote on own review" }),
      });
    }));

    const { result } = renderHook(() =>
      useReviewVote({ reviewId: "review:prompt:idea-wizard:user-1" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let voteResult: boolean | undefined;
    await act(async () => {
      voteResult = await result.current.vote(true);
    });

    expect(voteResult).toBe(false);
    expect(result.current.error).toBe("Cannot vote on own review");
  });
});
