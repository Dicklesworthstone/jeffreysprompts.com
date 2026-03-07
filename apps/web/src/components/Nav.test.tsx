/**
 * Tests for Nav component.
 *
 * Covers: logo, nav links, search button, basket button with count,
 * mobile menu button ARIA, Login link, Go Pro button.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "./Nav";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("./ViewTransitionLink", () => ({
  ViewTransitionLink: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("./theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("./LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock("./BasketSidebar", () => ({
  BasketSidebar: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="basket-sidebar" data-open={isOpen} />
  ),
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
    const htmlProps = { ...(rest as Record<string, unknown>) };
    delete htmlProps.glowColor;
    delete htmlProps.strength;
    return (
      <button type="button" onClick={onClick} {...htmlProps}>
        {children}
      </button>
    );
  },
}));

vi.mock("./ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => {
    const htmlProps = { ...(rest as Record<string, unknown>) };
    delete htmlProps.asChild;
    delete htmlProps.variant;
    delete htmlProps.size;
    return (
      <button type="button" onClick={onClick} {...htmlProps}>
        {children}
      </button>
    );
  },
}));

vi.mock("./ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function omitMotionProps(props: Record<string, unknown>) {
  const nextProps = { ...props };
  delete nextProps.initial;
  delete nextProps.animate;
  delete nextProps.exit;
  delete nextProps.transition;
  delete nextProps.whileHover;
  delete nextProps.whileTap;
  delete nextProps.layoutId;
  delete nextProps.layout;
  return nextProps;
}

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      return <div {...omitMotionProps(props)}>{children as React.ReactNode}</div>;
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      return <span {...omitMotionProps(props)}>{children as React.ReactNode}</span>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

let mockBasketItems: string[] = [];
vi.mock("@/hooks/use-basket", () => ({
  useBasket: () => ({
    items: mockBasketItems,
    addItem: vi.fn(),
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockBasketItems = [];
  });

  it("renders logo with JFP text", () => {
    render(<Nav />);
    expect(screen.getByText("JFP")).toBeInTheDocument();
  });

  it("renders desktop nav links", () => {
    render(<Nav />);
    expect(screen.getAllByText("Browse").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bundles").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pricing").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Contribute").length).toBeGreaterThanOrEqual(1);
  });

  it("has search button with ARIA label", () => {
    render(<Nav />);
    expect(screen.getByLabelText("Search prompts (Cmd+K)")).toBeInTheDocument();
  });

  it("has basket button with item count in ARIA label", () => {
    mockBasketItems = ["p1", "p2"];
    render(<Nav />);
    expect(screen.getByLabelText("Open basket (2 items)")).toBeInTheDocument();
  });

  it("shows basket count badge when items exist", () => {
    mockBasketItems = ["p1", "p2", "p3"];
    render(<Nav />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows 9+ for more than 9 basket items", () => {
    mockBasketItems = Array.from({ length: 10 }, (_, i) => `p${i}`);
    render(<Nav />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("has mobile menu button with ARIA label", () => {
    render(<Nav />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("renders Login link", () => {
    render(<Nav />);
    expect(screen.getAllByText("Login").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Go Pro button", () => {
    render(<Nav />);
    expect(screen.getAllByText("Go Pro").length).toBeGreaterThanOrEqual(1);
  });

  it("renders ThemeToggle", () => {
    render(<Nav />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("has History link in mobile nav", () => {
    render(<Nav />);
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("keeps desktop active styling on locale-prefixed paths", () => {
    mockPathname = "/es/bundles";

    render(<Nav />);

    const bundlesLinks = screen.getAllByText("Bundles");
    const hasActiveDesktopLink = bundlesLinks.some((node) =>
      node.closest("a")?.className.includes("text-indigo-600")
    );

    expect(hasActiveDesktopLink).toBe(true);
  });
});
