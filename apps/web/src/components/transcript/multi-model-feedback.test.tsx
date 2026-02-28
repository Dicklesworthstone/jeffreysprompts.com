import { vi } from "vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MultiModelFeedback } from "./multi-model-feedback";

vi.mock("@/data/annotations", () => ({
  workflowPosts: [
    {
      id: "post-1",
      date: "Jan 3, 2026",
      title: "Test Post Title",
      summary: "Test post summary",
      tags: ["testing"],
      stepIds: ["section-0"],
      tone: "planning" as const,
    },
  ],
}));

describe("MultiModelFeedback", () => {
  it("renders main heading", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Refined by Multiple AI Models")).toBeInTheDocument();
  });

  it("renders Multi-Model Feedback Loop badge", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Multi-Model Feedback Loop")).toBeInTheDocument();
  });

  it("renders process flow labels", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Claude Plan")).toBeInTheDocument();
    expect(screen.getByText("GPT Review")).toBeInTheDocument();
    expect(screen.getByText("Gemini Review")).toBeInTheDocument();
    expect(screen.getByText("Claude Build")).toBeInTheDocument();
  });

  it("renders Implemented count", () => {
    render(<MultiModelFeedback />);
    // 9 of 11 feedbackItems are implemented
    expect(screen.getByText("Implemented")).toBeInTheDocument();
  });

  it("renders Future Work count", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Future Work")).toBeInTheDocument();
  });

  it("renders Adoption Rate", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Adoption Rate")).toBeInTheDocument();
  });

  it("renders feedback card titles", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Shared packages/core Package")).toBeInTheDocument();
    expect(screen.getByText("BM25 Search Engine")).toBeInTheDocument();
    expect(screen.getByText("CAC CLI Parser")).toBeInTheDocument();
  });

  it("renders source badges (GPT Pro / Gemini)", () => {
    render(<MultiModelFeedback />);
    expect(screen.getAllByText("GPT Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gemini").length).toBeGreaterThan(0);
  });

  it("renders GPT Pro Planning + Revisions section", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("GPT Pro Planning + Revisions")).toBeInTheDocument();
    expect(screen.getByText("Second-pass plan refinement (web session)")).toBeInTheDocument();
  });

  it("renders GPT Pro planning session section", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("GPT Pro planning session")).toBeInTheDocument();
    expect(screen.getByText("GPT Pro plan fusion (web session)")).toBeInTheDocument();
  });

  it("renders workflow sources section", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Workflow sources from X")).toBeInTheDocument();
    expect(screen.getByText("Test Post Title")).toBeInTheDocument();
  });

  it("renders the meta-demonstration note", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("The meta-demonstration:")).toBeInTheDocument();
    expect(screen.getByText(/multi-model review process/)).toBeInTheDocument();
  });

  it("renders planning changes items", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Introduce shared core package for registry + search")).toBeInTheDocument();
    expect(screen.getByText("Replace embeddings with BM25 relevance scoring")).toBeInTheDocument();
  });

  it("renders revision items", () => {
    render(<MultiModelFeedback />);
    expect(screen.getByText("Hash-based skill manifest to prevent overwrites")).toBeInTheDocument();
    expect(screen.getByText("YAML-safe frontmatter + generator markers")).toBeInTheDocument();
  });
});
