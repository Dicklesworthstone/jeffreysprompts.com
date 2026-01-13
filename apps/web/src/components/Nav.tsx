"use client";

import { Github, Menu, X, Sparkles, ShoppingBasket, Crown } from "lucide-react";
import { ViewTransitionLink } from "./ViewTransitionLink";
import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "./theme-toggle";
import { BasketSidebar } from "./BasketSidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useBasket } from "@/hooks/use-basket";
import { cn } from "@/lib/utils";

/**
 * Custom hook for scroll-aware header behavior
 * - Hides header on scroll down (mobile only)
 * - Shows header on scroll up
 * - Tracks if page is scrolled for shadow effect
 */
function useScrollHeader() {
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollState = useCallback(() => {
    const scrollY = window.scrollY;
    const scrollDelta = scrollY - lastScrollY.current;

    // Only hide/show on mobile (check viewport width)
    const isMobile = window.innerWidth < 768;

    // Update scrolled state (for shadow)
    setIsScrolled(scrollY > 10);

    if (isMobile) {
      // Hide on scroll down (after scrolling 50px), show on scroll up
      if (scrollDelta > 10 && scrollY > 100) {
        setIsHidden(true);
      } else if (scrollDelta < -10 || scrollY < 50) {
        setIsHidden(false);
      }
    } else {
      // Always show on desktop
      setIsHidden(false);
    }

    lastScrollY.current = scrollY;
    ticking.current = false;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollState);
        ticking.current = true;
      }
    };

    // Also handle resize to reset on viewport change
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsHidden(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateScrollState]);

  return { isHidden, isScrolled };
}

// Pro site URL - use env var if available, otherwise default
const PRO_URL = process.env.NEXT_PUBLIC_PRO_URL ?? "https://pro.jeffreysprompts.com";

// Simplified nav - only essential links. Workflows + How It Was Made moved to footer.
const navLinks = [
  { href: "/", label: "Browse" },
  { href: "/bundles", label: "Bundles" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contribute", label: "Contribute" },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const { items } = useBasket();
  const { isHidden, isScrolled } = useScrollHeader();

  useEffect(() => {
    const handleToggleBasket = () => setBasketOpen((prev) => !prev);
    window.addEventListener("toggle-basket", handleToggleBasket);
    return () => window.removeEventListener("toggle-basket", handleToggleBasket);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "transition-all duration-300 ease-out",
        // Border and shadow based on scroll state
        isScrolled
          ? "border-border/60 shadow-sm"
          : "border-border/40",
        // Hide/show on mobile
        isHidden
          ? "-translate-y-full md:translate-y-0"
          : "translate-y-0"
      )}
    >
      <nav className="container mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <ViewTransitionLink
          href="/"
          className="flex items-center gap-2 font-semibold text-lg transition-colors hover:text-primary"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">JeffreysPrompts</span>
          <span className="sm:hidden">JFP</span>
        </ViewTransitionLink>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = isActiveRoute(pathname, link.href);
            return (
              <ViewTransitionLink
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-indicator"
                    className="absolute inset-x-1 -bottom-[13px] h-0.5 bg-primary rounded-full"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
              </ViewTransitionLink>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Pro links - desktop only */}
          <a
            href={`${PRO_URL}/login`}
            className="hidden lg:inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            rel="noopener noreferrer"
          >
            Login
          </a>
          <Button
            variant="default"
            size="sm"
            asChild
            className="hidden lg:inline-flex gap-1.5 h-8 px-3"
          >
            <a href={PRO_URL} rel="noopener noreferrer">
              <Crown className="h-3.5 w-3.5" />
              Go Pro
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 relative touch-manipulation"
            onClick={() => setBasketOpen(true)}
            aria-label={`Open basket (${items.length} items)`}
          >
            <ShoppingBasket className="h-5 w-5" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-xs font-bold text-primary-foreground flex items-center justify-center">
                {items.length > 9 ? "9+" : items.length}
              </span>
            )}
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild className="h-11 w-11 touch-manipulation">
            <a
              href="https://github.com/Dicklesworthstone/jeffreysprompts.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>

          {/* Mobile menu button + drawer */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-11 w-11 touch-manipulation"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 gap-0">
              <SheetHeader className="border-b border-border/60 px-5 py-4">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-primary" />
                  JeffreysPrompts
                </SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col">
                <nav className="flex flex-col px-5 py-2" aria-label="Mobile navigation">
                  {navLinks.map((link) => {
                    const isActive = isActiveRoute(pathname, link.href);
                    return (
                      <ViewTransitionLink
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "relative flex items-center min-h-[44px] py-3 text-sm font-medium transition-colors touch-manipulation",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                        )}
                        <span className={cn(isActive && "pl-3")}>{link.label}</span>
                      </ViewTransitionLink>
                    );
                  })}
                </nav>

                <div className="mt-auto border-t border-border/60 px-5 py-3">
                  <a
                    href={`${PRO_URL}/login`}
                    className="block min-h-[44px] py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </a>
                  <a
                    href={PRO_URL}
                    className="flex items-center gap-2 min-h-[44px] py-3 text-sm font-medium text-primary transition-colors hover:text-primary/80 touch-manipulation"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Crown className="h-4 w-4" />
                    Go Pro
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Basket Sidebar */}
      <BasketSidebar isOpen={basketOpen} onClose={() => setBasketOpen(false)} />
    </header>
  );
}
