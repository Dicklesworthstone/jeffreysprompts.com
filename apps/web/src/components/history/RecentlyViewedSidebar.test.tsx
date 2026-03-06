/**
 * Tests for RecentlyViewedSidebar component.
 *
 * Covers: loading state, empty state, prompt entries, search entries,
 * clear history, view full history link.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecentlyViewedSidebar } from "./RecentlyViewedSidebar";
import type { ViewHistoryEntry } from "@/lib/history/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockListHistory = vi.fn();
const mockClearHistory = vi.fn();
const mockGetOrCreateLocalUserId = vi.fn();

vi.mock("@/lib/history/client", () => ({
  listHistory: (...args: unknown[]) => mockListHistory(...args),
  clearHistoryForUser: () => mockClearHistory(),
  getOrCreateLocalUserId: () => mockGetOrCreateLocalUserId(),
}));

vi.mock("@jeffreysprompts/core/prompts/registry", () => ({
  getPrompt: (id: string) => {
    if (id === "test-prompt") {
      return {
        id: "test-prompt",
        title: "Test Prompt Title",
        category: "coding",
      };
    }
    return null;
  },
}));

const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "es",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const promptEntry: ViewHistoryEntry = {
  id: "entry-1",
  userId: "user-1",
  resourceType: "prompt",
  resourceId: "test-prompt",
  searchQuery: null,
  source: null,
  viewedAt: "2026-01-15T00:00:00Z",
  duration: null,
};

const searchEntry: ViewHistoryEntry = {
  id: "entry-2",
  userId: "user-1",
  resourceType: "search",
  resourceId: null,
  searchQuery: "coding tips",
  source: null,
  viewedAt: "2026-01-15T01:00:00Z",
  duration: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecentlyViewedSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateLocalUserId.mockReturnValue("user-1");
    mockListHistory.mockResolvedValue([]);
    mockClearHistory.mockResolvedValue(undefined);
  });

  it("shows title", async () => {
    render(<RecentlyViewedSidebar />);
    expect(screen.getByText("Recently Viewed")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    // Never resolve to stay in loading
    mockListHistory.mockReturnValue(new Promise(() => {}));
    render(<RecentlyViewedSidebar />);
    expect(screen.getByText("Loading history...")).toBeInTheDocument();
  });

  it("shows empty state when no history", async () => {
    mockListHistory.mockResolvedValue([]);
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      expect(screen.getByText(/No recent activity yet/)).toBeInTheDocument();
    });
  });

  it("renders prompt entry with title from registry", async () => {
    mockListHistory.mockResolvedValue([promptEntry]);
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      expect(screen.getByText("Test Prompt Title")).toBeInTheDocument();
    });
  });

  it("renders prompt entry with link", async () => {
    mockListHistory.mockResolvedValue([promptEntry]);
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      const link = screen.getByText("Test Prompt Title").closest("a");
      expect(link).toHaveAttribute("href", "/es/prompts/test-prompt");
    });
  });

  it("renders search entry with query", async () => {
    mockListHistory.mockResolvedValue([searchEntry]);
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      expect(screen.getByText("Search: coding tips")).toBeInTheDocument();
    });
  });

  it("clears history on clear button click", async () => {
    mockListHistory.mockResolvedValue([promptEntry]);
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      expect(screen.getByText("Test Prompt Title")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Clear history"));

    await waitFor(() => {
      expect(mockClearHistory).toHaveBeenCalledTimes(1);
      expect(mockSuccess).toHaveBeenCalledWith(
        "History cleared",
        "Recently viewed items removed"
      );
    });
  });

  it("disables clear button when no items", async () => {
    mockListHistory.mockResolvedValue([]);
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      expect(screen.getByLabelText("Clear history")).toBeDisabled();
    });
  });

  it("has View full history link", async () => {
    mockListHistory.mockResolvedValue([]);
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      const link = screen.getByText("View full history").closest("a");
      expect(link).toHaveAttribute("href", "/es/history");
    });
  });

  it("shows error toast when clear fails", async () => {
    mockListHistory.mockResolvedValue([promptEntry]);
    mockClearHistory.mockRejectedValue(new Error("fail"));
    render(<RecentlyViewedSidebar />);
    await waitFor(() => {
      expect(screen.getByText("Test Prompt Title")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Clear history"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Unable to clear history",
        "Please try again later"
      );
    });
  });
});
