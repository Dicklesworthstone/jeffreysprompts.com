/**
 * Unit tests for useRating hook
 * @module hooks/use-rating.test
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRating } from "./use-rating";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSummary = {
  contentType: "prompt",
  contentId: "test",
  upvotes: 5,
  downvotes: 1,
  total: 6,
  approvalRate: 83,
  lastUpdated: "2026-01-15T00:00:00Z",
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useRating", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    // @ts-ignore
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("starts with loading state", () => {
    // Keep request pending so this test asserts only initial state and
    // does not trigger post-test state updates.
    // @ts-ignore
    globalThis.fetch = vi.fn().mockImplementation(
      () => new Promise(() => undefined)
    ) as typeof fetch;
    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.summary).toBeNull();
    expect(result.current.userRating).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches rating on mount", async () => {
    const fetchMock = mockFetchSuccess({ summary: mockSummary, userRating: "up" });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.summary).toEqual(mockSummary);
    expect(result.current.userRating).toBe("up");
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/api/ratings?");
    expect(fetchMock.mock.calls[0][0]).toContain("contentType=prompt");
    expect(fetchMock.mock.calls[0][0]).toContain("contentId=test");
  });

  it("sets error on fetch failure", async () => {
    // @ts-ignore
    globalThis.fetch = mockFetchError(500, { error: "Server error" });

    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to fetch rating");
  });

  it("handles network error", async () => {
    // @ts-ignore
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network failure");
  });

  it("submits a rating via rate()", async () => {
    const fetchMock = vi.fn()
      // First call: initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ summary: mockSummary, userRating: null }),
      })
      // Second call: rate POST
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            summary: { ...mockSummary, upvotes: 6, total: 7 },
            rating: { value: "up" },
          }),
      });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.rate("up");
    });

    expect(result.current.userRating).toBe("up");
    expect(result.current.summary?.upvotes).toBe(6);
    expect(result.current.error).toBeNull();

    // Verify POST was made
    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toBe("/api/ratings");
    expect(postCall[1].method).toBe("POST");
  });

  it("sets error when rate() fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ summary: mockSummary, userRating: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Already rated" }),
      });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.rate("up");
    });

    expect(result.current.error).toBe("Already rated");
  });

  it("preserves previous state on rate() error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ summary: mockSummary, userRating: "up" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Oops" }),
      });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.rate("down");
    });

    // Previous summary and userRating should be preserved
    expect(result.current.summary).toEqual(mockSummary);
    expect(result.current.userRating).toBe("up");
    expect(result.current.error).toBe("Oops");
  });

  it("refresh triggers new fetch", async () => {
    const fetchMock = mockFetchSuccess({ summary: mockSummary, userRating: null });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() =>
      useRating({ contentType: "prompt", contentId: "test" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
