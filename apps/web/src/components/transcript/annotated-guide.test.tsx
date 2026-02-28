import { vi } from "vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotatedGuide } from "./annotated-guide";
import type { TranscriptSection } from "@/lib/transcript/types";
import type { GuideStep } from "@/data/annotations";

vi.mock("@/data/annotations", () => ({
  workflowPosts: [
    {
      id: "post-1",
      date: "Jan 3, 2026",
      title: "Test Workflow Post",
      summary: "A test post",
      tags: ["testing"],
      stepIds: ["section-1"],
      tone: "planning" as const,
    },
  ],
}));

const mockSections: TranscriptSection[] = [
  { id: "section-1", title: "Planning Phase", summary: "Initial planning", startIndex: 0, endIndex: 10, tags: ["planning", "architecture"] },
  { id: "section-2", title: "Implementation", summary: "Building features", startIndex: 11, endIndex: 30, tags: ["coding"] },
];

const mockSteps: GuideStep[] = [
  {
    sectionId: "section-1",
    narrative: "We started by planning the architecture carefully.",
    excerpts: ["First we need a solid plan", "Let me outline the approach"],
    outcomes: ["Architecture diagram created", "Dependencies identified"],
    artifacts: ["PLAN.md", "package.json"],
    xRefs: ["post-1"],
  },
  {
    sectionId: "section-2",
    narrative: "Then we built the core features.",
    outcomes: ["Search engine implemented", "CLI tool built"],
    artifacts: ["src/search.ts", "jfp.ts"],
  },
];

describe("AnnotatedGuide", () => {
  it("renders the main heading", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("The annotated build guide")).toBeInTheDocument();
  });

  it("renders section titles", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("Planning Phase")).toBeInTheDocument();
    expect(screen.getByText("Implementation")).toBeInTheDocument();
  });

  it("renders section summaries", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("Initial planning")).toBeInTheDocument();
    expect(screen.getByText("Building features")).toBeInTheDocument();
  });

  it("renders phase count and message count badges", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("2 phases")).toBeInTheDocument();
    expect(screen.getByText("100 messages")).toBeInTheDocument();
    expect(screen.getByText("8h total build time")).toBeInTheDocument();
  });

  it("renders step narratives", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("We started by planning the architecture carefully.")).toBeInTheDocument();
    expect(screen.getByText("Then we built the core features.")).toBeInTheDocument();
  });

  it("renders excerpts when present", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("First we need a solid plan")).toBeInTheDocument();
    expect(screen.getByText("Let me outline the approach")).toBeInTheDocument();
  });

  it("renders outcomes", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("Architecture diagram created")).toBeInTheDocument();
    expect(screen.getByText("Search engine implemented")).toBeInTheDocument();
  });

  it("renders artifacts", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("PLAN.md")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
    expect(screen.getByText("src/search.ts")).toBeInTheDocument();
  });

  it("renders section tags", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("planning")).toBeInTheDocument();
    expect(screen.getByText("architecture")).toBeInTheDocument();
  });

  it("renders workflow post xRefs", () => {
    render(<AnnotatedGuide sections={mockSections} steps={mockSteps} totalMessages={100} duration="8h" />);
    expect(screen.getByText("Test Workflow Post")).toBeInTheDocument();
  });

  it("skips sections without matching steps", () => {
    const extraSection: TranscriptSection = { id: "section-99", title: "No Step", summary: "Missing", startIndex: 31, endIndex: 40, tags: [] };
    render(
      <AnnotatedGuide sections={[...mockSections, extraSection]} steps={mockSteps} totalMessages={100} duration="8h" />
    );
    expect(screen.queryByText("No Step")).not.toBeInTheDocument();
  });
});
