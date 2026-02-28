/**
 * Tests for animations/motion-variants.ts — Framer Motion config
 */
import { describe, it, expect } from "vitest";
import {
  TIMING,
  EASING,
  transitions,
  fadeUp,
  fadeIn,
  scaleIn,
  popIn,
  slideInRight,
  slideInLeft,
  blurIn,
  staggerContainer,
  staggerFast,
  staggerNormal,
  staggerSlow,
  cardHover,
  buttonHover,
  buttonTap,
  iconHover,
  fadeOut,
  scaleOut,
  slideOutDown,
  pageFade,
  pageSlideUp,
  backdrop,
  modalContent,
  bottomSheet,
  accordionContent,
  skeletonShimmer,
  spinner,
  withDelay,
  viewport,
} from "./motion-variants";

describe("motion-variants", () => {
  describe("TIMING", () => {
    it("has expected timing values", () => {
      expect(TIMING.micro).toBe(0.15);
      expect(TIMING.fast).toBe(0.3);
      expect(TIMING.normal).toBe(0.5);
      expect(TIMING.slow).toBe(0.8);
      expect(TIMING.complex).toBe(1.0);
    });

    it("timings are in ascending order", () => {
      expect(TIMING.micro).toBeLessThan(TIMING.fast);
      expect(TIMING.fast).toBeLessThan(TIMING.normal);
      expect(TIMING.normal).toBeLessThan(TIMING.slow);
      expect(TIMING.slow).toBeLessThan(TIMING.complex);
    });
  });

  describe("EASING", () => {
    it("all easing curves are 4-element arrays", () => {
      for (const curve of Object.values(EASING)) {
        expect(curve).toHaveLength(4);
        for (const val of curve) {
          expect(typeof val).toBe("number");
        }
      }
    });
  });

  describe("transitions", () => {
    it("micro uses TIMING.micro", () => {
      expect(transitions.micro.duration).toBe(TIMING.micro);
    });

    it("spring uses spring type", () => {
      expect(transitions.spring.type).toBe("spring");
    });
  });

  describe("entry variants", () => {
    it("fadeUp has hidden and visible states", () => {
      expect(fadeUp.hidden).toBeDefined();
      expect(fadeUp.visible).toBeDefined();
    });

    it("fadeIn has hidden with opacity 0", () => {
      expect((fadeIn.hidden as Record<string, unknown>).opacity).toBe(0);
    });

    it("scaleIn starts scaled down", () => {
      expect((scaleIn.hidden as Record<string, unknown>).scale).toBe(0.95);
    });

    it("popIn uses spring transition", () => {
      const visible = popIn.visible as Record<string, unknown>;
      expect(visible.transition).toBe(transitions.spring);
    });

    it("slideInRight starts offset right", () => {
      expect((slideInRight.hidden as Record<string, unknown>).x).toBe(30);
    });

    it("slideInLeft starts offset left", () => {
      expect((slideInLeft.hidden as Record<string, unknown>).x).toBe(-30);
    });

    it("blurIn starts with blur", () => {
      expect((blurIn.hidden as Record<string, unknown>).filter).toContain("blur");
    });
  });

  describe("stagger variants", () => {
    it("staggerContainer creates variants with custom delay", () => {
      const variants = staggerContainer(0.2);
      expect(variants.hidden).toBeDefined();
      expect(variants.visible).toBeDefined();
    });

    it("staggerFast/Normal/Slow are defined", () => {
      expect(staggerFast.visible).toBeDefined();
      expect(staggerNormal.visible).toBeDefined();
      expect(staggerSlow.visible).toBeDefined();
    });
  });

  describe("hover/tap effects", () => {
    it("cardHover moves up", () => {
      expect(cardHover.y).toBe(-4);
    });

    it("buttonHover scales up", () => {
      expect(buttonHover.scale).toBe(1.02);
    });

    it("buttonTap scales down", () => {
      expect(buttonTap.scale).toBe(0.98);
    });

    it("iconHover scales up more", () => {
      expect(iconHover.scale).toBe(1.1);
    });
  });

  describe("exit variants", () => {
    it("fadeOut has exit state", () => {
      expect(fadeOut.exit).toBeDefined();
    });

    it("scaleOut scales down on exit", () => {
      expect((scaleOut.exit as Record<string, unknown>).scale).toBe(0.95);
    });

    it("slideOutDown moves down on exit", () => {
      expect((slideOutDown.exit as Record<string, unknown>).y).toBe(20);
    });
  });

  describe("page transitions", () => {
    it("pageFade has initial/animate/exit", () => {
      expect(pageFade.initial).toBeDefined();
      expect(pageFade.animate).toBeDefined();
      expect(pageFade.exit).toBeDefined();
    });

    it("pageSlideUp has y offset", () => {
      expect((pageSlideUp.initial as Record<string, unknown>).y).toBe(20);
    });
  });

  describe("modal variants", () => {
    it("backdrop has hidden/visible/exit", () => {
      expect(backdrop.hidden).toBeDefined();
      expect(backdrop.visible).toBeDefined();
      expect(backdrop.exit).toBeDefined();
    });

    it("modalContent starts scaled down", () => {
      expect((modalContent.hidden as Record<string, unknown>).scale).toBe(0.95);
    });

    it("bottomSheet slides from bottom", () => {
      expect((bottomSheet.hidden as Record<string, unknown>).y).toBe("100%");
    });
  });

  describe("accordion", () => {
    it("accordionContent has collapsed and expanded", () => {
      expect(accordionContent.collapsed).toBeDefined();
      expect(accordionContent.expanded).toBeDefined();
    });

    it("collapsed state has height 0", () => {
      expect((accordionContent.collapsed as Record<string, unknown>).height).toBe(0);
    });
  });

  describe("loading variants", () => {
    it("skeletonShimmer has initial and animate", () => {
      expect(skeletonShimmer.initial).toBeDefined();
      expect(skeletonShimmer.animate).toBeDefined();
    });

    it("spinner rotates 360", () => {
      expect((spinner.animate as Record<string, unknown>).rotate).toBe(360);
    });
  });

  describe("withDelay", () => {
    it("adds delay to transitions", () => {
      const delayed = withDelay(fadeUp, 200);
      const visible = delayed.visible as { transition: { delay: number } };
      expect(visible.transition.delay).toBe(0.2);
    });

    it("preserves hidden state", () => {
      const delayed = withDelay(fadeIn, 100);
      expect((delayed.hidden as Record<string, unknown>).opacity).toBe(0);
    });

    it("adds to existing delay", () => {
      const variants = {
        visible: { opacity: 1, transition: { duration: 0.5, delay: 0.1 } },
      };
      const delayed = withDelay(variants, 200);
      const visible = delayed.visible as { transition: { delay: number } };
      expect(visible.transition.delay).toBeCloseTo(0.3);
    });
  });

  describe("viewport", () => {
    it("has once/early/always presets", () => {
      expect(viewport.once.once).toBe(true);
      expect(viewport.early.once).toBe(true);
      expect(viewport.always.once).toBe(false);
    });
  });
});
