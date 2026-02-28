import { vi } from "vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnhancedStats } from "./enhanced-stats";
import type { ProcessedTranscript } from "@/lib/transcript/types";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  useInView: () => true,
  useMotionValue: () => ({ set: () => {}, get: () => 0 }),
  useTransform: () => 0,
}));

vi.mock("@/hooks/useCountUp", () => ({
  useCountUp: ({ end }: { end: number }) => end,
  easings: { easeOutExpo: (t: number) => t },
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
      assistantMessages: 100,
      toolCalls: 500,
      filesEdited: 45,
      linesWritten: 8000,
      tokensUsed: 200000,
    },
  },
  sections: [],
  messages: [],
  highlights: [],
};

describe("EnhancedStats", () => {
  it("renders the section header", () => {
    render(<EnhancedStats transcript={mockTranscript} />);
    expect(screen.getByText("By the Numbers")).toBeInTheDocument();
    expect(screen.getByText(/Real metrics from the session/)).toBeInTheDocument();
  });

  it("renders all stat labels", () => {
    render(<EnhancedStats transcript={mockTranscript} />);
    const labels = ["Session Duration", "Total Messages", "Tool Invocations", "Files Created", "Lines of Code", "Tokens Processed"];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders detail text for stats that have it", () => {
    render(<EnhancedStats transcript={mockTranscript} />);
    expect(screen.getByText("50 prompts → 100 responses")).toBeInTheDocument();
    expect(screen.getByText("Read, Write, Edit, Bash, Glob...")).toBeInTheDocument();
    expect(screen.getByText("TypeScript, TSX, CSS, JSON")).toBeInTheDocument();
    expect(screen.getByText("Production-ready code")).toBeInTheDocument();
  });

  it("renders token cost estimate", () => {
    render(<EnhancedStats transcript={mockTranscript} />);
    // 200000 tokens / 1M * $15 = $3.00
    expect(screen.getByText(/\$3\.00 cost/)).toBeInTheDocument();
  });

  it("renders suffix for duration and tokens", () => {
    render(<EnhancedStats transcript={mockTranscript} />);
    // Duration: 8h, Tokens: 200K
    expect(screen.getByText(/h$/)).toBeInTheDocument();
    expect(screen.getByText(/K$/)).toBeInTheDocument();
  });
});
