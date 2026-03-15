/**
 * Tests for FeaturedPromptsSection component.
 *
 * Covers: heading, subtitle, view all link, prompt card rendering,
 * empty state (returns null), max 6 prompts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturedPromptsSection } from "./FeaturedPromptsSection";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const {
        initial,
        animate,
        exit,
        transition,
        whileInView,
        viewport,
        ...rest
      } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/hooks/use-basket", () => ({
  useBasket: () => ({
    items: [],
    addItem: vi.fn(),
  }),
}));

vi.mock("@/components/PromptCard", () => ({
  PromptCardPure: ({ prompt }: { prompt: Prompt }) => (
    <div data-testid={`prompt-card-${prompt.id}`}>{prompt.title}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makePrompt = (id: string, title: string): Prompt =>
  ({
    id,
    title,
    description: `Description for ${title}`,
    category: "ideation" as const,
    tags: [],
    author: "Test Author",
    version: "1.0.0",
    created: "2026-01-01",
    content: "test content",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    featured: true,
  }) as Prompt;

const samplePrompts = [
  makePrompt("p1", "Prompt One"),
  makePrompt("p2", "Prompt Two"),
  makePrompt("p3", "Prompt Three"),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FeaturedPromptsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading", () => {
    render(
      <FeaturedPromptsSection
        prompts={samplePrompts}
        totalCount={100}
        onPromptClick={vi.fn()}
      />
    );
    expect(
      screen.getByRole("heading", { level: 2 })
    ).toHaveTextContent("Featured Prompts");
  });

  it("shows curated by text", () => {
    render(
      <FeaturedPromptsSection
        prompts={samplePrompts}
        totalCount={100}
        onPromptClick={vi.fn()}
      />
    );
    expect(screen.getByText("Curated by the team")).toBeInTheDocument();
  });

  it("shows view all link with total count", () => {
    render(
      <FeaturedPromptsSection
        prompts={samplePrompts}
        totalCount={42}
        onPromptClick={vi.fn()}
      />
    );
    expect(screen.getByText("View all 42 prompts")).toBeInTheDocument();
  });

  it("renders prompt cards", () => {
    render(
      <FeaturedPromptsSection
        prompts={samplePrompts}
        totalCount={100}
        onPromptClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("prompt-card-p1")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-card-p2")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-card-p3")).toBeInTheDocument();
  });

  it("renders null when no prompts", () => {
    const { container } = render(
      <FeaturedPromptsSection
        prompts={[]}
        totalCount={0}
        onPromptClick={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("limits to 6 prompts", () => {
    const manyPrompts = Array.from({ length: 10 }, (_, i) =>
      makePrompt(`p${i}`, `Prompt ${i}`)
    );
    render(
      <FeaturedPromptsSection
        prompts={manyPrompts}
        totalCount={100}
        onPromptClick={vi.fn()}
      />
    );
    // Should only render 6 cards
    const cards = screen.getAllByTestId(/^prompt-card-/);
    expect(cards).toHaveLength(6);
  });
});
