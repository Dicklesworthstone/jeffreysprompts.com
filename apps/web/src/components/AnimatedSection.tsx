"use client";

/**
 * AnimatedSection - Scroll-triggered entrance animations
 *
 * Uses Intersection Observer for performant scroll-based animations.
 * Supports staggered children animations and multiple animation variants.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Children, type ReactNode, useRef, useState, useEffect } from "react";

type AnimationVariant = "fadeUp" | "fadeIn" | "slideLeft" | "slideRight" | "scale";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  /** Animation variant to use */
  variant?: AnimationVariant;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Duration of animation (in seconds) */
  duration?: number;
  /** Threshold for intersection observer (0-1) */
  threshold?: number;
  /** Whether to animate only once or every time it enters viewport */
  once?: boolean;
  /** Enable staggered children animation */
  stagger?: boolean;
  /** Stagger delay between children (in seconds) */
  staggerDelay?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

const variants: Record<AnimationVariant, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function AnimatedSection({
  children,
  className,
  variant = "fadeUp",
  delay = 0,
  duration = 0.5,
  threshold = 0.1,
  once = true,
  stagger = false,
  staggerDelay = 0.1,
  rootMargin = "-50px",
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  // If user prefers reduced motion, just show content without animation
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants: Variants = stagger
    ? {
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }
    : {
        hidden: variants[variant].hidden,
        visible: {
          ...variants[variant].visible,
          transition: {
            duration,
            delay,
            ease: [0.25, 0.1, 0.25, 1],
          },
        },
      };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {stagger ? (
        // Wrap children for stagger animation
        <StaggerChildren variant={variant} duration={duration}>
          {children}
        </StaggerChildren>
      ) : (
        children
      )}
    </motion.div>
  );
}

/**
 * StaggerChildren - Wrapper for staggered child animations
 */
interface StaggerChildrenProps {
  children: ReactNode;
  variant: AnimationVariant;
  duration: number;
}

function StaggerChildren({ children, variant, duration }: StaggerChildrenProps) {
  const childVariants: Variants = {
    hidden: variants[variant].hidden,
    visible: {
      ...variants[variant].visible,
      transition: {
        duration,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  // Wrap each direct child with motion.div, using child's own key when available
  return (
    <>
      {Children.map(children, (child, index) => (
        <motion.div key={(child as { key?: string })?.key ?? `stagger-${index}`} variants={childVariants}>
          {child}
        </motion.div>
      ))}
    </>
  );
}

/**
 * AnimatedItem - Individual animated item for use within AnimatedSection with stagger
 */
interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
  variant?: AnimationVariant;
  duration?: number;
}

export function AnimatedItem({
  children,
  className,
  variant = "fadeUp",
  duration = 0.5,
}: AnimatedItemProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants: Variants = {
    hidden: variants[variant].hidden,
    visible: {
      ...variants[variant].visible,
      transition: {
        duration,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

export default AnimatedSection;
