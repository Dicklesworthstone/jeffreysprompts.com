import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor , fireEvent} from "@testing-library/react";
import { RatingButton } from "./RatingButton";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLProps<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock the useRating hook
const mockRate = vi.fn();
vi.mock("@/hooks/use-rating", () => ({
  useRating: () => ({
    summary: { upvotes: 10, downvotes: 2, total: 12, approvalRate: 83 },
    userRating: null,
    loading: false,
    error: null,
    rate: mockRate,
    refresh: vi.fn(),
  }),
}));

describe("RatingButton", () => {
  beforeEach(() => {
    mockRate.mockClear();
  });

  it("renders upvote and downvote buttons", () => {
    render(<RatingButton contentType="prompt" contentId="test-prompt" />);

    expect(screen.getByLabelText("Upvote")).toBeInTheDocument();
    expect(screen.getByLabelText("Downvote")).toBeInTheDocument();
  });

  it("displays vote counts when showCount is true", () => {
    render(<RatingButton contentType="prompt" contentId="test-prompt" showCount />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls rate function when upvote is clicked", async () => {
    render(<RatingButton contentType="prompt" contentId="test-prompt" />);

    const upvoteButton = screen.getByLabelText("Upvote");
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(mockRate).toHaveBeenCalledWith("up");
    });
  });

  it("calls rate function when downvote is clicked", async () => {
    render(<RatingButton contentType="prompt" contentId="test-prompt" />);

    const downvoteButton = screen.getByLabelText("Downvote");
    fireEvent.click(downvoteButton);

    await waitFor(() => {
      expect(mockRate).toHaveBeenCalledWith("down");
    });
  });

  it("applies correct size class for sm variant", () => {
    render(<RatingButton contentType="prompt" contentId="test-prompt" size="sm" />);

    const upvoteButton = screen.getByLabelText("Upvote");
    expect(upvoteButton).toHaveClass("h-8", "w-8");
  });
});
