import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RatingDisplay } from "./RatingDisplay";

const mockSummary = {
  upvotes: 80,
  downvotes: 20,
  total: 100,
  approvalRate: 80,
};

vi.mock("@/hooks/use-rating", () => ({
  useRating: vi.fn(() => ({ summary: mockSummary as any, loading: false })),
}));

import { useRating } from "@/hooks/use-rating";

describe("RatingDisplay", () => {
  beforeEach(() => {
    vi.mocked(useRating).mockReturnValue({
      summary: mockSummary as any,
      loading: false, userRating: null, error: null,
      
      rate: vi.fn(), refresh: vi.fn(),
      
    });
  });

  it("renders compact variant by default", () => {
    render(<RatingDisplay contentType="prompt" contentId="test-1" />);
    expect(screen.getByRole("meter")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("(100)")).toBeInTheDocument();
  });

  it("renders detailed variant with approval bar", () => {
    render(
      <RatingDisplay contentType="prompt" contentId="test-1" variant="detailed" />
    );
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("80% Approval")).toBeInTheDocument();
    expect(screen.getByText("100 votes")).toBeInTheDocument();
  });

  it("shows singular 'vote' for total of 1", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: { contentType: "prompt", contentId: "test", lastUpdated: "2024", upvotes: 1, downvotes: 0, total: 1, approvalRate: 100 },
      loading: false, userRating: null, error: null,
      
      rate: vi.fn(), refresh: vi.fn(),
      
    });
    render(
      <RatingDisplay contentType="prompt" contentId="test-1" variant="detailed" />
    );
    expect(screen.getByText("1 vote")).toBeInTheDocument();
  });

  it("formats large counts with k suffix", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: { contentType: "prompt", contentId: "test", lastUpdated: "2024", upvotes: 1500, downvotes: 500, total: 2000, approvalRate: 75 },
      loading: false, userRating: null, error: null,
      
      rate: vi.fn(), refresh: vi.fn(),
      
    });
    render(<RatingDisplay contentType="prompt" contentId="test-1" />);
    expect(screen.getByText("(2.0k)")).toBeInTheDocument();
  });

  it("returns null when loading", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: null,
      loading: true, userRating: null, error: null,
      
      rate: vi.fn(), refresh: vi.fn(),
      
    });
    const { container } = render(
      <RatingDisplay contentType="prompt" contentId="test-1" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when total is 0", () => {
    vi.mocked(useRating).mockReturnValue({
      summary: { contentType: "prompt", contentId: "test", lastUpdated: "2024", upvotes: 0, downvotes: 0, total: 0, approvalRate: 0 },
      loading: false, userRating: null, error: null,
      
      rate: vi.fn(), refresh: vi.fn(),
      
    });
    const { container } = render(
      <RatingDisplay contentType="prompt" contentId="test-1" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("applies custom className", () => {
    render(
      <RatingDisplay
        contentType="prompt"
        contentId="test-1"
        className="my-custom"
      />
    );
    expect(screen.getByRole("meter").className).toContain("my-custom");
  });
});
