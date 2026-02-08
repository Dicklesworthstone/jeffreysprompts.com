"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** Magnetic pull strength (0-1) */
  strength?: number;
  /** Glow color (CSS color value) */
  glowColor?: string;
  /** Glow intensity on hover (0-1) */
  glowIntensity?: number;
  /** Scale on press */
  pressScale?: number;
  /** Enable bounce on click completion */
  bounceOnClick?: boolean;
  /** Additional props passed to button */
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "ghost";
}

/**
 * MagneticButton - Premium button with magnetic cursor, glow, and micro-interactions.
 *
 * Features:
 * - Magnetic cursor attraction on hover
 * - Dynamic glow effect following cursor
 * - Press scale with spring physics
 * - Bounce animation on click
 * - Inner highlight on press
 * - Respects reduced motion preferences
 *
 * @example
 * ```tsx
 * <MagneticButton
 *   glowColor="rgb(99, 102, 241)"
 *   strength={0.3}
 *   onClick={handleClick}
 * >
 *   Get Started
 * </MagneticButton>
 * ```
 */
export function MagneticButton({
  children,
  className,
  strength = 0.25,
  glowColor = "rgb(99, 102, 241)",
  glowIntensity = 0.5,
  pressScale = 0.97,
  bounceOnClick = true,
  onClick,
  disabled = false,
  type = "button",
  variant = "primary",
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  // Spring configuration for magnetic movement
  const springConfig = { stiffness: 400, damping: 30 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  // Transform for inner content offset (moves slightly with magnetic pull)
  const contentX = useTransform(x, (val) => val * 0.5);
  const contentY = useTransform(y, (val) => val * 0.5);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    // Skip magnetic effect for reduced motion
    if (!buttonRef.current || disabled || prefersReducedMotion) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate distance from center
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    // Apply magnetic pull
    x.set(deltaX * strength);
    y.set(deltaY * strength);

    // Update glow position (percentage based)
    const glowX = ((e.clientX - rect.left) / rect.width) * 100;
    const glowY = ((e.clientY - rect.top) / rect.height) * 100;
    setGlowPosition({ x: glowX, y: glowY });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
    setGlowPosition({ x: 50, y: 50 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  const variantStyles = {
    primary: cn(
      "bg-indigo-600 dark:bg-indigo-500",
      "text-white font-bold",
      "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.05)]",
      "hover:bg-indigo-700 dark:hover:bg-indigo-400"
    ),
    secondary: cn(
      "bg-white/10 backdrop-blur-sm border border-white/20",
      "text-white font-medium",
      "hover:bg-white/15"
    ),
    ghost: cn(
      "bg-transparent",
      "text-gray-700 dark:text-gray-200 font-medium",
      "hover:bg-gray-100 dark:hover:bg-gray-800"
    ),
  };

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ x, y }}
      animate={{
        scale: isPressed ? pressScale : 1,
      }}
      whileTap={bounceOnClick && !prefersReducedMotion ? { scale: [pressScale, 1.02, 1] } : undefined}
      transition={{
        scale: {
          type: "spring",
          stiffness: 500,
          damping: 25,
        },
      }}
      className={cn(
        "relative overflow-hidden",
        "px-6 py-3 rounded-xl",
        "transition-all duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        className
      )}
    >
      {/* Glow effect layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${glowColor}, transparent 70%)`,
        }}
        animate={{
          opacity: isHovered ? glowIntensity : 0,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Inner highlight on press */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)",
        }}
        animate={{
          opacity: isPressed ? 1 : 0,
        }}
        transition={{ duration: 0.1 }}
      />

      {/* Content with slight magnetic offset */}
      <motion.span
        className="relative z-10 flex items-center justify-center gap-2"
        style={{ x: contentX, y: contentY }}
      >
        {children}
      </motion.span>

      {/* Shimmer effect on hover - skip for reduced motion */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            transform: "translateX(-100%)",
          }}
          animate={{
            x: isHovered ? ["0%", "200%"] : "-100%",
          }}
          transition={{
            duration: 0.8,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  );
}

export default MagneticButton;
