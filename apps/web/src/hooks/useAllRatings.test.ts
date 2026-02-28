/**
 * Tests for useAllRatings hook — bulk rating fetching
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { useAllRatings } from "./useAllRatings";

const mockSummaries = {
  "prompt-1": { contentType: "prompt", contentId: "prompt-1", upvotes: 10, downvotes: 2, total: 12, approvalRate: 83, lastUpdated: null },
  "prompt-2": { contentType: "prompt", contentId: "prompt-2", upvotes: 5, downvotes: 1, total: 6, approvalRate: 83, lastUpdated: null },
};

describe("useAllRatings", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("starts in loading state", () => {
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {})) as typeof fetch;
    const { result } = renderHook(() => useAllRatings());
    expect(result.current.loading).toBe(true);
    expect(result.current.summaries).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it("fetches ratings on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summaries: mockSummaries, generated_at: "2026-01-15T00:00:00Z" }),
    });
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useAllRatings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summaries).toEqual(mockSummaries);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBe("2026-01-15T00:00:00Z");
  });

  it("calls correct API endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summaries: {}, generated_at: "" }),
    });
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = fetchMock;

    renderHook(() => useAllRatings());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/ratings/summaries");
  });

  it("handles fetch error", async () => {
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as typeof fetch;

    const { result } = renderHook(() => useAllRatings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to fetch ratings");
  });

  it("handles network error", async () => {
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAllRatings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
  });

  it("getRating returns summary for known content", async () => {
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summaries: mockSummaries, generated_at: "" }),
    });

    const { result } = renderHook(() => useAllRatings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getRating("prompt-1")).toEqual(mockSummaries["prompt-1"]);
  });

  it("getRating returns null for unknown content", async () => {
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summaries: mockSummaries, generated_at: "" }),
    });

    const { result } = renderHook(() => useAllRatings());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getRating("nonexistent")).toBeNull();
  });

  it("refresh triggers a new fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summaries: mockSummaries, generated_at: "" }),
    });
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useAllRatings());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
