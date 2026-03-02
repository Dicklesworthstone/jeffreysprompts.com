import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RatingDisplay } from "./RatingDisplay";
const baseSummary = {
  contentType: "prompt" as const,
  contentId: "idea-wizard",
  lastUpdated: "2026-01-15T00:00:00Z",
  upvotes: 80,
  downvotes: 20,
  total: 100,
  approvalRate: 80,
};

vi.mock("@/hooks/use-rating", () => ({
  useRating: vi.fn(() => ({
    summary: baseSummary,
    loading: false,
    userRating: null,
    error: null,
    rate: vi.fn(),
    refresh: vi.fn(),
  })),
}));

import { useRating } from "@/hooks/use-rating";
import type { RatingSummary } from "@/lib/ratings/rating-store";

describe("RatingDisplay", () => {
  beforeEach(() => {
    vi.mocked(useRating).mockReturnValue({
      summary: baseSummary as unknown as RatingSummary,
      loading: false,
      userRating: null,
      error: null,
      rate: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("renders compact variant by default", () => {
    render(<RatingDisplay contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByRole("meter")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("(100)")).toBeInTheDocument();
  });

  it("renders detailed variant with approval bar", () => {
    render(
      <RatingDisplay contentType="prompt" contentId="idea-wizard" variant="detailed" />
    );
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("80% Approval")).toBeInTheDocument();
    expect(screen.getByText("100 votes")).toBeInTheDocument();
  });

  it("shows singular 'vote' for total of 1", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: { ...baseSummary, upvotes: 1, downvotes: 0, total: 1, approvalRate: 100 } as unknown as RatingSummary,
      loading: false,
      userRating: null,
      error: null,
      rate: vi.fn(),
      refresh: vi.fn(),
    });
    render(
      <RatingDisplay contentType="prompt" contentId="idea-wizard" variant="detailed" />
    );
    expect(screen.getByText("1 vote")).toBeInTheDocument();
  });

  it("formats large counts with k suffix", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: { ...baseSummary, upvotes: 1500, downvotes: 500, total: 2000, approvalRate: 75 } as unknown as RatingSummary,
      loading: false,
      userRating: null,
      error: null,
      rate: vi.fn(),
      refresh: vi.fn(),
    });
    render(<RatingDisplay contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByText("(2.0k)")).toBeInTheDocument();
  });

  it("returns null when loading", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: null,
      loading: true,
      userRating: null,
      error: null,
      rate: vi.fn(),
      refresh: vi.fn(),
    });
    const { container } = render(
      <RatingDisplay contentType="prompt" contentId="idea-wizard" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when total is 0", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: { ...baseSummary, upvotes: 0, downvotes: 0, total: 0, approvalRate: 0 } as unknown as RatingSummary,
      loading: false,
      userRating: null,
      error: null,
      rate: vi.fn(),
      refresh: vi.fn(),
    });
    const { container } = render(
      <RatingDisplay contentType="prompt" contentId="idea-wizard" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("applies custom className", () => {
    render(
      <RatingDisplay
        contentType="prompt"
        contentId="idea-wizard"
        className="my-custom"
      />
    );
    expect(screen.getByRole("meter").className).toContain("my-custom");
  });
});
