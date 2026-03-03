/**
 * Tests for FloatingActionButton component.
 *
 * Covers: ARIA labels, toggle behavior, action callbacks,
 * hidden prop, custom actions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloatingActionButton } from "./FloatingActionButton";

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
        whileHover,
        whileTap,
        style,
        ...rest
      } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
    button: ({
      children,
      onClick,
      ...props
    }: Record<string, unknown> & { onClick?: () => void }) => {
      const {
        initial,
        animate,
        exit,
        transition,
        whileTap,
        whileHover,
        style,
        ...rest
      } = props;
      return (
        <button type="button" onClick={onClick} {...rest}>
          {children as React.ReactNode}
        </button>
      );
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <span {...rest}>{children as React.ReactNode}</span>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

let mockIsMobile = true;
vi.mock("@/hooks/useIsMobile", () => ({
  useIsSmallScreen: () => mockIsMobile,
}));

vi.mock("@/hooks/useHaptic", () => ({
  useHaptic: () => ({
    light: vi.fn(),
    medium: vi.fn(),
    heavy: vi.fn(),
    success: vi.fn(),
    trigger: vi.fn(),
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) =>
    classes.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FloatingActionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = true;
  });

  it("renders main FAB button with ARIA label", () => {
    render(<FloatingActionButton />);
    expect(screen.getByLabelText("Open quick actions")).toBeInTheDocument();
  });

  it("returns null on desktop", () => {
    mockIsMobile = false;
    const { container } = render(<FloatingActionButton />);
    expect(container.innerHTML).toBe("");
  });

  it("toggles ARIA label on expand", () => {
    render(<FloatingActionButton />);
    const button = screen.getByLabelText("Open quick actions");
    fireEvent.click(button);
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
  });

  it("sets aria-expanded on toggle", () => {
    render(<FloatingActionButton />);
    const button = screen.getByLabelText("Open quick actions");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(screen.getByLabelText("Close menu")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("shows default action labels when expanded", () => {
    render(<FloatingActionButton />);
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Basket")).toBeInTheDocument();
  });

  it("renders custom actions", () => {
    const actions = [
      { id: "test", icon: <span>T</span>, label: "Test Action", onClick: vi.fn() },
    ];
    render(<FloatingActionButton actions={actions} />);
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    expect(screen.getByText("Test Action")).toBeInTheDocument();
  });

  it("calls action onClick when action clicked", () => {
    const onClick = vi.fn();
    const actions = [
      { id: "test", icon: <span>T</span>, label: "Do it", onClick },
    ];
    render(<FloatingActionButton actions={actions} />);
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    fireEvent.click(screen.getByText("Do it").closest("button")!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("collapses after action click", () => {
    const actions = [
      { id: "test", icon: <span>T</span>, label: "Do it", onClick: vi.fn() },
    ];
    render(<FloatingActionButton actions={actions} />);
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    fireEvent.click(screen.getByText("Do it").closest("button")!);
    // After action click, should be collapsed (Open quick actions label)
    expect(screen.getByLabelText("Open quick actions")).toBeInTheDocument();
  });

  it("calls onPress when no actions provided", () => {
    const onPress = vi.fn();
    render(<FloatingActionButton actions={[]} onPress={onPress} />);
    fireEvent.click(screen.getByLabelText("Open quick actions"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
