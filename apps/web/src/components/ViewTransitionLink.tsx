"use client";

import { forwardRef, type MouseEvent, type AnchorHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";
import { useLocale } from "next-intl";
import { useViewTransition } from "@/hooks/useViewTransition";
import { localizeHref } from "@/i18n/config";

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
    const locale = useLocale();
    const { navigateWithTransition, isSupported } = useViewTransition();
    const localizedHref = localizeLinkHref(href, locale);

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
      const hrefString =
        typeof localizedHref === "string"
          ? localizedHref
          : localizedHref.href || localizedHref.pathname || "";
      if (
        hrefString.startsWith("http") ||
        hrefString.startsWith("//") ||
        /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(hrefString)
      ) {
        return;
      }

      // Prevent default navigation
      e.preventDefault();

      // Navigate with view transition
      navigateWithTransition(hrefString);
    };

    return (
      <Link ref={ref} href={localizedHref} onClick={handleClick} {...props}>
        {children}
      </Link>
    );
  }
);

function localizeLinkHref(href: LinkProps["href"], locale: string): LinkProps["href"] {
  if (typeof href === "string") {
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("//") ||
      href.startsWith("#") ||
      href.startsWith("?") ||
      /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)
    ) {
      return href;
    }

    const hashIndex = href.indexOf("#");
    const searchIndex = href.indexOf("?");
    const suffixIndex =
      hashIndex === -1
        ? searchIndex
        : searchIndex === -1
          ? hashIndex
          : Math.min(hashIndex, searchIndex);
    const pathname = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? "" : href.slice(suffixIndex);

    return `${localizeHref(locale, pathname || "/")}${suffix}`;
  }

  if (
    typeof href === "object" &&
    href !== null &&
    typeof href.pathname === "string" &&
    href.pathname.startsWith("/")
  ) {
    return {
      ...href,
      pathname: localizeHref(locale, href.pathname),
    };
  }

  return href;
}

export default ViewTransitionLink;
