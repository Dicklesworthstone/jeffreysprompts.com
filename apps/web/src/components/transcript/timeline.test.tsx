import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent} from "@testing-library/react";
import { TranscriptTimeline } from "./timeline";
import type { TranscriptMessage, TranscriptSection } from "@/lib/transcript/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial, animate, whileInView, whileHover, whileTap, viewport, transition, variants, style, exit, layoutId, layout, className, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockMessages: TranscriptMessage[] = [
  {
    id: "msg-1",
    type: "user",
    timestamp: "2026-01-01T10:00:00Z",
    content: "Hello, please build me a website",
  },
  {
    id: "msg-2",
    type: "assistant",
    timestamp: "2026-01-01T10:01:00Z",
    content: "Sure, I'll start building the website now",
    toolCalls: [
      { id: "tc-1", name: "Write", input: { file_path: "index.tsx" }, output: "Done", success: true },
    ],
  },
  {
    id: "msg-3",
    type: "user",
    timestamp: "2026-01-01T10:05:00Z",
    content: "Add search functionality",
  },
];

const mockSections: TranscriptSection[] = [
  { id: "s1", title: "Planning", summary: "Initial planning phase", startIndex: 0, endIndex: 1, tags: ["planning"] },
  { id: "s2", title: "Search Feature", summary: "Adding search", startIndex: 2, endIndex: 2, tags: ["feature"] },
];

describe("TranscriptTimeline", () => {
  it("renders section titles", () => {
    render(<TranscriptTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText("Planning")).toBeInTheDocument();
    expect(screen.getByText("Search Feature")).toBeInTheDocument();
  });

  it("renders section summaries", () => {
    render(<TranscriptTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getByText("Initial planning phase")).toBeInTheDocument();
    expect(screen.getByText("Adding search")).toBeInTheDocument();
  });

  it("shows first section expanded by default", () => {
    render(<TranscriptTimeline messages={mockMessages} sections={mockSections} />);
    // First section's message should be visible
    expect(screen.getByText(/Hello, please build me a website/)).toBeInTheDocument();
  });

  it("shows message sender labels", () => {
    render(<TranscriptTimeline messages={mockMessages} sections={mockSections} />);
    expect(screen.getAllByText("Human").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Claude").length).toBeGreaterThan(0);
  });

  it("shows tool call indicator on assistant messages", () => {
    render(<TranscriptTimeline messages={mockMessages} sections={mockSections} />);
    // The first section shows messages, including one with tool calls
    // Tool count is rendered next to the wrench icon
    const toolIndicators = screen.getAllByText("1");
    // At least one "1" is the section number, another is the tool call count
    expect(toolIndicators.length).toBeGreaterThanOrEqual(2);
  });

  it("truncates long message content in preview", () => {
    const longMessage: TranscriptMessage = {
      id: "msg-long",
      type: "user",
      timestamp: "2026-01-01T10:00:00Z",
      content: "A".repeat(150),
    };
    render(
      <TranscriptTimeline
        messages={[longMessage]}
        sections={[{ id: "s1", title: "Test", summary: "Test", startIndex: 0, endIndex: 0, tags: [] }]}
      />
    );
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });

  it("calls onSelectMessage when clicking a message", () => {
    const onSelect = vi.fn();
    render(<TranscriptTimeline messages={mockMessages} sections={mockSections} onSelectMessage={onSelect} />);
    // Click the first message preview
    fireEvent.click(screen.getByText(/Hello, please build me a website/));
    expect(onSelect).toHaveBeenCalledWith("msg-1");
  });

  it("creates default section when no sections provided", () => {
    render(<TranscriptTimeline messages={mockMessages} sections={[]} />);
    expect(screen.getByText("Session")).toBeInTheDocument();
  });
});
