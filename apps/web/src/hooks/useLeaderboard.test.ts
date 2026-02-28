/**
 * Unit tests for useLeaderboard hook
 * @module hooks/useLeaderboard.test
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLeaderboard } from "./useLeaderboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockEntries = [
  {
    prompt: { id: "p1", title: "Top Prompt", slug: "top-prompt" },
    rating: { contentType: "prompt", contentId: "p1", upvotes: 10, downvotes: 0, total: 10, approvalRate: 100, lastUpdated: null },
  },
  {
    prompt: { id: "p2", title: "Good Prompt", slug: "good-prompt" },
    rating: { contentType: "prompt", contentId: "p2", upvotes: 7, downvotes: 3, total: 10, approvalRate: 70, lastUpdated: null },
  },
];

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

describe("useLeaderboard", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    // @ts-ignore
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("starts with loading state and empty entries", () => {
    // Keep request pending so this test asserts only the initial render state
    // without triggering a post-test state update warning.
    // @ts-ignore
    globalThis.fetch = vi.fn().mockImplementation(
      () => new Promise(() => undefined)
    ) as typeof fetch;
    const { result } = renderHook(() => useLeaderboard());
    expect(result.current.loading).toBe(true);
    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("fetches leaderboard on mount", async () => {
    const fetchMock = mockFetchSuccess({ entries: mockEntries, generated_at: "2026-01-15T00:00:00Z" });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.entries).toEqual(mockEntries);
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("passes default limit and minVotes params", async () => {
    const fetchMock = mockFetchSuccess({ entries: [], generated_at: "" });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    renderHook(() => useLeaderboard());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("limit=10");
    expect(url).toContain("minVotes=1");
  });

  it("passes custom limit and minVotes", async () => {
    const fetchMock = mockFetchSuccess({ entries: [], generated_at: "" });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    renderHook(() => useLeaderboard({ limit: 5, minVotes: 3 }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("limit=5");
    expect(url).toContain("minVotes=3");
  });

  it("sets error on fetch failure", async () => {
    // @ts-ignore
    globalThis.fetch = mockFetchError();

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to fetch leaderboard");
    expect(result.current.entries).toEqual([]);
  });

  it("handles network error", async () => {
    // @ts-ignore
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network down"));

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network down");
  });

  it("preserves previous entries on error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ entries: mockEntries, generated_at: "" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Oops" }),
      });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual(mockEntries);

    // Trigger refresh which will fail
    await act(async () => {
      await result.current.refresh();
    });

    // Previous entries preserved
    expect(result.current.entries).toEqual(mockEntries);
    expect(result.current.error).toBe("Failed to fetch leaderboard");
  });

  it("refresh triggers a new fetch", async () => {
    const fetchMock = mockFetchSuccess({ entries: mockEntries, generated_at: "" });
    // @ts-ignore
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    // Initial fetch + refresh
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
