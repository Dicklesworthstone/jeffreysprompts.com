import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocsPageLayout } from "./DocsPageLayout";

const mockToc = [
  { id: "section-1", title: "Getting Started" },
  { id: "section-2", title: "Authentication", level: 2 },
  { id: "section-3", title: "Endpoints" },
];

describe("DocsPageLayout", () => {
  it("renders the page title", () => {
    render(
      <DocsPageLayout title="API Documentation" tableOfContents={mockToc}>
        <p>Content</p>
      </DocsPageLayout>
    );
    expect(screen.getByText("API Documentation")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <DocsPageLayout
        title="API Docs"
        description="Full reference for the API"
        tableOfContents={mockToc}
      >
        <p>Content</p>
      </DocsPageLayout>
    );
    expect(screen.getByText("Full reference for the API")).toBeInTheDocument();
  });

  it("renders the version", () => {
    render(
      <DocsPageLayout title="API" version="2.0.0" tableOfContents={mockToc}>
        <p>Content</p>
      </DocsPageLayout>
    );
    expect(screen.getByText("API Version 2.0.0")).toBeInTheDocument();
  });

  it("defaults to version 1.0.0", () => {
    render(
      <DocsPageLayout title="API" tableOfContents={mockToc}>
        <p>Content</p>
      </DocsPageLayout>
    );
    expect(screen.getByText("API Version 1.0.0")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <DocsPageLayout title="API" tableOfContents={mockToc}>
        <p>Custom documentation content</p>
      </DocsPageLayout>
    );
    expect(
      screen.getByText("Custom documentation content")
    ).toBeInTheDocument();
  });

  it("renders table of contents items", () => {
    render(
      <DocsPageLayout title="API" tableOfContents={mockToc}>
        <p>Content</p>
      </DocsPageLayout>
    );
    // TOC items appear in both mobile and desktop sidebars
    const gettingStartedLinks = screen.getAllByText("Getting Started");
    expect(gettingStartedLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders navigation sections", () => {
    render(
      <DocsPageLayout title="API" tableOfContents={mockToc}>
        <p>Content</p>
      </DocsPageLayout>
    );
    expect(screen.getByText("API Reference")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
  });

  it("renders OpenAPI Spec link", () => {
    render(
      <DocsPageLayout title="API" tableOfContents={mockToc}>
        <p>Content</p>
      </DocsPageLayout>
    );
    const links = screen.getAllByText("OpenAPI Spec");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("renders footer with support email", () => {
    render(
      <DocsPageLayout title="API" tableOfContents={mockToc}>
        <p>Content</p>
      </DocsPageLayout>
    );
    expect(screen.getByText("support@jeffreysprompts.com")).toBeInTheDocument();
  });
});
