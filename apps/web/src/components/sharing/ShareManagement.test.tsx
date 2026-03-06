/**
 * Tests for ShareManagement component.
 *
 * Covers: loading state, empty state, active links display,
 * copy link, revoke link, expired links, view count, password indicator.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareManagement, type ManagedShareLink } from "./ShareManagement";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCopy = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopy(...args),
}));

const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseLink: ManagedShareLink = {
  linkCode: "abc123",
  url: "https://jeffreysprompts.com/s/abc123",
  password: null,
  isPasswordProtected: false,
  expiresAt: null,
  viewCount: 42,
  createdAt: "2026-01-15T00:00:00Z",
  contentType: "prompt",
  contentTitle: "Test Prompt",
  contentId: "test-prompt",
};

const protectedLink: ManagedShareLink = {
  ...baseLink,
  linkCode: "def456",
  url: "https://jeffreysprompts.com/s/def456",
  isPasswordProtected: true,
  contentTitle: "Protected Prompt",
};

// Use a far future date to avoid timezone-dependent expiration
const expiredLink: ManagedShareLink = {
  ...baseLink,
  linkCode: "exp789",
  url: "https://jeffreysprompts.com/s/exp789",
  expiresAt: "2020-01-01T00:00:00Z",
  contentTitle: "Expired Prompt",
};

const inactiveLink: ManagedShareLink = {
  ...baseLink,
  linkCode: "inactive123",
  url: "https://jeffreysprompts.com/s/inactive123",
  contentTitle: "Inactive Prompt",
  isActive: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ShareManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopy.mockResolvedValue({ success: true });
  });

  // --- Loading ---

  it("shows loading skeleton when isLoading", () => {
    render(<ShareManagement shareLinks={[]} isLoading={true} />);
    expect(screen.getByText("Share Links")).toBeInTheDocument();
  });

  // --- Empty state ---

  it("shows empty state when no links", () => {
    render(<ShareManagement shareLinks={[]} />);
    expect(screen.getByText("No share links yet")).toBeInTheDocument();
  });

  // --- Active links ---

  it("shows link title and content type", () => {
    render(<ShareManagement shareLinks={[baseLink]} />);
    expect(screen.getByText("Test Prompt")).toBeInTheDocument();
    expect(screen.getByText("prompt")).toBeInTheDocument();
  });

  it("shows view count", () => {
    render(<ShareManagement shareLinks={[baseLink]} />);
    expect(screen.getByText("42 views")).toBeInTheDocument();
  });

  it("shows Never expires for links without expiration", () => {
    render(<ShareManagement shareLinks={[baseLink]} />);
    expect(screen.getByText("Never expires")).toBeInTheDocument();
  });

  it("shows active count badge", () => {
    render(<ShareManagement shareLinks={[baseLink]} />);
    expect(screen.getByText("1 active")).toBeInTheDocument();
  });

  // --- Password protected ---

  it("shows Protected indicator for password-protected links", () => {
    render(<ShareManagement shareLinks={[protectedLink]} />);
    expect(screen.getByText("Protected")).toBeInTheDocument();
  });

  // --- Copy ---

  it("copies link when copy button clicked", async () => {
    render(<ShareManagement shareLinks={[baseLink]} />);

    const copyBtn = screen.getByTitle("Copy link");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith("https://jeffreysprompts.com/s/abc123");
    });
  });

  it("shows success toast after copy", async () => {
    render(<ShareManagement shareLinks={[baseLink]} />);

    fireEvent.click(screen.getByTitle("Copy link"));

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith(
        "Link copied",
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // --- Revoke ---

  it("calls onRevoke when revoke button clicked", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    render(<ShareManagement shareLinks={[baseLink]} onRevoke={onRevoke} />);

    const revokeBtn = screen.getByTitle("Revoke link");
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(onRevoke).toHaveBeenCalledWith("abc123");
    });
  });

  it("shows success toast after revoke", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    render(<ShareManagement shareLinks={[baseLink]} onRevoke={onRevoke} />);

    fireEvent.click(screen.getByTitle("Revoke link"));

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith(
        "Link revoked",
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // --- Expired links ---

  it("shows Expired Links section for expired links", () => {
    render(<ShareManagement shareLinks={[baseLink, expiredLink]} />);
    expect(screen.getByText("Expired Links")).toBeInTheDocument();
  });

  it("shows expired count in badge", () => {
    render(<ShareManagement shareLinks={[baseLink, expiredLink]} />);
    expect(screen.getByText(/1 expired/)).toBeInTheDocument();
  });

  // --- Multiple links ---

  it("renders multiple links", () => {
    render(<ShareManagement shareLinks={[baseLink, protectedLink]} />);
    expect(screen.getByText("Test Prompt")).toBeInTheDocument();
    expect(screen.getByText("Protected Prompt")).toBeInTheDocument();
    expect(screen.getByText("2 active")).toBeInTheDocument();
  });

  it("hides inactive links from the management list", () => {
    render(<ShareManagement shareLinks={[baseLink, inactiveLink]} />);

    expect(screen.getByText("Test Prompt")).toBeInTheDocument();
    expect(screen.queryByText("Inactive Prompt")).not.toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
  });
});
