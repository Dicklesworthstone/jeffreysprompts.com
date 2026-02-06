import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReviews, useReviewVote } from "./use-reviews";

const mockReview = {
  id: "review:prompt:test:user-1",
  contentType: "prompt",
  contentId: "test",
  userId: "user-1",
  displayName: "TestUser",
  rating: "up",
  content: "Great prompt for testing.",
  createdAt: "2026-01-15T00:00:00Z",
  updatedAt: "2026-01-15T00:00:00Z",
  helpfulCount: 2,
  notHelpfulCount: 0,
  reported: false,
  reportInfo: null,
  authorResponse: null,
};

const mockSummary = {
  contentType: "prompt",
  contentId: "test",
  totalReviews: 1,
  averageHelpfulness: 100,
  recentReviews: 1,
};

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status = 500, body = { error: "Server error" }) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

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
    const fetchMock = mockFetchSuccess({
      reviews: [mockReview],
      summary: mockSummary,
      userReview: null,
      pagination: { total: 1, limit: 10, offset: 0, hasMore: false },
    });
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.reviews[0].id).toBe(mockReview.id);
    expect(result.current.summary?.totalReviews).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("passes sortBy parameter in fetch URL", async () => {
    const fetchMock = mockFetchSuccess({
      reviews: [],
      summary: mockSummary,
      userReview: null,
      pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
    });
    globalThis.fetch = fetchMock;

    renderHook(() =>
      useReviews({
        contentType: "prompt",
        contentId: "test",
        sortBy: "most-helpful",
      })
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("sortBy=most-helpful");
  });

  it("handles fetch error gracefully", async () => {
    globalThis.fetch = mockFetchError();

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to fetch reviews");
    expect(result.current.reviews).toHaveLength(0);
  });

  it("submits a new review", async () => {
    // First call: initial fetch; second call: POST submit
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              reviews: [],
              summary: mockSummary,
              userReview: null,
              pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            review: mockReview,
            summary: { ...mockSummary, totalReviews: 1 },
            isNew: true,
          }),
      });
    });

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let submitResult: boolean | undefined;
    await act(async () => {
      submitResult = await result.current.submitReview({
        rating: "up",
        content: "Great prompt for testing.",
      });
    });

    expect(submitResult).toBe(true);
    expect(result.current.reviews).toHaveLength(1);
    expect(result.current.userReview?.id).toBe(mockReview.id);
  });

  it("handles submit error", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              reviews: [],
              summary: mockSummary,
              userReview: null,
              pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
            }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Review too short" }),
      });
    });

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "test" })
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
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              reviews: [mockReview],
              summary: mockSummary,
              userReview: null,
              pagination: { total: 2, limit: 1, offset: 0, hasMore: true },
            }),
        });
      }
      // load more
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            reviews: [{ ...mockReview, id: "review:prompt:test:user-2", userId: "user-2" }],
            summary: mockSummary,
            userReview: null,
            pagination: { total: 2, limit: 1, offset: 1, hasMore: false },
          }),
      });
    });

    const { result } = renderHook(() =>
      useReviews({ contentType: "prompt", contentId: "test", limit: 1 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pagination.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.reviews).toHaveLength(2);
    expect(result.current.pagination.hasMore).toBe(false);
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
    globalThis.fetch = mockFetchSuccess({ vote: { isHelpful: true } });

    const { result } = renderHook(() =>
      useReviewVote({ reviewId: "review:prompt:test:user-1" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.userVote?.isHelpful).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("submits a vote", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // initial GET
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ vote: null }),
        });
      }
      // POST vote
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            vote: { isHelpful: false },
            review: mockReview,
          }),
      });
    });

    const { result } = renderHook(() =>
      useReviewVote({ reviewId: "review:prompt:test:user-1" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    let voteResult: boolean | undefined;
    await act(async () => {
      voteResult = await result.current.vote(false);
    });

    expect(voteResult).toBe(true);
    expect(result.current.userVote?.isHelpful).toBe(false);
  });

  it("handles vote error", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ vote: null }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Cannot vote on own review" }),
      });
    });

    const { result } = renderHook(() =>
      useReviewVote({ reviewId: "review:prompt:test:user-1" })
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
