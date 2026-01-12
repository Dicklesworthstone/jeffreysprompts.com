"use client";

import { forwardRef, type MouseEvent, type AnchorHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";
import { useViewTransition } from "@/hooks/useViewTransition";

type ViewTransitionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  LinkProps & {
    /** Disable view transition for this link */
    noTransition?: boolean;
    /** Children to render inside the link */
    children: React.ReactNode;
  };

/**
 * Next.js Link component with View Transitions API support
 *
 * Automatically uses view transitions for same-origin navigation
 * when the browser supports it and the user hasn't enabled reduced motion.
 *
 * @example
 * ```tsx
 * <ViewTransitionLink href="/about">About</ViewTransitionLink>
 *
 * // Disable transition for specific link
 * <ViewTransitionLink href="/settings" noTransition>Settings</ViewTransitionLink>
 * ```
 */
export const ViewTransitionLink = forwardRef<HTMLAnchorElement, ViewTransitionLinkProps>(
  function ViewTransitionLink({ href, onClick, noTransition, children, ...props }, ref) {
    const { navigateWithTransition, isSupported } = useViewTransition();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // Call original onClick if provided
      onClick?.(e);

      // Don't intercept if:
      // - Default was prevented
      // - Modified key pressed (cmd/ctrl click for new tab)
      // - Not a left click
      // - External link
      // - Transitions disabled
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 ||
        noTransition ||
        !isSupported
      ) {
        return;
      }

      // Check if it's an external link
      const hrefString = typeof href === "string" ? href : href.href || href.pathname || "";
      if (hrefString.startsWith("http") || hrefString.startsWith("//")) {
        return;
      }

      // Prevent default navigation
      e.preventDefault();

      // Navigate with view transition
      navigateWithTransition(hrefString);
    };

    return (
      <Link ref={ref} href={href} onClick={handleClick} {...props}>
        {children}
      </Link>
    );
  }
);

export default ViewTransitionLink;
