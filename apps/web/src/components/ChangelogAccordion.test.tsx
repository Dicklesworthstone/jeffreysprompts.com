/**
 * Tests for ChangelogAccordion component.
 *
 * Covers: empty state, collapsed rendering, expand/collapse,
 * entry display, type badges, version sorting, ARIA attributes.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChangelogAccordion } from "./ChangelogAccordion";
import type { PromptChange } from "@jeffreysprompts/core/prompts/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const changelog: PromptChange[] = [
  { version: "1.0.0", date: "2026-01-01", type: "improvement", summary: "Initial release" },
  { version: "1.1.0", date: "2026-01-15", type: "fix", summary: "Fixed edge case" },
  { version: "2.0.0", date: "2026-02-01", type: "breaking", summary: "Major rewrite" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ChangelogAccordion", () => {
  it("returns null when changelog is undefined", () => {
    const { container } = render(<ChangelogAccordion />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when changelog is empty", () => {
    const { container } = render(<ChangelogAccordion changelog={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows Changelog title", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    expect(screen.getByText("Changelog")).toBeInTheDocument();
  });

  it("shows version count badge", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    expect(screen.getByText("3 versions")).toBeInTheDocument();
  });

  it("shows singular version count for 1 entry", () => {
    render(<ChangelogAccordion changelog={[changelog[0]]} />);
    expect(screen.getByText("1 version")).toBeInTheDocument();
  });

  it("starts collapsed", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("expands when clicked", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("shows entries when expanded", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Initial release")).toBeInTheDocument();
    expect(screen.getByText("Fixed edge case")).toBeInTheDocument();
    expect(screen.getByText("Major rewrite")).toBeInTheDocument();
  });

  it("shows version numbers with v prefix", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("v2.0.0")).toBeInTheDocument();
    expect(screen.getByText("v1.1.0")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });

  it("shows type labels", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Improvement")).toBeInTheDocument();
    expect(screen.getByText("Fix")).toBeInTheDocument();
    expect(screen.getByText("Breaking")).toBeInTheDocument();
  });

  it("sorts newest version first", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    fireEvent.click(screen.getByRole("button"));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("v2.0.0");
    expect(items[1]).toHaveTextContent("v1.1.0");
    expect(items[2]).toHaveTextContent("v1.0.0");
  });

  it("collapses when clicked again", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    const button = screen.getByRole("button");

    fireEvent.click(button); // expand
    expect(button).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(button); // collapse
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("has aria-controls linking button to content", () => {
    render(<ChangelogAccordion changelog={changelog} />);
    const button = screen.getByRole("button");
    const controlsId = button.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
  });
});
