/**
 * Tests for JsonLd component and structured data helpers.
 *
 * Covers: component rendering, websiteJsonLd structure,
 * softwareAppJsonLd structure, generateBreadcrumbJsonLd.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  JsonLd,
  websiteJsonLd,
  softwareAppJsonLd,
  generateBreadcrumbJsonLd,
} from "./JsonLd";

describe("JsonLd component", () => {
  it("renders a script tag with type application/ld+json", () => {
    const data = { "@type": "Thing", name: "Test" };
    const { container } = render(<JsonLd data={data} />);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
  });

  it("contains the serialized JSON data", () => {
    const data = { "@context": "https://schema.org", "@type": "Thing", name: "Hello" };
    const { container } = render(<JsonLd data={data} />);

    const script = container.querySelector('script[type="application/ld+json"]');
    const content = script?.innerHTML ?? "";
    const parsed = JSON.parse(content);
    expect(parsed["@type"]).toBe("Thing");
    expect(parsed.name).toBe("Hello");
  });

  it("escapes < characters to prevent XSS", () => {
    const data = { name: "</script><img onerror=alert(1)>" };
    const { container } = render(<JsonLd data={data} />);

    const script = container.querySelector('script[type="application/ld+json"]');
    const content = script?.innerHTML ?? "";
    expect(content).not.toContain("</script>");
    expect(content).toContain("\\u003c");
  });
});

describe("websiteJsonLd", () => {
  it("has correct @context and @type", () => {
    expect(websiteJsonLd["@context"]).toBe("https://schema.org");
    expect(websiteJsonLd["@type"]).toBe("WebSite");
  });

  it("has the correct site name", () => {
    expect(websiteJsonLd.name).toBe("Jeffrey's Prompts");
  });

  it("has a SearchAction potentialAction", () => {
    expect(websiteJsonLd.potentialAction["@type"]).toBe("SearchAction");
  });

  it("has author with sameAs links", () => {
    expect(websiteJsonLd.author.name).toBe("Jeffrey Emanuel");
    expect(websiteJsonLd.author.sameAs).toContain("https://twitter.com/doodlestein");
    expect(websiteJsonLd.author.sameAs).toContain("https://github.com/Dicklesworthstone");
  });
});

describe("softwareAppJsonLd", () => {
  it("has correct @type", () => {
    expect(softwareAppJsonLd["@type"]).toBe("SoftwareApplication");
  });

  it("is a free developer application", () => {
    expect(softwareAppJsonLd.applicationCategory).toBe("DeveloperApplication");
    expect(softwareAppJsonLd.offers.price).toBe("0");
  });

  it("has a download URL", () => {
    expect(softwareAppJsonLd.downloadUrl).toContain("install.sh");
  });
});

describe("generateBreadcrumbJsonLd", () => {
  it("generates a BreadcrumbList", () => {
    const result = generateBreadcrumbJsonLd([
      { name: "Home", url: "https://example.com" },
    ]);
    expect(result["@type"]).toBe("BreadcrumbList");
  });

  it("assigns sequential positions starting at 1", () => {
    const result = generateBreadcrumbJsonLd([
      { name: "Home", url: "https://example.com" },
      { name: "About", url: "https://example.com/about" },
      { name: "Team", url: "https://example.com/about/team" },
    ]);

    expect(result.itemListElement).toHaveLength(3);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[1].position).toBe(2);
    expect(result.itemListElement[2].position).toBe(3);
  });

  it("includes name and item (url) in each element", () => {
    const result = generateBreadcrumbJsonLd([
      { name: "Home", url: "https://example.com" },
    ]);

    expect(result.itemListElement[0].name).toBe("Home");
    expect(result.itemListElement[0].item).toBe("https://example.com");
  });

  it("returns empty itemListElement for empty input", () => {
    const result = generateBreadcrumbJsonLd([]);
    expect(result.itemListElement).toHaveLength(0);
  });
});
