import { vi } from "vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsDashboard } from "./stats-dashboard";
import type { ProcessedTranscript } from "@/lib/transcript/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
}));

const mockTranscript: ProcessedTranscript = {
  meta: {
    sessionId: "test-session",
    startTime: "2026-01-01T08:00:00Z",
    endTime: "2026-01-01T16:00:00Z",
    duration: "8h",
    model: "claude-3-opus",
    stats: {
      userMessages: 50,
      assistantMessages: 50,
      toolCalls: 200,
      filesEdited: 30,
      linesWritten: 5000,
      tokensUsed: 100000,
    },
  },
  sections: [],
  messages: [],
  highlights: [],
};

describe("StatsDashboard", () => {
  it("renders Duration stat", () => {
    render(<StatsDashboard transcript={mockTranscript} />);
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("8h")).toBeInTheDocument();
  });

  it("renders Messages stat with detail", () => {
    render(<StatsDashboard transcript={mockTranscript} />);
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("50 human, 50 Claude")).toBeInTheDocument();
  });

  it("renders Tool Calls stat", () => {
    render(<StatsDashboard transcript={mockTranscript} />);
    expect(screen.getByText("Tool Calls")).toBeInTheDocument();
  });

  it("renders Files Edited stat", () => {
    render(<StatsDashboard transcript={mockTranscript} />);
    expect(screen.getByText("Files Edited")).toBeInTheDocument();
  });

  it("renders Lines Written stat", () => {
    render(<StatsDashboard transcript={mockTranscript} />);
    expect(screen.getByText("Lines Written")).toBeInTheDocument();
  });

  it("renders Tokens Used stat with cost detail", () => {
    render(<StatsDashboard transcript={mockTranscript} />);
    expect(screen.getByText("Tokens Used")).toBeInTheDocument();
    expect(screen.getByText("~$1.50 at $15/M")).toBeInTheDocument();
  });

  it("renders all 6 stat cards", () => {
    render(<StatsDashboard transcript={mockTranscript} />);
    const labels = ["Duration", "Messages", "Tool Calls", "Files Edited", "Lines Written", "Tokens Used"];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
