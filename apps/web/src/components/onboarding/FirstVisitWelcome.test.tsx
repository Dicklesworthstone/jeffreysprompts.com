/**
 * Tests for FirstVisitWelcome component.
 *
 * Covers: rendering when shown, hidden state, feature highlights,
 * dismiss callback, ARIA attributes.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FirstVisitWelcome } from "./FirstVisitWelcome";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileTap, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FirstVisitWelcome", () => {
  it("renders nothing when show is false", () => {
    const { container } = render(
      <FirstVisitWelcome show={false} onDismiss={vi.fn()} />
    );
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("renders welcome dialog when show is true", () => {
    render(<FirstVisitWelcome show={true} onDismiss={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows welcome title", () => {
    render(<FirstVisitWelcome show={true} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Welcome to Jeffrey/)).toBeInTheDocument();
  });

  it("shows feature highlights", () => {
    render(<FirstVisitWelcome show={true} onDismiss={vi.fn()} />);
    expect(screen.getByText("Quick Search")).toBeInTheDocument();
    expect(screen.getByText("Gestures")).toBeInTheDocument();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("shows feature descriptions", () => {
    render(<FirstVisitWelcome show={true} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Cmd\+K/)).toBeInTheDocument();
    expect(screen.getByText(/Swipe cards/)).toBeInTheDocument();
    expect(screen.getByText(/Press \?/)).toBeInTheDocument();
  });

  it("shows Get Started button", () => {
    render(<FirstVisitWelcome show={true} onDismiss={vi.fn()} />);
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("calls onDismiss when Get Started clicked", () => {
    const onDismiss = vi.fn();
    render(<FirstVisitWelcome show={true} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText("Get Started"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has correct ARIA attributes", () => {
    render(<FirstVisitWelcome show={true} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "welcome-title");
  });

  it("shows settings hint text", () => {
    render(<FirstVisitWelcome show={true} onDismiss={vi.fn()} />);
    expect(screen.getByText(/revisit these tips/)).toBeInTheDocument();
  });
});
