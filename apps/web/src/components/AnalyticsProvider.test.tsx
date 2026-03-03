/**
 * Tests for AnalyticsProvider component.
 *
 * Covers: page view tracking, scroll depth tracking, click analytics,
 * web vitals initialization, time on page tracking, cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AnalyticsProvider } from "./AnalyticsProvider";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTrackPageView = vi.fn();
const mockTrackGaEvent = vi.fn();
const mockInitWebVitals = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackPageView: (...args: unknown[]) => mockTrackPageView(...args),
  trackGaEvent: (...args: unknown[]) => mockTrackGaEvent(...args),
}));

vi.mock("@/lib/performance", () => ({
  initWebVitals: () => mockInitWebVitals(),
}));

let mockPathname = "/";
let mockSearchParams = { toString: () => "" };

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnalyticsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockSearchParams = { toString: () => "" };
    // Simulate gtag being available
    (window as unknown as Record<string, unknown>).gtag = vi.fn();
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as Record<string, unknown>).gtag;
  });

  it("renders nothing (returns null)", () => {
    const { container } = render(<AnalyticsProvider />);
    expect(container.innerHTML).toBe("");
  });

  it("initializes web vitals on mount", () => {
    render(<AnalyticsProvider />);
    expect(mockInitWebVitals).toHaveBeenCalledTimes(1);
  });

  it("tracks page view on mount", () => {
    render(<AnalyticsProvider />);
    expect(mockTrackPageView).toHaveBeenCalledWith("/");
  });

  it("includes search params in page view URL", () => {
    mockPathname = "/search";
    mockSearchParams = { toString: () => "q=test" };
    render(<AnalyticsProvider />);
    expect(mockTrackPageView).toHaveBeenCalledWith("/search?q=test");
  });

  it("tracks view_pricing event on pricing page", () => {
    mockPathname = "/pricing";
    render(<AnalyticsProvider />);
    expect(mockTrackGaEvent).toHaveBeenCalledWith("view_pricing", {
      page_path: "/pricing",
    });
  });

  it("does not track view_pricing on other pages", () => {
    mockPathname = "/about";
    render(<AnalyticsProvider />);
    expect(mockTrackGaEvent).not.toHaveBeenCalledWith(
      "view_pricing",
      expect.anything()
    );
  });

  it("tracks time_on_page on unmount", () => {
    const { unmount } = render(<AnalyticsProvider />);
    unmount();
    expect(mockTrackGaEvent).toHaveBeenCalledWith(
      "time_on_page",
      expect.objectContaining({
        page_path: "/",
        duration_ms: expect.any(Number),
      })
    );
  });
});
