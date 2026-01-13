"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";
import { copyToClipboard } from "@/lib/clipboard";

// ============================================================================
// ICONS
// ============================================================================

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
        className="animate-draw-check"
      />
    </svg>
  );
}

// ============================================================================
// TYPES
// ============================================================================

type CopyButtonVariant = "icon" | "badge" | "inline" | "ghost";

interface CopyButtonProps {
  /** The text to copy to clipboard */
  text: string;
  /** Optional attribution to append (e.g., "-- Sydney Brenner, §42") */
  attribution?: string;
  /** Visual variant */
  variant?: CopyButtonVariant;
  /** Additional CSS classes */
  className?: string;
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** Custom success message (default: "Copied to clipboard") */
  successMessage?: string;
  /** Show text preview in toast */
  showPreview?: boolean;
  /** Label for accessibility and inline variant */
  label?: string;
  /** Callback after successful copy */
  onCopy?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CopyButton({
  text,
  attribution,
  variant = "icon",
  className,
  size = "md",
  successMessage = "Copied to clipboard",
  showPreview = true,
  label = "Copy",
  onCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { success, error } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Build the full text with attribution
    const fullText = attribution ? `${text}\n\n${attribution}` : text;

    const result = await copyToClipboard(fullText);

    if (result.success) {
      // Show success state
      setCopied(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset after animation
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);

      // Show toast with preview
      const preview = showPreview && text.length > 0
        ? text.length > 60
          ? `"${text.slice(0, 60)}..."`
          : `"${text}"`
        : undefined;

      success(successMessage, preview, 3000);

      // Optional haptic feedback on supported devices
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }

      // Callback
      onCopy?.();
    } else {
      console.error("Failed to copy:", result.error);
      error("Failed to copy", "Please try again");
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Size classes
  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  };

  const buttonSizeClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  // Variant styles
  const variantClasses = {
    icon: cn(
      "relative inline-flex items-center justify-center rounded-lg",
      "text-muted-foreground hover:text-foreground",
      "hover:bg-muted/80 active:scale-95",
      "transition-all duration-200",
      "opacity-0 group-hover:opacity-100 focus:opacity-100",
      buttonSizeClasses[size]
    ),
    badge: cn(
      "relative inline-flex items-center gap-1.5 rounded-lg",
      "px-2.5 py-1 text-xs font-medium",
      "bg-primary/10 text-primary border border-primary/20",
      "hover:bg-primary/20 active:scale-95",
      "transition-all duration-200"
    ),
    inline: cn(
      "relative inline-flex items-center gap-1.5 rounded-md",
      "px-2 py-0.5 text-sm",
      "text-muted-foreground hover:text-foreground",
      "hover:bg-muted/60 active:scale-95",
      "transition-all duration-200"
    ),
    ghost: cn(
      "relative inline-flex items-center justify-center rounded-md",
      "text-muted-foreground hover:text-foreground",
      "hover:bg-muted/60 active:scale-95",
      "transition-all duration-200",
      buttonSizeClasses[size]
    ),
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variantClasses[variant],
        copied && "text-success",
        className
      )}
      aria-label={copied ? "Copied!" : label}
      title={copied ? "Copied!" : label}
    >
      {/* Icon container with animation */}
      <span className="relative">
        {/* Copy icon - fades out when copied */}
        <span
          className={cn(
            "transition-all duration-200",
            copied ? "opacity-0 scale-75" : "opacity-100 scale-100"
          )}
        >
          <CopyIcon className={sizeClasses[size]} />
        </span>

        {/* Checkmark icon - fades in when copied */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "transition-all duration-200",
            copied ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
        >
          <CheckIcon className={cn(sizeClasses[size], "text-success")} />
        </span>
      </span>

      {/* Label for inline/badge variants */}
      {(variant === "inline" || variant === "badge") && (
        <span className={cn(copied && "text-success")}>
          {copied ? "Copied!" : label}
        </span>
      )}

      {/* Ripple effect on click */}
      <span
        className={cn(
          "absolute inset-0 rounded-lg",
          "pointer-events-none",
          copied && "animate-ripple bg-success/20"
        )}
      />
    </button>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { CopyButtonProps, CopyButtonVariant };
