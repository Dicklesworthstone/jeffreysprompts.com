/**
 * Tests for HelpLayout, ArticleCard, and ArticleContent components.
 *
 * Covers: title, description, breadcrumb, category breadcrumb,
 * sidebar categories, search input, contact links, children rendering,
 * ArticleCard rendering, ArticleContent rendering.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelpLayout, ArticleCard, ArticleContent } from "./HelpLayout";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

let mockPathname = "/help/getting-started";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

// ---------------------------------------------------------------------------
// Tests – HelpLayout
// ---------------------------------------------------------------------------

describe("HelpLayout", () => {
  it("renders page title", () => {
    render(
      <HelpLayout title="Help Center">
        <p>Content</p>
      </HelpLayout>
    );
    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent("Help Center");
  });

  it("renders description when provided", () => {
    render(
      <HelpLayout
        title="Help"
        description="Find answers to common questions"
      >
        <p>Content</p>
      </HelpLayout>
    );
    expect(screen.getByText("Find answers to common questions")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <HelpLayout title="Help">
        <p>This is help content.</p>
      </HelpLayout>
    );
    expect(screen.getByText("This is help content.")).toBeInTheDocument();
  });

  it("shows breadcrumb with Help Center link by default", () => {
    render(
      <HelpLayout title="Help">
        <p>Content</p>
      </HelpLayout>
    );
    const link = screen.getByText("Help Center");
    expect(link.closest("a")).toHaveAttribute("href", "/help");
  });

  it("shows category in breadcrumb when provided", () => {
    render(
      <HelpLayout title="Intro" category="getting-started">
        <p>Content</p>
      </HelpLayout>
    );
    const catLink = screen.getByText("getting started");
    expect(catLink.closest("a")).toHaveAttribute("href", "/help/getting-started");
  });

  it("hides breadcrumb when showBreadcrumb is false", () => {
    render(
      <HelpLayout title="Help" showBreadcrumb={false}>
        <p>Content</p>
      </HelpLayout>
    );
    expect(screen.queryByText("Help Center")).not.toBeInTheDocument();
  });

  it("renders sidebar category links", () => {
    render(
      <HelpLayout title="Help">
        <p>Content</p>
      </HelpLayout>
    );
    expect(screen.getAllByText("Getting Started").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Prompts & Collections").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("CLI Tool").length).toBeGreaterThanOrEqual(1);
  });

  it("has search input in sidebar", () => {
    render(
      <HelpLayout title="Help">
        <p>Content</p>
      </HelpLayout>
    );
    expect(screen.getByPlaceholderText("Search help...")).toBeInTheDocument();
  });

  it("shows Contact support link", () => {
    render(
      <HelpLayout title="Help">
        <p>Content</p>
      </HelpLayout>
    );
    expect(screen.getAllByText("Contact support").length).toBeGreaterThanOrEqual(1);
  });

  it("shows GitHub issue link", () => {
    render(
      <HelpLayout title="Help">
        <p>Content</p>
      </HelpLayout>
    );
    expect(screen.getAllByText("Open a GitHub issue").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Need more help? text", () => {
    render(
      <HelpLayout title="Help">
        <p>Content</p>
      </HelpLayout>
    );
    expect(screen.getAllByText("Need more help?").length).toBeGreaterThanOrEqual(1);
  });

  it("renders mobile category navigation", () => {
    render(
      <HelpLayout title="Help">
        <p>Content</p>
      </HelpLayout>
    );
    // Each category appears in both sidebar and mobile nav
    expect(screen.getAllByText("Getting Started").length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Tests – ArticleCard
// ---------------------------------------------------------------------------

describe("ArticleCard", () => {
  it("renders title and link", () => {
    render(<ArticleCard href="/help/getting-started/intro" title="Introduction" />);
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Introduction").closest("a")).toHaveAttribute(
      "href",
      "/help/getting-started/intro"
    );
  });

  it("renders description when provided", () => {
    render(
      <ArticleCard
        href="/help/test"
        title="Test"
        description="A helpful article"
      />
    );
    expect(screen.getByText("A helpful article")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests – ArticleContent
// ---------------------------------------------------------------------------

describe("ArticleContent", () => {
  it("renders children inside an article element", () => {
    render(
      <ArticleContent>
        <h2>Section Title</h2>
      </ArticleContent>
    );
    expect(screen.getByText("Section Title")).toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });
});
