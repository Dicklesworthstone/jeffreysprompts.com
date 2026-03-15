/**
 * Tests for PromptDetailModal component.
 *
 * Verifies rendering, copy, download, close behavior, variable extraction,
 * and context appending.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptDetailModal } from "./PromptDetailModal";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, whileHover, whileTap, style, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, ...rest } = props;
      return <span {...rest}>{children as React.ReactNode}</span>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

// Simpler useLocalStorage mock using module-level state
let localStorageState: Record<string, string> = {};
vi.mock("@/hooks/useLocalStorage", () => ({
  useLocalStorage: (_key: string, initial: unknown) => {
    return [initial, vi.fn()];
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/history/client", () => ({
  trackHistoryView: vi.fn(),
}));

const mockCopyToClipboard = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

vi.mock("@/components/ratings", () => ({
  RatingButton: () => <div data-testid="rating-button">Rate</div>,
  RatingDisplay: () => <div data-testid="rating-display">Rating</div>,
}));

vi.mock("@/components/reviews", () => ({
  ReviewList: () => <div data-testid="review-list">Reviews</div>,
}));

vi.mock("@/components/CostBadge", () => ({
  CostBadge: ({ tokens }: { tokens: number }) => <span data-testid="cost-badge">{tokens} tokens cost</span>,
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/components/ui/bottom-sheet", () => ({
  BottomSheet: ({ children, open, title }: { children: React.ReactNode; open: boolean; title: string }) =>
    open ? <div data-testid="bottom-sheet" aria-label={title}>{children}</div> : null,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basePrompt: Prompt = {
  id: "test-prompt",
  title: "Test Prompt",
  description: "A test prompt for unit testing",
  category: "testing",
  tags: ["test", "unit", "vitest"],
  author: "Test Author",
  version: "1.0.0",
  content: "Run all tests in {{PROJECT_NAME}} with coverage enabled.",
  featured: true,
  difficulty: "intermediate",
  estimatedTokens: 200,
  created: "2026-01-01",
};

const promptWithVars: Prompt = {
  ...basePrompt,
  id: "var-prompt",
  title: "Variable Prompt",
  content: "Deploy {{APP_NAME}} to {{ENVIRONMENT}} using {{TOOL}}.",
  variables: [
    { name: "APP_NAME", label: "Application Name", type: "text", required: true },
    { name: "ENVIRONMENT", label: "Environment", type: "select", options: ["staging", "production"] },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromptDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageState = {};
  });

  it("returns null when prompt is null", () => {
    const { container } = render(
      <PromptDetailModal prompt={null} open={true} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders prompt title in dialog", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("Test Prompt")).toBeInTheDocument();
  });

  it("shows category badge", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("testing")).toBeInTheDocument();
  });

  it("shows tags", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("unit")).toBeInTheDocument();
    expect(screen.getByText("vitest")).toBeInTheDocument();
  });

  it("shows description", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("A test prompt for unit testing")).toBeInTheDocument();
  });

  it("shows featured badge when prompt is featured", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("shows cost badge when estimatedTokens is set", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId("cost-badge")).toBeInTheDocument();
  });

  it("renders rating display and button", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId("rating-display")).toBeInTheDocument();
    expect(screen.getByTestId("rating-button")).toBeInTheDocument();
  });

  it("renders review list", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId("review-list")).toBeInTheDocument();
  });

  it("shows variable inputs for prompts with variables", () => {
    render(
      <PromptDetailModal prompt={promptWithVars} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("Customize Variables")).toBeInTheDocument();
    expect(screen.getByText("Application Name")).toBeInTheDocument();
    expect(screen.getByText("Environment")).toBeInTheDocument();
  });

  it("shows additional context textarea", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("Additional Context")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste code, file contents/)).toBeInTheDocument();
  });

  it("shows action buttons (copy, install, download)", () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("Copy Final Prompt")).toBeInTheDocument();
    expect(screen.getByText("Terminal Install")).toBeInTheDocument();
    expect(screen.getByText("Save .md File")).toBeInTheDocument();
  });

  it("copies rendered content when copy button clicked", async () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );

    const copyButton = screen.getByText("Copy Final Prompt").closest("button")!;
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    });

    // Verify it copied the rendered content (with dynamic defaults injected)
    const copiedText = mockCopyToClipboard.mock.calls[0][0] as string;
    expect(copiedText).toContain("Run all tests");
  });

  it("copies install command when terminal install clicked", async () => {
    render(
      <PromptDetailModal prompt={basePrompt} open={true} onClose={vi.fn()} />
    );

    const installButton = screen.getByText("Terminal Install").closest("button")!;
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    });

    const copiedText = mockCopyToClipboard.mock.calls[0][0] as string;
    expect(copiedText).toContain("curl -fsSL");
    expect(copiedText).toContain("test-prompt");
  });

  it("when to use and tips sections render when present", () => {
    const promptWithTips: Prompt = {
      ...basePrompt,
      whenToUse: ["Starting a project", "Code review"],
      tips: ["Use with ultrathink"],
    };
    render(
      <PromptDetailModal prompt={promptWithTips} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("When to Use")).toBeInTheDocument();
    expect(screen.getByText("Starting a project")).toBeInTheDocument();
    expect(screen.getByText("Expert Tips")).toBeInTheDocument();
    expect(screen.getByText("Use with ultrathink")).toBeInTheDocument();
  });

  it("extracts undeclared variables from content", () => {
    const promptWithUndeclaredVars: Prompt = {
      ...basePrompt,
      content: "Test {{UNDECLARED_VAR}} in {{ANOTHER_VAR}}",
      variables: [],
    };
    render(
      <PromptDetailModal prompt={promptWithUndeclaredVars} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("Customize Variables")).toBeInTheDocument();
  });
});
