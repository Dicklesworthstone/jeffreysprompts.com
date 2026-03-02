/**
 * Tests for ActiveFilterChips component.
 *
 * Covers: empty state, query chip, category chip, tag chips,
 * remove callbacks, clear all button.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActiveFilterChips } from "./ActiveFilterChips";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { layout, initial, animate, whileInView, viewport, transition, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { layout, initial, animate, exit, ...rest } = props;
      return <span {...rest}>{children as React.ReactNode}</span>;
    },
    button: ({ children, ...props }: Record<string, unknown>) => {
      const { layout, initial, animate, ...rest } = props;
      return <button {...rest}>{children as React.ReactNode}</button>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noop = vi.fn();

function renderChips(overrides: Partial<Parameters<typeof ActiveFilterChips>[0]> = {}) {
  const defaultProps = {
    query: "",
    category: null as PromptCategory | null,
    tags: [] as string[],
    onRemoveQuery: noop,
    onRemoveCategory: noop,
    onRemoveTag: noop,
    onClearAll: noop,
    ...overrides,
  };
  return render(<ActiveFilterChips {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ActiveFilterChips", () => {
  it("returns null when no filters are active", () => {
    const { container } = renderChips();
    expect(container.innerHTML).toBe("");
  });

  it("shows Active Filters label when filters present", () => {
    renderChips({ query: "hello" });
    expect(screen.getByText("Active Filters")).toBeInTheDocument();
  });

  it("shows query chip with quoted text", () => {
    renderChips({ query: "testing" });
    expect(screen.getByText('"testing"')).toBeInTheDocument();
  });

  it("shows category chip", () => {
    renderChips({ category: "coding" as PromptCategory });
    expect(screen.getByText("coding")).toBeInTheDocument();
  });

  it("shows tag chips", () => {
    renderChips({ tags: ["react", "typescript"] });
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("calls onRemoveQuery when query chip remove clicked", () => {
    const onRemoveQuery = vi.fn();
    renderChips({ query: "test", onRemoveQuery });

    const removeBtn = screen.getByLabelText("Remove search filter: test");
    fireEvent.click(removeBtn);

    expect(onRemoveQuery).toHaveBeenCalledTimes(1);
  });

  it("calls onRemoveCategory when category chip remove clicked", () => {
    const onRemoveCategory = vi.fn();
    renderChips({ category: "coding" as PromptCategory, onRemoveCategory });

    const removeBtn = screen.getByLabelText("Remove category filter: coding");
    fireEvent.click(removeBtn);

    expect(onRemoveCategory).toHaveBeenCalledTimes(1);
  });

  it("calls onRemoveTag when tag chip remove clicked", () => {
    const onRemoveTag = vi.fn();
    renderChips({ tags: ["react"], onRemoveTag });

    const removeBtn = screen.getByLabelText("Remove tag filter: react");
    fireEvent.click(removeBtn);

    expect(onRemoveTag).toHaveBeenCalledWith("react");
  });

  it("calls onClearAll when clear all clicked", () => {
    const onClearAll = vi.fn();
    renderChips({ query: "test", onClearAll });

    fireEvent.click(screen.getByText("Clear all"));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("shows all chip types at once", () => {
    renderChips({
      query: "search",
      category: "coding" as PromptCategory,
      tags: ["react", "ai"],
    });

    expect(screen.getByText('"search"')).toBeInTheDocument();
    expect(screen.getByText("coding")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("ai")).toBeInTheDocument();
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("has correct ARIA attributes", () => {
    renderChips({ query: "test" });
    const region = screen.getByRole("region");
    expect(region).toHaveAttribute("aria-label", "Active filters");
  });
});
