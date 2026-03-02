/**
 * Tests for InstallSkillButton and InstallAllSkillsButton.
 *
 * Covers: label rendering, copy on click, copied state,
 * copy failure handling, URL construction with project param, bulk install.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InstallSkillButton, InstallAllSkillsButton } from "./InstallSkillButton";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

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

const basePrompt: Prompt = {
  id: "test-skill",
  title: "Test Skill",
  description: "A skill for testing",
  category: "testing",
  tags: ["test"],
  author: "Test",
  version: "1.0.0",
  content: "Do the test.",
  featured: false,
  difficulty: "beginner",
  estimatedTokens: 50,
  created: "2026-01-01",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InstallSkillButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopy.mockResolvedValue({ success: true });
  });

  it("renders Install Skill label", () => {
    render(<InstallSkillButton prompt={basePrompt} />);
    expect(screen.getByText("Install Skill")).toBeInTheDocument();
  });

  it("copies install command on click", async () => {
    render(<InstallSkillButton prompt={basePrompt} />);

    fireEvent.click(screen.getByText("Install Skill"));

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledTimes(1);
    });

    const command = mockCopy.mock.calls[0][0] as string;
    expect(command).toContain("curl -fsSL");
    expect(command).toContain("test-skill");
    expect(command).toContain("| bash");
  });

  it("includes project param when project=true", async () => {
    render(<InstallSkillButton prompt={basePrompt} project />);

    fireEvent.click(screen.getByText("Install Skill"));

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledTimes(1);
    });

    const command = mockCopy.mock.calls[0][0] as string;
    expect(command).toContain("project=1");
  });

  it("shows Copied! state after successful copy", async () => {
    render(<InstallSkillButton prompt={basePrompt} />);

    fireEvent.click(screen.getByText("Install Skill"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("shows success toast after copy", async () => {
    render(<InstallSkillButton prompt={basePrompt} />);

    fireEvent.click(screen.getByText("Install Skill"));

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith(
        "Install command copied",
        expect.stringContaining("Test Skill"),
        expect.any(Object)
      );
    });
  });

  it("shows error toast when copy fails", async () => {
    mockCopy.mockResolvedValue({ success: false });

    render(<InstallSkillButton prompt={basePrompt} />);

    fireEvent.click(screen.getByText("Install Skill"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith("Failed to copy", "Please try again");
    });
  });

  it("shows error toast when copy throws", async () => {
    mockCopy.mockRejectedValue(new Error("clipboard error"));

    render(<InstallSkillButton prompt={basePrompt} />);

    fireEvent.click(screen.getByText("Install Skill"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith("Failed to copy", "Please try again");
    });
  });
});

describe("InstallAllSkillsButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopy.mockResolvedValue({ success: true });
  });

  it("renders Install All Skills label when no promptIds", () => {
    render(<InstallAllSkillsButton />);
    expect(screen.getByText("Install All Skills")).toBeInTheDocument();
  });

  it("renders skill count in label when promptIds given", () => {
    render(<InstallAllSkillsButton promptIds={["a", "b", "c"]} />);
    expect(screen.getByText("Install 3 Skills")).toBeInTheDocument();
  });

  it("renders singular label for single skill", () => {
    render(<InstallAllSkillsButton promptIds={["a"]} />);
    expect(screen.getByText("Install 1 Skill")).toBeInTheDocument();
  });

  it("copies command with ids param", async () => {
    render(<InstallAllSkillsButton promptIds={["foo", "bar"]} />);

    fireEvent.click(screen.getByText("Install 2 Skills"));

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledTimes(1);
    });

    const command = mockCopy.mock.calls[0][0] as string;
    expect(command).toContain("ids=foo%2Cbar");
    expect(command).toContain("curl -fsSL");
  });

  it("includes project param when project=true", async () => {
    render(<InstallAllSkillsButton promptIds={["x"]} project />);

    fireEvent.click(screen.getByText("Install 1 Skill"));

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledTimes(1);
    });

    const command = mockCopy.mock.calls[0][0] as string;
    expect(command).toContain("project=1");
  });

  it("shows Copied! state after successful copy", async () => {
    render(<InstallAllSkillsButton />);

    fireEvent.click(screen.getByText("Install All Skills"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });
});
