/**
 * Unit tests for PromptCard component
 *
 * Tests rendering, interactions (copy, basket, click), and accessibility.
 * Philosophy: NO mocks except clipboard API - test real component behavior.
 *
 * @see @/components/PromptCard.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasketProvider } from "@/contexts/basket-context";
import { PromptCard } from "./PromptCard";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

// Mock prompt data
const mockPrompt: Prompt = {
  id: "test-prompt",
  title: "Test Prompt Title",
  description: "This is a test prompt description for testing purposes.",
  category: "ideation",
  tags: ["test", "mock", "example", "vitest", "extra-tag"],
  author: "Test Author",
  twitter: "@testauthor",
  version: "1.0.0",
  featured: false,
  difficulty: "intermediate",
  estimatedTokens: 250,
  created: "2024-01-01",
  content: "This is the prompt content. It can be quite long and detailed. ".repeat(10),
};

const featuredPrompt: Prompt = {
  ...mockPrompt,
  id: "featured-prompt",
  title: "Featured Prompt",
  featured: true,
};

const beginnerPrompt: Prompt = {
  ...mockPrompt,
  id: "beginner-prompt",
  title: "Beginner Prompt",
  difficulty: "beginner",
};

const advancedPrompt: Prompt = {
  ...mockPrompt,
  id: "advanced-prompt",
  title: "Advanced Prompt",
  difficulty: "advanced",
};

// Wrapper with BasketProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BasketProvider>{children}</BasketProvider>
);

// Mock clipboard API at module level
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

describe("PromptCard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWriteText.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders prompt title", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("Test Prompt Title")).toBeInTheDocument();
    });

    it("renders prompt description", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText(mockPrompt.description)).toBeInTheDocument();
    });

    it("renders category badge", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("ideation")).toBeInTheDocument();
    });

    it("renders tags (up to 3)", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      // Tags are now displayed without # prefix and limited to 3
      expect(screen.getByText("test")).toBeInTheDocument();
      expect(screen.getByText("mock")).toBeInTheDocument();
      expect(screen.getByText("example")).toBeInTheDocument();
      // 4th and 5th tags should be hidden, showing "+2" instead
      expect(screen.queryByText("vitest")).not.toBeInTheDocument();
      expect(screen.queryByText("extra-tag")).not.toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("renders estimated tokens when available", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("250 tokens")).toBeInTheDocument();
    });

    it("renders content preview", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      // Content should be truncated and shown
      expect(screen.getByText(/This is the prompt content/)).toBeInTheDocument();
    });
  });

  describe("featured badge", () => {
    it("shows featured badge for featured prompts", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={featuredPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("Featured")).toBeInTheDocument();
    });

    it("does not show featured badge for non-featured prompts", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      expect(screen.queryByText("Featured")).not.toBeInTheDocument();
    });
  });

  describe("difficulty indicators", () => {
    it("shows Beginner for beginner difficulty", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={beginnerPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("Beginner")).toBeInTheDocument();
    });

    it("shows Intermediate for intermediate difficulty", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("Intermediate")).toBeInTheDocument();
    });

    it("shows Advanced for advanced difficulty", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={advancedPrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    // Note: Clipboard API testing in happy-dom is limited - we verify the UI feedback instead
    it.skip("copies content to clipboard when copy button clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith(mockPrompt.content);
    });

    it("shows Copied feedback after copying", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await user.click(copyButton);

      expect(screen.getByText("Copied")).toBeInTheDocument();
    });

    it("calls onCopy callback when provided", async () => {
      const onCopy = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} onCopy={onCopy} />
        </TestWrapper>
      );

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await user.click(copyButton);

      expect(onCopy).toHaveBeenCalledWith(mockPrompt);
    });
  });

  describe("basket functionality", () => {
    it("shows Save button when not in basket", () => {
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });

    it("adds item to basket when Save clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Should now show "Added"
      expect(screen.getByRole("button", { name: /added/i })).toBeInTheDocument();
    });

    it("removes item from basket when Added clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} />
        </TestWrapper>
      );

      // Add to basket
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Now click Added to remove
      const addedButton = screen.getByRole("button", { name: /added/i });
      await user.click(addedButton);

      // Should show "Save" again
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  describe("click handling", () => {
    it("calls onClick when card is clicked", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} onClick={onClick} />
        </TestWrapper>
      );

      // Click on the title (part of the card that isn't a button)
      await user.click(screen.getByText("Test Prompt Title"));

      expect(onClick).toHaveBeenCalledWith(mockPrompt);
    });

    it("has View button that triggers onClick", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} onClick={onClick} />
        </TestWrapper>
      );

      const viewButton = screen.getByRole("button", { name: /view/i });
      await user.click(viewButton);

      expect(onClick).toHaveBeenCalledWith(mockPrompt);
    });

    it("copy button does not trigger card onClick", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} onClick={onClick} />
        </TestWrapper>
      );

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await user.click(copyButton);

      // onClick should not be called when clicking copy button
      expect(onClick).not.toHaveBeenCalled();
    });

    it("basket button does not trigger card onClick", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} onClick={onClick} />
        </TestWrapper>
      );

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // onClick should not be called when clicking save button
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("animation", () => {
    it("renders component with index prop for animation", () => {
      // framer-motion animation is applied but inline styles may not be visible in happy-dom
      // Just verify the component renders without error when index is provided
      render(
        <TestWrapper>
          <PromptCard prompt={mockPrompt} index={3} />
        </TestWrapper>
      );

      // Component should render successfully
      expect(screen.getByText("Test Prompt Title")).toBeInTheDocument();
    });
  });
});
