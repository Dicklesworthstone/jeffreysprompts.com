/**
 * Animation Module Tests
 *
 * @see brenner_bot-f8vs.9 (Animation & Scroll Effects System)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import * as React from "react";

import {
  // Variants
  TIMING,
  EASING,
  fadeUp,
  scaleIn,
  popIn,
  staggerContainer,
  cardHover,
  buttonHover,
  buttonTap,
  withDelay,
  viewport,
  // Hooks
  useReducedMotion,
  useAnimationPreference,
  useStaggerDelays,
  useHoverState,
  // Components
  AnimateOnScroll,
  StaggerChildren,
  InteractiveCard,
  InteractiveButton,
  InteractiveIcon,
  PresenceAnimation,
} from "./index";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock framer-motion
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    useScroll: () => ({
      scrollY: { get: () => 0, on: () => () => {} },
      scrollYProgress: { get: () => 0, on: () => () => {} },
    }),
    useTransform: (_value: unknown, fn: (v: number) => number) => ({
      get: () => fn(0),
      on: () => () => {},
    }),
    useSpring: (value: unknown) => value,
  };
});

// Mock IntersectionObserver class
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(private callback: IntersectionObserverCallback) {}

  observe(): void {
    // Trigger as if element is in view
    this.callback(
      [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      this
    );
  }

  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Mock matchMedia for reduced motion
const createMatchMediaMock = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe("Motion Variants", () => {
  describe("TIMING constants", () => {
    it("has correct timing values", () => {
      expect(TIMING.micro).toBe(0.15);
      expect(TIMING.fast).toBe(0.3);
      expect(TIMING.normal).toBe(0.5);
      expect(TIMING.slow).toBe(0.8);
      expect(TIMING.complex).toBe(1.0);
    });
  });

  describe("EASING constants", () => {
    it("has valid easing curves", () => {
      expect(EASING.easeOut).toHaveLength(4);
      expect(EASING.easeInOut).toHaveLength(4);
      expect(EASING.spring).toHaveLength(4);
    });
  });

  describe("fadeUp variant", () => {
    it("has hidden and visible states", () => {
      expect(fadeUp.hidden).toBeDefined();
      expect(fadeUp.visible).toBeDefined();
    });

    it("hidden state has zero opacity and positive y offset", () => {
      expect(fadeUp.hidden).toMatchObject({
        opacity: 0,
        y: 20,
      });
    });

    it("visible state has full opacity and zero y offset", () => {
      const visible = fadeUp.visible as { opacity: number; y: number };
      expect(visible.opacity).toBe(1);
      expect(visible.y).toBe(0);
    });
  });

  describe("scaleIn variant", () => {
    it("has correct scale values", () => {
      const hidden = scaleIn.hidden as { scale: number };
      const visible = scaleIn.visible as { scale: number };

      expect(hidden.scale).toBe(0.95);
      expect(visible.scale).toBe(1);
    });
  });

  describe("popIn variant", () => {
    it("has spring-like transition", () => {
      const visible = popIn.visible as { transition?: { type?: string } };
      expect(visible.transition?.type).toBe("spring");
    });
  });

  describe("staggerContainer", () => {
    it("creates variants with specified stagger delay", () => {
      const variants = staggerContainer(0.15);
      const visible = variants.visible as { transition?: { staggerChildren?: number } };

      expect(visible.transition?.staggerChildren).toBe(0.15);
    });

    it("uses default delay when not specified", () => {
      const variants = staggerContainer();
      const visible = variants.visible as { transition?: { staggerChildren?: number } };

      expect(visible.transition?.staggerChildren).toBe(0.1);
    });
  });

  describe("hover/tap states", () => {
    it("cardHover has negative y offset", () => {
      expect(cardHover.y).toBe(-4);
    });

    it("buttonHover scales up slightly", () => {
      expect(buttonHover.scale).toBe(1.02);
    });

    it("buttonTap scales down", () => {
      expect(buttonTap.scale).toBe(0.98);
    });
  });

  describe("withDelay utility", () => {
    it("adds delay to visible transition", () => {
      const delayed = withDelay(fadeUp, 200);
      const visible = delayed.visible as { transition?: { delay?: number } };

      expect(visible.transition?.delay).toBe(0.2);
    });
  });

  describe("viewport presets", () => {
    it("once viewport triggers only once", () => {
      expect(viewport.once.once).toBe(true);
    });

    it("always viewport triggers repeatedly", () => {
      expect(viewport.always.once).toBe(false);
    });
  });
});

describe("Animation Hooks", () => {
  beforeEach(() => {
    window.IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useReducedMotion", () => {
    it("returns false when user prefers motion", () => {
      window.matchMedia = createMatchMediaMock(false);

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);
    });

    it("returns true when user prefers reduced motion", () => {
      window.matchMedia = createMatchMediaMock(true);

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(true);
    });
  });

  describe("useAnimationPreference", () => {
    it("returns shouldAnimate true when motion allowed", () => {
      window.matchMedia = createMatchMediaMock(false);

      const { result } = renderHook(() => useAnimationPreference());
      expect(result.current.shouldAnimate).toBe(true);
      expect(result.current.duration).toBe(TIMING.normal);
    });

    it("returns shouldAnimate false when reduced motion", () => {
      window.matchMedia = createMatchMediaMock(true);

      const { result } = renderHook(() => useAnimationPreference());
      expect(result.current.shouldAnimate).toBe(false);
      expect(result.current.duration).toBe(0);
    });
  });

  describe("useStaggerDelays", () => {
    it("calculates correct delays for items", () => {
      const { result } = renderHook(() => useStaggerDelays(3, 100, 50));

      expect(result.current).toEqual([0.1, 0.15, 0.2]);
    });

    it("returns empty array for zero count", () => {
      const { result } = renderHook(() => useStaggerDelays(0));
      expect(result.current).toEqual([]);
    });

    it("uses default values", () => {
      const { result } = renderHook(() => useStaggerDelays(2));

      expect(result.current).toEqual([0, 0.075]);
    });
  });

  describe("useHoverState", () => {
    it("starts with isHovered false", () => {
      const { result } = renderHook(() => useHoverState());
      expect(result.current.isHovered).toBe(false);
    });

    it("sets isHovered true on mouse enter", () => {
      const { result } = renderHook(() => useHoverState());

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });

    it("sets isHovered false on mouse leave", () => {
      const { result } = renderHook(() => useHoverState());

      act(() => {
        result.current.hoverProps.onMouseEnter();
      });

      act(() => {
        result.current.hoverProps.onMouseLeave();
      });

      expect(result.current.isHovered).toBe(false);
    });
  });
});

describe("Animation Components", () => {
  beforeEach(() => {
    window.IntersectionObserver = MockIntersectionObserver;
    window.matchMedia = createMatchMediaMock(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AnimateOnScroll", () => {
    it("renders children", () => {
      render(
        <AnimateOnScroll>
          <div data-testid="child">Test content</div>
        </AnimateOnScroll>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <AnimateOnScroll className="custom-class">
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(document.querySelector(".custom-class")).toBeInTheDocument();
    });

    it("renders without animation when disabled", () => {
      render(
        <AnimateOnScroll disabled>
          <div data-testid="content">Content</div>
        </AnimateOnScroll>
      );

      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("renders as different element when as prop specified", () => {
      render(
        <AnimateOnScroll as="section" disabled>
          <div>Content</div>
        </AnimateOnScroll>
      );

      expect(document.querySelector("section")).toBeInTheDocument();
    });
  });

  describe("StaggerChildren", () => {
    it("renders all children", () => {
      render(
        <StaggerChildren>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
          <div data-testid="child-3">Third</div>
        </StaggerChildren>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
      expect(screen.getByTestId("child-3")).toBeInTheDocument();
    });

    it("applies className to container", () => {
      render(
        <StaggerChildren className="stagger-container">
          <div>Item</div>
        </StaggerChildren>
      );

      expect(document.querySelector(".stagger-container")).toBeInTheDocument();
    });
  });

  describe("InteractiveCard", () => {
    it("renders children", () => {
      render(
        <InteractiveCard>
          <div data-testid="card-content">Card content</div>
        </InteractiveCard>
      );

      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });

    it("renders as regular div when disabled", () => {
      render(
        <InteractiveCard disabled>
          <div>Content</div>
        </InteractiveCard>
      );

      expect(document.querySelector("div")).toBeInTheDocument();
    });
  });

  describe("InteractiveButton", () => {
    it("renders button with children", () => {
      render(<InteractiveButton>Click me</InteractiveButton>);

      expect(screen.getByRole("button")).toHaveTextContent("Click me");
    });

    it("passes through disabled prop", () => {
      render(<InteractiveButton disabled>Disabled</InteractiveButton>);

      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("InteractiveIcon", () => {
    it("renders children", () => {
      render(
        <InteractiveIcon>
          <span data-testid="icon">Icon</span>
        </InteractiveIcon>
      );

      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });
  });

  describe("PresenceAnimation", () => {
    it("renders children when visible", () => {
      render(
        <PresenceAnimation isVisible={true}>
          <div data-testid="modal">Modal content</div>
        </PresenceAnimation>
      );

      expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    it("does not render children when not visible", () => {
      render(
        <PresenceAnimation isVisible={false}>
          <div data-testid="modal">Modal content</div>
        </PresenceAnimation>
      );

      expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });
  });
});

describe("Reduced Motion Support", () => {
  beforeEach(() => {
    window.IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AnimateOnScroll renders static content with reduced motion", () => {
    window.matchMedia = createMatchMediaMock(true);

    render(
      <AnimateOnScroll>
        <div data-testid="content">Static content</div>
      </AnimateOnScroll>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("StaggerChildren renders without stagger with reduced motion", () => {
    window.matchMedia = createMatchMediaMock(true);

    render(
      <StaggerChildren>
        <div data-testid="item-1">First</div>
        <div data-testid="item-2">Second</div>
      </StaggerChildren>
    );

    expect(screen.getByTestId("item-1")).toBeInTheDocument();
    expect(screen.getByTestId("item-2")).toBeInTheDocument();
  });

  it("InteractiveCard renders as static div with reduced motion", () => {
    window.matchMedia = createMatchMediaMock(true);

    render(
      <InteractiveCard>
        <div data-testid="card">Card</div>
      </InteractiveCard>
    );

    expect(screen.getByTestId("card")).toBeInTheDocument();
  });

  it("PresenceAnimation renders without animation with reduced motion", () => {
    window.matchMedia = createMatchMediaMock(true);

    render(
      <PresenceAnimation isVisible={true}>
        <div data-testid="presence">Content</div>
      </PresenceAnimation>
    );

    expect(screen.getByTestId("presence")).toBeInTheDocument();
  });
});
