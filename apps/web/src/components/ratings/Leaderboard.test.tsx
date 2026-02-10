import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Leaderboard } from "./Leaderboard";

vi.mock("framer-motion", () => ({
  motion: {
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: vi.fn(() => ({ entries: [], loading: true, error: null })),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import { useLeaderboard } from "@/hooks/useLeaderboard";

const mockEntries = [
  {
    prompt: { id: "p1", title: "Top Prompt", category: "automation" },
    rating: { approvalRate: 95, total: 200 },
  },
  {
    prompt: { id: "p2", title: "Second Prompt", category: "ideation" },
    rating: { approvalRate: 88, total: 150 },
  },
  {
    prompt: { id: "p3", title: "Third Prompt", category: "debugging" },
    rating: { approvalRate: 82, total: 100 },
  },
];

describe("Leaderboard", () => {
  beforeEach(() => {
    vi.mocked(useLeaderboard).mockReturnValue({
      entries: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("shows skeleton when loading", () => {
    render(<Leaderboard />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message on error", () => {
    vi.mocked(useLeaderboard).mockReturnValue({
      entries: [],
      loading: false,
      error: new Error("fail"),
      refresh: vi.fn(),
    });
    render(<Leaderboard />);
    expect(screen.getByText("Failed to load leaderboard")).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    vi.mocked(useLeaderboard).mockReturnValue({
      entries: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<Leaderboard />);
    expect(
      screen.getByText("No rated prompts yet. Be the first to rate!")
    ).toBeInTheDocument();
  });

  it("renders entries with titles and approval rates", () => {
    vi.mocked(useLeaderboard).mockReturnValue({
      entries: mockEntries as never[],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<Leaderboard />);
    expect(screen.getByText("Top Prompt")).toBeInTheDocument();
    expect(screen.getByText("Second Prompt")).toBeInTheDocument();
    expect(screen.getByText("Third Prompt")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  it("calls onPromptClick when entry is clicked", () => {
    vi.mocked(useLeaderboard).mockReturnValue({
      entries: mockEntries as never[],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const onClick = vi.fn();
    render(<Leaderboard onPromptClick={onClick} />);
    fireEvent.click(screen.getByText("Top Prompt"));
    expect(onClick).toHaveBeenCalledWith(mockEntries[0].prompt);
  });

  it("applies className", () => {
    vi.mocked(useLeaderboard).mockReturnValue({
      entries: mockEntries as never[],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    const { container } = render(<Leaderboard className="my-class" />);
    expect(container.firstElementChild?.className).toContain("my-class");
  });
});
