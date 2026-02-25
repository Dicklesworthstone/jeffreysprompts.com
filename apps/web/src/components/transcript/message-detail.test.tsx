import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent} from "@testing-library/react";
import { MessageDetail } from "./message-detail";
import type { TranscriptMessage } from "@/lib/transcript/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock("react-syntax-highlighter", () => ({
  Prism: ({ children }: { children: string }) => <pre data-testid="syntax-highlighter"><code>{children}</code></pre>,
}));

vi.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  oneDark: {},
}));

vi.mock("@/components/ui/copy-button", () => ({
  CopyButton: ({ text }: { text: string }) => <button aria-label="Copy">{text.slice(0, 10)}</button>,
}));

vi.mock("./message-content", () => ({
  MessageContent: ({ content }: { content: string }) => <div data-testid="message-content">{content}</div>,
}));

const userMessage: TranscriptMessage = {
  id: "msg-1",
  type: "user",
  timestamp: "2026-01-01T10:00:00Z",
  content: "Build a search engine",
};

const assistantMessage: TranscriptMessage = {
  id: "msg-2",
  type: "assistant",
  timestamp: "2026-01-01T10:01:00Z",
  content: "I'll implement BM25 search",
  model: "claude-3-opus",
  toolCalls: [
    { id: "tc-1", name: "Write", input: { file_path: "search.ts" }, output: "File written", duration: 150, success: true },
    { id: "tc-2", name: "Bash", input: { command: "bun run test" }, output: "All tests pass", duration: 3000, success: true },
  ],
};

const thinkingMessage: TranscriptMessage = {
  ...assistantMessage,
  id: "msg-3",
  thinking: "Let me think about the best approach for search...",
  toolCalls: undefined,
};

describe("MessageDetail", () => {
  it("renders user message with Human label", () => {
    render(<MessageDetail message={userMessage} />);
    expect(screen.getByText("Human")).toBeInTheDocument();
    expect(screen.getByTestId("message-content")).toHaveTextContent("Build a search engine");
  });

  it("renders assistant message with Claude label", () => {
    render(<MessageDetail message={assistantMessage} />);
    expect(screen.getByText("Claude")).toBeInTheDocument();
  });

  it("shows model name when present", () => {
    render(<MessageDetail message={assistantMessage} />);
    expect(screen.getByText("claude-3-opus")).toBeInTheDocument();
  });

  it("renders tool calls count", () => {
    render(<MessageDetail message={assistantMessage} />);
    expect(screen.getByText("Tool Calls (2)")).toBeInTheDocument();
  });

  it("renders tool call names", () => {
    render(<MessageDetail message={assistantMessage} />);
    expect(screen.getByText("Write")).toBeInTheDocument();
    expect(screen.getByText("Bash")).toBeInTheDocument();
  });

  it("shows tool call duration", () => {
    render(<MessageDetail message={assistantMessage} />);
    expect(screen.getByText("150ms")).toBeInTheDocument();
    expect(screen.getByText("3000ms")).toBeInTheDocument();
  });

  it("shows Extended Thinking toggle when thinking present", () => {
    render(<MessageDetail message={thinkingMessage} />);
    expect(screen.getByText("Extended Thinking")).toBeInTheDocument();
  });

  it("toggles thinking content on click", () => {
    render(<MessageDetail message={thinkingMessage} />);
    // Initially thinking is hidden
    expect(screen.queryByText("Let me think about the best approach for search...")).not.toBeInTheDocument();
    // Click to show
    fireEvent.click(screen.getByText("Extended Thinking"));
    expect(screen.getByText("Let me think about the best approach for search...")).toBeInTheDocument();
  });

  it("renders highlight annotation when provided", () => {
    render(
      <MessageDetail
        message={userMessage}
        highlight={{ type: "key_decision", annotation: "Important architectural choice" }}
      />
    );
    expect(screen.getByText("key decision")).toBeInTheDocument();
    expect(screen.getByText("Important architectural choice")).toBeInTheDocument();
  });

  it("does not render tool calls section for messages without tools", () => {
    render(<MessageDetail message={userMessage} />);
    expect(screen.queryByText(/Tool Calls/)).not.toBeInTheDocument();
  });
});
