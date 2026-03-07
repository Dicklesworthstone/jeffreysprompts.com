/**
 * Tests for BottomNav mobile component
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// Mock ViewTransitionLink to a simple anchor
vi.mock("./ViewTransitionLink", () => ({
  ViewTransitionLink: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";

describe("BottomNav", () => {
  it("renders all navigation items", () => {
    render(<BottomNav />);
    expect(screen.getByText("Browse")).toBeDefined();
    expect(screen.getByText("Bundles")).toBeDefined();
    expect(screen.getByText("Workflows")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("renders as nav element with aria-label", () => {
    render(<BottomNav />);
    expect(screen.getByLabelText("Mobile navigation")).toBeDefined();
  });

  it("marks home as active on root path", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<BottomNav />);
    const browseLink = screen.getByText("Browse").closest("a");
    expect(browseLink?.getAttribute("aria-current")).toBe("page");
  });

  it("marks bundles as active on /bundles path", () => {
    vi.mocked(usePathname).mockReturnValue("/bundles");
    render(<BottomNav />);
    const bundlesLink = screen.getByText("Bundles").closest("a");
    expect(bundlesLink?.getAttribute("aria-current")).toBe("page");
  });

  it("marks bundles as active on locale-prefixed paths", () => {
    vi.mocked(usePathname).mockReturnValue("/es/bundles");
    render(<BottomNav />);
    const bundlesLink = screen.getByText("Bundles").closest("a");
    expect(bundlesLink?.getAttribute("aria-current")).toBe("page");
  });

  it("marks workflows as active on /workflows path", () => {
    vi.mocked(usePathname).mockReturnValue("/workflows");
    render(<BottomNav />);
    const workflowsLink = screen.getByText("Workflows").closest("a");
    expect(workflowsLink?.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark Browse as active on non-root path", () => {
    vi.mocked(usePathname).mockReturnValue("/settings");
    render(<BottomNav />);
    const browseLink = screen.getByText("Browse").closest("a");
    expect(browseLink?.getAttribute("aria-current")).toBeNull();
  });
});
