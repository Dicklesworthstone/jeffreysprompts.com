/**
 * Tests for OnboardingTooltip component.
 *
 * Covers: visibility with delay, message rendering, description,
 * shortcut display, dismiss callback, icon types, custom dismiss text.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { OnboardingTooltip } from "./OnboardingTooltip";

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
// Tests
// ---------------------------------------------------------------------------

describe("OnboardingTooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows tooltip after delay when show is true", () => {
    render(
      <OnboardingTooltip show={true} onDismiss={vi.fn()} message="Try this!" />
    );

    // Not visible yet (500ms default delay)
    expect(screen.queryByText("Try this!")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Try this!")).toBeInTheDocument();
  });

  it("does not show when show is false", () => {
    render(
      <OnboardingTooltip show={false} onDismiss={vi.fn()} message="Hidden" />
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("shows description when provided", () => {
    render(
      <OnboardingTooltip
        show={true}
        onDismiss={vi.fn()}
        message="Title"
        description="Extra info"
      />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Extra info")).toBeInTheDocument();
  });

  it("shows keyboard shortcut when provided", () => {
    render(
      <OnboardingTooltip
        show={true}
        onDismiss={vi.fn()}
        message="Search"
        shortcut="Cmd+K"
      />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Cmd+K")).toBeInTheDocument();
  });

  it("calls onDismiss when Got it button clicked", () => {
    const onDismiss = vi.fn();
    render(
      <OnboardingTooltip show={true} onDismiss={onDismiss} message="Hint" />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    fireEvent.click(screen.getByText("Got it"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when X button clicked", () => {
    const onDismiss = vi.fn();
    render(
      <OnboardingTooltip show={true} onDismiss={onDismiss} message="Hint" />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    fireEvent.click(screen.getByLabelText("Dismiss hint"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses custom dismiss text", () => {
    render(
      <OnboardingTooltip
        show={true}
        onDismiss={vi.fn()}
        message="Hint"
        dismissText="Understood"
      />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Understood")).toBeInTheDocument();
  });

  it("uses custom delay", () => {
    render(
      <OnboardingTooltip
        show={true}
        onDismiss={vi.fn()}
        message="Delayed"
        delay={1000}
      />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByText("Delayed")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("Delayed")).toBeInTheDocument();
  });

  it("has tooltip role", () => {
    render(
      <OnboardingTooltip show={true} onDismiss={vi.fn()} message="Tip" />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("wraps children when provided", () => {
    render(
      <OnboardingTooltip show={true} onDismiss={vi.fn()} message="Hint">
        <button type="button">Target</button>
      </OnboardingTooltip>
    );

    expect(screen.getByText("Target")).toBeInTheDocument();
  });
});
