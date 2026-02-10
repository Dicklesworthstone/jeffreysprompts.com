import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageContent } from "./message-content";

vi.mock("react-syntax-highlighter", () => ({
  Prism: ({ children, language }: { children: string; language: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      <code>{children}</code>
    </pre>
  ),
}));

vi.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  oneDark: {},
}));

vi.mock("@/lib/transcript/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/transcript/utils")>();
  return {
    ...actual,
    detectLanguage: (content: string) => {
      if (content.includes("const")) return "typescript";
      return "text";
    },
  };
});

describe("MessageContent", () => {
  it("renders plain text", () => {
    render(<MessageContent content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders nothing for empty content", () => {
    const { container } = render(<MessageContent content="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders code block with language tag", () => {
    const content = "Before code\n```typescript\nconst x = 1;\n```\nAfter code";
    render(<MessageContent content={content} />);
    expect(screen.getByTestId("syntax-highlighter")).toBeInTheDocument();
    expect(screen.getByTestId("syntax-highlighter")).toHaveAttribute("data-language", "typescript");
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("renders multiple text lines", () => {
    render(<MessageContent content="Line one\nLine two" />);
    expect(screen.getByText(/Line one/)).toBeInTheDocument();
    expect(screen.getByText(/Line two/)).toBeInTheDocument();
  });

  it("renders code block without language hint", () => {
    const content = "```\nconst y = 2;\n```";
    render(<MessageContent content={content} />);
    expect(screen.getByText("const y = 2;")).toBeInTheDocument();
  });

  it("shows language label for code blocks", () => {
    const content = "```typescript\nconst z = 3;\n```";
    render(<MessageContent content={content} />);
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("renders mixed text and code content", () => {
    const content = "Some text\n```js\nalert('hi');\n```\nMore text";
    render(<MessageContent content={content} />);
    expect(screen.getByText("Some text")).toBeInTheDocument();
    expect(screen.getByText("More text")).toBeInTheDocument();
    expect(screen.getByText("alert('hi');")).toBeInTheDocument();
  });
});
