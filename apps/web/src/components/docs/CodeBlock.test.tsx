import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CodeBlock, CodeTabs } from "./CodeBlock";

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(() => Promise.resolve({ success: true })),
}));

import { copyToClipboard } from "@/lib/clipboard";

describe("CodeBlock", () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockResolvedValue({ success: true });
  });

  it("renders code content", () => {
    render(<CodeBlock code="const x = 1;" language="typescript" />);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("displays language label when no filename", () => {
    render(<CodeBlock code="echo hello" language="bash" />);
    expect(screen.getByText("bash")).toBeInTheDocument();
  });

  it("displays filename when provided", () => {
    render(<CodeBlock code="test" filename="index.ts" />);
    expect(screen.getByText("index.ts")).toBeInTheDocument();
  });

  it("renders line numbers when showLineNumbers is true", () => {
    render(<CodeBlock code={"line1\nline2\nline3"} showLineNumbers />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("copies code on button click", async () => {
    render(<CodeBlock code="copy me" language="bash" />);
    const copyBtn = screen.getByLabelText("Copy code");
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(copyToClipboard).toHaveBeenCalledWith("copy me");
  });

  it("shows Copied label after copying", async () => {
    render(<CodeBlock code="copy me" language="bash" />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Copy code"));
    });
    // After copy, aria-label changes to "Copied"
    await vi.waitFor(() => {
      expect(screen.getByLabelText("Copied")).toBeInTheDocument();
    });
  });
});

describe("CodeTabs", () => {
  const tabs = [
    { label: "JavaScript", language: "js", code: "const a = 1;" },
    { label: "Python", language: "python", code: "a = 1" },
  ];

  it("renders tab labels", () => {
    render(<CodeTabs tabs={tabs} />);
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("shows first tab content by default", () => {
    render(<CodeTabs tabs={tabs} />);
    expect(screen.getByText("const a = 1;")).toBeInTheDocument();
  });

  it("switches tab on click", () => {
    render(<CodeTabs tabs={tabs} />);
    fireEvent.click(screen.getByText("Python"));
    expect(screen.getByText("a = 1")).toBeInTheDocument();
  });
});
