import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnhancedHero } from "./enhanced-hero";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <h1 {...(rest as React.HTMLAttributes<HTMLHeadingElement>)}>{children}</h1>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <p {...(rest as React.HTMLAttributes<HTMLParagraphElement>)}>{children}</p>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <span {...(rest as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>;
    },
  },
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => 0,
}));

vi.mock("@/hooks/useCountUp", () => ({
  useCountUp: ({ end }: { end: number }) => end,
}));

describe("EnhancedHero", () => {
  const props = {
    duration: "8h 23m",
    messageCount: 342,
    linesWritten: 5000,
    toolCalls: 891,
  };

  it("renders the main headline", () => {
    render(<EnhancedHero {...props} />);
    expect(screen.getByText(/Built in a/)).toBeInTheDocument();
    expect(screen.getByText("Single Day")).toBeInTheDocument();
  });

  it("renders the subheadline", () => {
    render(<EnhancedHero {...props} />);
    expect(screen.getByText(/complete, unedited Claude Code session/)).toBeInTheDocument();
  });

  it("renders the duration badge", () => {
    render(<EnhancedHero {...props} />);
    expect(screen.getByText("8h 23m")).toBeInTheDocument();
    expect(screen.getByText("of live coding")).toBeInTheDocument();
  });

  it("renders Complete Development Session badge", () => {
    render(<EnhancedHero {...props} />);
    expect(screen.getByText("Complete Development Session")).toBeInTheDocument();
  });

  it("renders CTA buttons", () => {
    render(<EnhancedHero {...props} />);
    expect(screen.getByText("Explore Timeline")).toBeInTheDocument();
    expect(screen.getByText("View Stats")).toBeInTheDocument();
  });

  it("renders stat badges with labels", () => {
    render(<EnhancedHero {...props} />);
    expect(screen.getByText("messages")).toBeInTheDocument();
    expect(screen.getByText("tool calls")).toBeInTheDocument();
    expect(screen.getByText("lines")).toBeInTheDocument();
  });
});
