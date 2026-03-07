/**
 * Tests for BottomTabBar component.
 *
 * Covers: tab rendering, active state, link hrefs, search callback,
 * menu toggle, ARIA attributes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomTabBar } from "./BottomTabBar";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockPathname = "/";
let mockLocale = "en";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));
vi.mock("next-intl", () => ({
  useLocale: () => mockLocale,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      return <div {...omitMotionProps(props)}>{children as React.ReactNode}</div>;
    },
    nav: ({ children, ...props }: Record<string, unknown>) => {
      return <nav {...omitMotionProps(props)}>{children as React.ReactNode}</nav>;
    },
    button: ({
      children,
      onClick,
      ...props
    }: Record<string, unknown> & { onClick?: () => void }) => {
      return (
        <button type="button" onClick={onClick} {...omitMotionProps(props)}>
          {children as React.ReactNode}
        </button>
      );
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/hooks/usePrecisionHaptic", () => ({
  usePrecisionHaptic: () => ({
    light: vi.fn(),
    medium: vi.fn(),
    heavy: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) =>
    classes.filter(Boolean).join(" "),
}));

function omitMotionProps(props: Record<string, unknown>) {
  const nextProps = { ...props };
  delete nextProps.initial;
  delete nextProps.animate;
  delete nextProps.exit;
  delete nextProps.transition;
  delete nextProps.whileInView;
  delete nextProps.viewport;
  delete nextProps.whileHover;
  delete nextProps.whileTap;
  delete nextProps.layoutId;
  delete nextProps.layout;
  return nextProps;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BottomTabBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockLocale = "en";
  });

  it("renders all 5 tab labels", () => {
    render(<BottomTabBar />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Bundles")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Workflows")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("has Home link to /", () => {
    render(<BottomTabBar />);
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("has Bundles link to /bundles", () => {
    render(<BottomTabBar />);
    const link = screen.getByText("Bundles").closest("a");
    expect(link).toHaveAttribute("href", "/bundles");
  });

  it("has Workflows link to /workflows", () => {
    render(<BottomTabBar />);
    const link = screen.getByText("Workflows").closest("a");
    expect(link).toHaveAttribute("href", "/workflows");
  });

  it("Search is a button (not a link)", () => {
    render(<BottomTabBar />);
    const search = screen.getByText("Search").closest("button");
    expect(search).toBeInTheDocument();
  });

  it("More is a button (not a link)", () => {
    render(<BottomTabBar />);
    const more = screen.getByText("More").closest("button");
    expect(more).toBeInTheDocument();
  });

  it("calls onOpenSearch when Search tab is clicked", () => {
    const onOpenSearch = vi.fn();
    render(<BottomTabBar onOpenSearch={onOpenSearch} />);
    fireEvent.click(screen.getByText("Search").closest("button")!);
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it("shows more menu items after More click", () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByText("More").closest("button")!);
    expect(screen.getByText("Basket")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Contribute")).toBeInTheDocument();
    expect(screen.getByText("How It's Made")).toBeInTheDocument();
  });

  it("has nav element with data-tab-bar", () => {
    render(<BottomTabBar />);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("data-tab-bar");
  });

  it("renders Pricing link in more menu", () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByText("More").closest("button")!);
    const pricingLink = screen.getByText("Pricing").closest("a");
    expect(pricingLink).toHaveAttribute("href", "/pricing");
  });

  it("localizes tab and menu links for non-default locales", () => {
    mockLocale = "es";

    render(<BottomTabBar />);
    fireEvent.click(screen.getByText("More").closest("button")!);

    expect(screen.getByText("Bundles").closest("a")).toHaveAttribute("href", "/es/bundles");
    expect(screen.getByText("Pricing").closest("a")).toHaveAttribute("href", "/es/pricing");
  });

  it("keeps the active state on locale-prefixed paths", () => {
    mockPathname = "/es/workflows";

    render(<BottomTabBar />);

    expect(screen.getByText("Workflows").parentElement).toHaveClass("text-indigo-600");
  });
});
