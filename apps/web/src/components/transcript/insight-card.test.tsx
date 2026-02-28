import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent} from "@testing-library/react";
import { InsightCard } from "./insight-card";
import type { TranscriptHighlight } from "@/lib/transcript/types";

vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
    },
  },
}));

const baseHighlight: TranscriptHighlight = {
  messageId: "msg-42",
  type: "key_decision",
  annotation: "Chose TypeScript-native prompts over markdown",
};

describe("InsightCard", () => {
  it("renders annotation text", () => {
    render(<InsightCard highlight={baseHighlight} />);
    expect(screen.getByText("Chose TypeScript-native prompts over markdown")).toBeInTheDocument();
  });

  it("renders type label for key_decision", () => {
    render(<InsightCard highlight={baseHighlight} />);
    expect(screen.getByText("Key Decision")).toBeInTheDocument();
  });

  it("renders type label for interesting_prompt", () => {
    render(<InsightCard highlight={{ ...baseHighlight, type: "interesting_prompt" }} />);
    expect(screen.getByText("Interesting Prompt")).toBeInTheDocument();
  });

  it("renders type label for clever_solution", () => {
    render(<InsightCard highlight={{ ...baseHighlight, type: "clever_solution" }} />);
    expect(screen.getByText("Clever Solution")).toBeInTheDocument();
  });

  it("renders type label for lesson_learned", () => {
    render(<InsightCard highlight={{ ...baseHighlight, type: "lesson_learned" }} />);
    expect(screen.getByText("Lesson Learned")).toBeInTheDocument();
  });

  it("shows context hint", () => {
    render(<InsightCard highlight={baseHighlight} />);
    expect(screen.getByText("Click to view in context")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<InsightCard highlight={baseHighlight} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
