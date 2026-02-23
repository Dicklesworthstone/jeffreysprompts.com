import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    // Enhanced transition with cubic-bezier for buttery feel
    "transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] touch-manipulation select-none",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    // Enhanced focus ring with smooth animation
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Press feedback: satisfying scale with spring-like return
    "active:scale-[0.97] active:transition-transform active:duration-75",
    // Subtle position shift on hover for tactile feel
    "hover:-translate-y-[1px]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          // Enhanced shadow progression: subtle at rest, pronounced on hover
          "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:bg-primary/90 hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.06)]",
          "active:bg-primary/95 active:shadow-[0_1px_2px_rgba(0,0,0,0.1)] active:translate-y-0",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.1)]",
          "hover:bg-destructive/90 hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.06)]",
          "active:bg-destructive/95 active:translate-y-0",
          "focus-visible:ring-destructive/50",
        ].join(" "),
        outline: [
          "border border-border bg-background",
          // Subtle inner shadow for depth
          "shadow-[0_1px_2px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.5)]",
          "hover:bg-muted/50 hover:border-border/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04)]",
          "active:bg-muted/70 active:translate-y-0",
          "dark:bg-card dark:hover:bg-muted/40 dark:shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.02)]",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
          "hover:bg-secondary/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)]",
          "active:bg-secondary/90 active:translate-y-0",
        ].join(" "),
        ghost: [
          "hover:bg-muted/60 hover:text-foreground",
          "active:bg-muted/80 active:translate-y-0",
          "dark:hover:bg-muted/40 dark:active:bg-muted/50",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline hover:translate-y-0",
          "active:scale-100 active:text-primary/80 active:translate-y-0",
        ].join(" "),
        glow: [
          "bg-primary text-primary-foreground",
          "shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_20px_var(--primary)/15]",
          "hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),0_0_30px_var(--primary)/25]",
          "active:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_15px_var(--primary)/20] active:translate-y-0",
          "dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_0_25px_var(--primary)/25]",
          "dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.2),0_0_40px_var(--primary)/35]",
        ].join(" "),
      },
      size: {
        // Touch-friendly heights: 44px on mobile, 40px on desktop
        default: "h-11 sm:h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 text-base has-[>svg]:px-4",
        xl: "h-14 rounded-xl px-8 text-lg has-[>svg]:px-6",
        // Icon buttons: 44px on mobile for touch, 40px on desktop
        icon: "size-11 sm:size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, loading, children, disabled, ...props }, ref) => {
    // If loading, we provide custom children (a fragment), which breaks Radix Slot. Fall back to "button".
    const Comp = asChild && !loading ? Slot : "button"

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin size-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
