/**
 * Tests for ShareDialog component.
 *
 * Covers: create flow, existing share display, copy, revoke,
 * social share, password toggle, visibility toggle.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareDialog, type ShareLink } from "./ShareDialog";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: { div: (p: Record<string, unknown>) => <div {...p} /> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

const mockCopy = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopy(...args),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const existingShare: ShareLink = {
  linkCode: "abc123",
  url: "https://jeffreysprompts.com/s/abc123",
  password: null,
  isPasswordProtected: false,
  expiresAt: null,
  viewCount: 42,
  createdAt: "2026-01-01T00:00:00Z",
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  contentType: "prompt" as const,
  contentId: "idea-wizard",
  contentTitle: "The Idea Wizard",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  // --- Create flow (no existing share) ---

  it("shows create form when no existing share", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("Create Share Link")).toBeInTheDocument();
  });

  it("shows password toggle in create flow", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("Password protection")).toBeInTheDocument();
  });

  it("shows expiration selector in create flow", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("Link expiration")).toBeInTheDocument();
  });

  it("shows title and description", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText(/Share Prompt/)).toBeInTheDocument();
    expect(screen.getByText(/The Idea Wizard/)).toBeInTheDocument();
  });

  it("calls fetch when create button clicked", async () => {
    const onShareCreated = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ linkCode: "new123", url: "https://jeffreysprompts.com/s/new123", expiresAt: null }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ShareDialog {...defaultProps} onShareCreated={onShareCreated} />);

    const createBtn = screen.getByText("Create Share Link");
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/share", expect.objectContaining({ method: "POST" }));
    });
  });

  // --- Existing share ---

  it("shows share URL when existing share provided", () => {
    render(<ShareDialog {...defaultProps} existingShare={existingShare} />);
    const input = screen.getByDisplayValue("https://jeffreysprompts.com/s/abc123");
    expect(input).toBeInTheDocument();
  });

  it("shows view count for existing share", () => {
    render(<ShareDialog {...defaultProps} existingShare={existingShare} />);
    expect(screen.getByText("42 views")).toBeInTheDocument();
  });

  it("shows revoke button for existing share", () => {
    render(<ShareDialog {...defaultProps} existingShare={existingShare} />);
    expect(screen.getByText("Revoke Link")).toBeInTheDocument();
  });

  it("shows social share buttons for existing share", () => {
    render(<ShareDialog {...defaultProps} existingShare={existingShare} />);
    expect(screen.getByText("Twitter")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
  });

  it("does not show social share when no existing share", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.queryByText("Share on Social")).not.toBeInTheDocument();
  });

  // --- Copy link ---

  it("copies link when copy button clicked", async () => {
    render(<ShareDialog {...defaultProps} existingShare={existingShare} />);

    // Find the copy button (the one with the copy icon, not the "Create" button)
    const buttons = screen.getAllByRole("button");
    const copyBtn = buttons.find(btn => btn.querySelector("svg"));
    // Click the button that copies the link
    if (copyBtn) fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith("https://jeffreysprompts.com/s/abc123");
    });
  });

  // --- Revoke ---

  it("calls fetch DELETE when revoke clicked", async () => {
    const onShareRevoked = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", mockFetch);

    render(<ShareDialog {...defaultProps} existingShare={existingShare} onShareRevoked={onShareRevoked} />);

    const revokeBtn = screen.getByText("Revoke Link");
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/share/abc123",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  // --- Visibility toggle ---

  it("shows visibility toggle for prompts", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("shows public label when isPublic is true", () => {
    render(<ShareDialog {...defaultProps} isPublic={true} />);
    expect(screen.getByText("Public in Swap Meet")).toBeInTheDocument();
  });

  // --- Password protection ---

  it("shows password protected indicator when share has password", () => {
    const shareWithPassword: ShareLink = {
      ...existingShare,
      password: null,
      isPasswordProtected: true,
    };
    render(<ShareDialog {...defaultProps} existingShare={shareWithPassword} />);
    expect(screen.getByText("Password protected")).toBeInTheDocument();
  });

  it("resets create-form state when an existing protected share is cleared", () => {
    const shareWithPassword: ShareLink = {
      ...existingShare,
      password: null,
      isPasswordProtected: true,
    };

    const { rerender } = render(
      <ShareDialog {...defaultProps} existingShare={shareWithPassword} />
    );

    rerender(<ShareDialog {...defaultProps} existingShare={null} />);

    expect(screen.getByText("Create Share Link")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter a password")).not.toBeInTheDocument();
  });

  // --- Close button ---

  it("calls onOpenChange when close clicked", () => {
    const onOpenChange = vi.fn();
    render(<ShareDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
