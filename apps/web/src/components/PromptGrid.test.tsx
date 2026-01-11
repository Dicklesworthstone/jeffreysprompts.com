/**
 * Unit tests for PromptGrid component
 *
 * Tests rendering states (loading, empty, populated), grid layout,
 * and callback propagation to child PromptCards.
 * Philosophy: NO mocks except clipboard API - test real component behavior.
 *
 * @see @/components/PromptGrid.tsx
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasketProvider } from "@/contexts/basket-context";
import { PromptGrid } from "./PromptGrid";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

// Mock prompt data
const createMockPrompt = (overrides: Partial<Prompt> = {}): Prompt => ({
  id: `test-prompt-${Math.random().toString(36).slice(2)}`,
  title: "Test Prompt Title",
  description: "This is a test prompt description for testing purposes.",
  category: "ideation",
  tags: ["test", "mock"],
  author: "Test Author",
  twitter: "@testauthor",
  version: "1.0.0",
  featured: false,
  difficulty: "intermediate",
  estimatedTokens: 250,
  created: "2024-01-01",
  content: "This is the prompt content.",
  ...overrides,
});

const mockPrompts: Prompt[] = [
  createMockPrompt({ id: "prompt-1", title: "First Prompt", category: "ideation" }),
  createMockPrompt({ id: "prompt-2", title: "Second Prompt", category: "automation" }),
  createMockPrompt({ id: "prompt-3", title: "Third Prompt", category: "testing" }),
];

// Wrapper with BasketProvider (required by PromptCard)
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

describe("PromptGrid", () => {
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

  describe("loading state", () => {
    it("renders skeleton cards when loading", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={[]} loading={true} />
        </TestWrapper>
      );

      // Should render 6 skeleton cards (via PromptCardSkeleton)
      // Skeletons contain Skeleton components which render divs
      const gridContainer = document.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer?.children.length).toBe(6);
    });

    it("does not render prompts when loading", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} loading={true} />
        </TestWrapper>
      );

      // Prompt titles should not be visible
      expect(screen.queryByText("First Prompt")).not.toBeInTheDocument();
      expect(screen.queryByText("Second Prompt")).not.toBeInTheDocument();
      expect(screen.queryByText("Third Prompt")).not.toBeInTheDocument();
    });

    it("renders grid layout for skeletons", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={[]} loading={true} />
        </TestWrapper>
      );

      const grid = document.querySelector(".grid");
      expect(grid).toHaveClass("sm:grid-cols-2", "lg:grid-cols-3");
    });
  });

  describe("empty state", () => {
    it("renders empty state when no prompts provided", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={[]} />
        </TestWrapper>
      );

      expect(screen.getByText("No prompts found")).toBeInTheDocument();
      expect(screen.getByText("Try adjusting your search or filters")).toBeInTheDocument();
    });

    it("does not render grid when empty", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={[]} />
        </TestWrapper>
      );

      // Should not have a grid element when empty
      const grid = document.querySelector(".grid");
      expect(grid).not.toBeInTheDocument();
    });

    it("centers empty state text", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={[]} />
        </TestWrapper>
      );

      // The parent container div has text-center class
      const emptyText = screen.getByText("No prompts found");
      const emptyContainer = emptyText.parentElement;
      expect(emptyContainer).toHaveClass("text-center");
    });
  });

  describe("populated state", () => {
    it("renders all prompts", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} />
        </TestWrapper>
      );

      expect(screen.getByText("First Prompt")).toBeInTheDocument();
      expect(screen.getByText("Second Prompt")).toBeInTheDocument();
      expect(screen.getByText("Third Prompt")).toBeInTheDocument();
    });

    it("renders correct number of prompt cards", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} />
        </TestWrapper>
      );

      const grid = document.querySelector(".grid");
      expect(grid?.children.length).toBe(3);
    });

    it("renders responsive grid layout", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} />
        </TestWrapper>
      );

      const grid = document.querySelector(".grid");
      expect(grid).toHaveClass("gap-6", "sm:grid-cols-2", "lg:grid-cols-3");
    });

    it("renders prompts in order", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} />
        </TestWrapper>
      );

      const titles = screen.getAllByRole("heading", { level: 3 });
      expect(titles[0]).toHaveTextContent("First Prompt");
      expect(titles[1]).toHaveTextContent("Second Prompt");
      expect(titles[2]).toHaveTextContent("Third Prompt");
    });
  });

  describe("callback propagation", () => {
    it("passes onPromptCopy to child cards", async () => {
      const onPromptCopy = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} onPromptCopy={onPromptCopy} />
        </TestWrapper>
      );

      // Find the first copy button and click it
      const copyButtons = screen.getAllByRole("button", { name: /copy/i });
      await user.click(copyButtons[0]);

      expect(onPromptCopy).toHaveBeenCalledWith(mockPrompts[0]);
    });

    it("passes onPromptClick to child cards", async () => {
      const onPromptClick = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} onPromptClick={onPromptClick} />
        </TestWrapper>
      );

      // Click on a prompt title to trigger onClick
      await user.click(screen.getByText("First Prompt"));

      expect(onPromptClick).toHaveBeenCalledWith(mockPrompts[0]);
    });

    it("calls correct callback for each card", async () => {
      const onPromptClick = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} onPromptClick={onPromptClick} />
        </TestWrapper>
      );

      // Click on different prompts
      await user.click(screen.getByText("Third Prompt"));
      expect(onPromptClick).toHaveBeenCalledWith(mockPrompts[2]);

      onPromptClick.mockClear();
      await user.click(screen.getByText("Second Prompt"));
      expect(onPromptClick).toHaveBeenCalledWith(mockPrompts[1]);
    });
  });

  describe("single prompt", () => {
    it("renders single prompt correctly", () => {
      const singlePrompt = [mockPrompts[0]];
      render(
        <TestWrapper>
          <PromptGrid prompts={singlePrompt} />
        </TestWrapper>
      );

      expect(screen.getByText("First Prompt")).toBeInTheDocument();
      const grid = document.querySelector(".grid");
      expect(grid?.children.length).toBe(1);
    });
  });

  describe("many prompts", () => {
    it("renders many prompts without issue", () => {
      const manyPrompts = Array.from({ length: 20 }, (_, i) =>
        createMockPrompt({ id: `prompt-${i}`, title: `Prompt ${i + 1}` })
      );

      render(
        <TestWrapper>
          <PromptGrid prompts={manyPrompts} />
        </TestWrapper>
      );

      const grid = document.querySelector(".grid");
      expect(grid?.children.length).toBe(20);
      expect(screen.getByText("Prompt 1")).toBeInTheDocument();
      expect(screen.getByText("Prompt 20")).toBeInTheDocument();
    });
  });

  describe("loading prop defaults", () => {
    it("defaults loading to false", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} />
        </TestWrapper>
      );

      // Should render actual prompts, not skeletons
      expect(screen.getByText("First Prompt")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("grid is accessible for screen readers", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} />
        </TestWrapper>
      );

      // Each card should have proper heading structure
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings.length).toBe(3);
    });

    it("empty state has accessible text", () => {
      render(
        <TestWrapper>
          <PromptGrid prompts={[]} />
        </TestWrapper>
      );

      // Text should be visible and readable
      expect(screen.getByText("No prompts found")).toBeVisible();
      expect(screen.getByText("Try adjusting your search or filters")).toBeVisible();
    });
  });

  describe("state transitions", () => {
    it("transitions from loading to populated", () => {
      const { rerender } = render(
        <TestWrapper>
          <PromptGrid prompts={[]} loading={true} />
        </TestWrapper>
      );

      // Initially loading
      expect(screen.queryByText("First Prompt")).not.toBeInTheDocument();

      // Rerender with data
      rerender(
        <TestWrapper>
          <PromptGrid prompts={mockPrompts} loading={false} />
        </TestWrapper>
      );

      expect(screen.getByText("First Prompt")).toBeInTheDocument();
    });

    it("transitions from loading to empty", () => {
      const { rerender } = render(
        <TestWrapper>
          <PromptGrid prompts={[]} loading={true} />
        </TestWrapper>
      );

      // Initially loading
      const grid = document.querySelector(".grid");
      expect(grid?.children.length).toBe(6);

      // Rerender with empty data
      rerender(
        <TestWrapper>
          <PromptGrid prompts={[]} loading={false} />
        </TestWrapper>
      );

      expect(screen.getByText("No prompts found")).toBeInTheDocument();
    });
  });
});
