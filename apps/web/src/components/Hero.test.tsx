/**
 * Tests for Hero component.
 *
 * Covers: headline, tagline, stats labels, search input,
 * category pills, search callback with debounce, form submit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Hero } from "./Hero";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

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
        whileHover,
        whileTap,
        ...rest
      } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
    p: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, ...rest } = props;
      return <p {...rest}>{children as React.ReactNode}</p>;
    },
    form: ({
      children,
      onSubmit,
      ...props
    }: Record<string, unknown> & { onSubmit?: (e: React.FormEvent) => void }) => {
      const { initial, animate, transition, ...rest } = props;
      return (
        <form onSubmit={onSubmit} {...rest}>
          {children as React.ReactNode}
        </form>
      );
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("./HeroBackground", () => ({
  HeroBackground: () => <div data-testid="hero-bg" />,
}));

vi.mock("./CharacterReveal", () => ({
  CharacterReveal: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("./AnimatedCounter", () => ({
  AnimatedCounter: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock("./MagneticButton", () => ({
  MagneticButton: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => {
    const { variant, strength, glowColor, ...htmlProps } = rest as Record<
      string,
      unknown
    >;
    return (
      <button type="button" onClick={onClick} {...htmlProps}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const categories: PromptCategory[] = ["ideation", "documentation", "automation"];

const defaultProps = {
  promptCount: 150,
  categoryCount: 12,
  categories,
  onSearch: vi.fn(),
  onCategorySelect: vi.fn(),
  selectedCategory: null as PromptCategory | null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Hero", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders headline", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByText("Jeffrey's Prompts")).toBeInTheDocument();
  });

  it("renders tagline", () => {
    render(<Hero {...defaultProps} />);
    expect(
      screen.getByText(/Battle-tested patterns for Claude/)
    ).toBeInTheDocument();
  });

  it("renders badge text", () => {
    render(<Hero {...defaultProps} />);
    expect(
      screen.getByText("Curated prompts for agentic excellence")
    ).toBeInTheDocument();
  });

  it("renders prompt count stat", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Prompts")).toBeInTheDocument();
  });

  it("renders category count stat", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("renders Free Forever stat", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Forever")).toBeInTheDocument();
  });

  it("has search input with ARIA label", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByLabelText("Search prompts")).toBeInTheDocument();
  });

  it("renders All category pill", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("renders category pills", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByText("ideation")).toBeInTheDocument();
    expect(screen.getByText("documentation")).toBeInTheDocument();
    expect(screen.getByText("automation")).toBeInTheDocument();
  });

  it("calls onCategorySelect when category pill clicked", () => {
    render(<Hero {...defaultProps} />);
    fireEvent.click(screen.getByText("ideation"));
    expect(defaultProps.onCategorySelect).toHaveBeenCalledWith("ideation");
  });

  it("calls onCategorySelect with null when All clicked", () => {
    render(<Hero {...defaultProps} />);
    fireEvent.click(screen.getByText("All"));
    expect(defaultProps.onCategorySelect).toHaveBeenCalledWith(null);
  });

  it("debounces search callback", () => {
    render(<Hero {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("Search prompts"), {
      target: { value: "test query" },
    });

    // Should not be called immediately
    expect(defaultProps.onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(defaultProps.onSearch).toHaveBeenCalledWith("test query");
  });

  it("calls onSearch immediately on form submit", () => {
    render(<Hero {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("Search prompts"), {
      target: { value: "instant" },
    });
    fireEvent.submit(screen.getByLabelText("Search prompts").closest("form")!);
    expect(defaultProps.onSearch).toHaveBeenCalledWith("instant");
  });

  it("has category group role", () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-label",
      "Filter by category"
    );
  });
});
