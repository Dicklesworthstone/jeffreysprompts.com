import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnhancedTimeline } from "./enhanced-timeline";
import type { TranscriptMessage, TranscriptSection } from "@/lib/transcript/types";

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileInView, viewport, ...rest } = props;
      return <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
    },
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileInView, viewport, exit, ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(() => Promise.resolve({ success: true })),
}));

const mockMessages: TranscriptMessage[] = [
  { id: "msg-1", type: "user", timestamp: "2026-01-01T10:00:00Z", content: "Hello Claude" },
  { id: "msg-2", type: "assistant", timestamp: "2026-01-01T10:01:00Z", content: "Hi! How can I help?" },
  { id: "msg-3", type: "user", timestamp: "2026-01-01T10:05:00Z", content: "Build search" },
  {
    id: "msg-4",
    type: "assistant",
    timestamp: "2026-01-01T10:06:00Z",
    content: "I'll implement BM25 search",
    toolCalls: [{ id: "tc-1", name: "Write", input: { file_path: "search.ts" }, output: "done", success: true }],
  },
];

const mockSections: TranscriptSection[] = [
  { id: "s1", title: "Getting Started", summary: "Initial setup", startIndex: 0, endIndex: 1, tags: ["setup"] },
  { id: "s2", title: "Search Feature", summary: "Implementing search", startIndex: 2, endIndex: 3, tags: ["search", "feature"] },
];

describe("EnhancedTimeline", () => {
  it("renders the section title", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText("Session Timeline")).toBeInTheDocument();
  });

  it("renders message and section count summary", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText(/4 messages across 2/)).toBeInTheDocument();
  });

  it("renders section headers with titles", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Search Feature")).toBeInTheDocument();
  });

  it("renders section summaries", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText("Initial setup")).toBeInTheDocument();
    expect(screen.getByText("Implementing search")).toBeInTheDocument();
  });

  it("renders section tags", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText("setup")).toBeInTheDocument();
    expect(screen.getByText("search")).toBeInTheDocument();
    expect(screen.getByText("feature")).toBeInTheDocument();
  });

  it("shows search input", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByPlaceholderText("Search messages...")).toBeInTheDocument();
  });

  it("first section is expanded by default with messages", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText("Hello Claude")).toBeInTheDocument();
  });

  it("shows Human and Claude labels", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getAllByText("Human").length).toBeGreaterThan(0);
  });

  it("shows tool count on messages with tools in expanded section", () => {
    // Put the tool-carrying message in the first section (which is expanded by default)
    const sections: TranscriptSection[] = [
      { id: "s1", title: "All Messages", summary: "Everything", startIndex: 0, endIndex: 3, tags: [] },
    ];
    render(<EnhancedTimeline messages={mockMessages} sections={sections} />);
    expect(screen.getByText("1 tools")).toBeInTheDocument();
  });

  it("shows no results message when search finds nothing", () => {
    render(<EnhancedTimeline messages={mockMessages} sections={mockSections} />);
    const input = screen.getByPlaceholderText("Search messages...");
    fireEvent.change(input, { target: { value: "xyznonexistent" } });
    expect(screen.getByText("No messages found")).toBeInTheDocument();
    expect(screen.getByText("Try a different search term")).toBeInTheDocument();
  });

  it("truncates long message content", () => {
    const longMsg: TranscriptMessage = {
      id: "msg-long",
      type: "user",
      timestamp: "2026-01-01T10:00:00Z",
      content: "A".repeat(600),
    };
    render(
      <EnhancedTimeline
        messages={[longMsg]}
        sections={[{ id: "s1", title: "Test", summary: "Test", startIndex: 0, endIndex: 0, tags: [] }]}
      />
    );
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });
});
