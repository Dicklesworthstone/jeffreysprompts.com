"use client";

import { Menu, X, Sparkles, ShoppingBasket, Crown } from "lucide-react";
import { ViewTransitionLink } from "./ViewTransitionLink";
import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SpotlightTrigger } from "./SpotlightSearch";
import { BasketSidebar } from "./BasketSidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useBasket } from "@/hooks/use-basket";
import { cn } from "@/lib/utils";
import { MagneticButton } from "./MagneticButton";

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
    const handleToggleBasket = () => {
      setBasketOpen((prev) => !prev);
    };

    window.addEventListener("toggle-basket", handleToggleBasket);
    return () => window.removeEventListener("toggle-basket", handleToggleBasket);
  }, [setBasketOpen]);

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
      <nav className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <ViewTransitionLink
          href="/"
          className="group flex items-center gap-2.5 font-bold text-xl transition-all duration-300"
        >
          <motion.div
            whileHover={{ rotate: 15, scale: 1.15 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
          >
            <Sparkles className="h-5 w-5" />
          </motion.div>
          <span className="hidden sm:inline tracking-tight">
            Jeffreys<span className="text-indigo-500">Prompts</span>
          </span>
          <span className="sm:hidden text-indigo-500">JFP</span>
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
                  "relative px-4 py-2 text-sm font-semibold transition-colors duration-300 rounded-full",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                <span className="relative z-10">{link.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </ViewTransitionLink>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Pro links - desktop only */}
          <a
            href={`${PRO_URL}/sign-in`}
            className="hidden lg:inline-flex text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 px-3 py-2"
            rel="noopener noreferrer"
          >
            Login
          </a>
          
          <MagneticButton
            variant="primary"
            strength={0.2}
            glowColor="rgba(251, 191, 36, 0.4)"
            className="hidden lg:flex items-center gap-1.5 h-10 px-5 rounded-full font-bold shadow-indigo-500/20"
            onClick={() => window.open(PRO_URL, "_blank")}
          >
            <Crown className="h-4 w-4 text-amber-300" />
            <span>Go Pro</span>
          </MagneticButton>

          <div className="flex items-center gap-1">
            <div className="hidden sm:block mr-1">
              <LanguageSwitcher />
            </div>
            <SpotlightTrigger className="mr-1 h-10 border-none bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800" />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 relative overflow-visible rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setBasketOpen(true)}
              aria-label={`Open basket (${items.length} items)`}
            >
              <ShoppingBasket className="h-5 w-5" />
              <AnimatePresence>
                {items.length > 0 && (
                  <motion.span
                    key="basket-count"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-indigo-500 text-xs font-bold text-white flex items-center justify-center shadow-md shadow-indigo-500/20"
                  >
                    {items.length > 9 ? "9+" : items.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <ThemeToggle />
          </div>

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
                  <div className="py-3 sm:hidden">
                    <LanguageSwitcher />
                  </div>
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
                  <ViewTransitionLink
                    href="/history"
                    className="flex items-center min-h-[44px] py-3 text-sm font-medium text-muted-foreground hover:text-foreground touch-manipulation sm:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    History
                  </ViewTransitionLink>
                </nav>

                <div className="mt-auto border-t border-border/60 px-5 py-3">
                  <a
                    href={`${PRO_URL}/sign-in`}
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
