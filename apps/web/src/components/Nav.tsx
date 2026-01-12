"use client";

import { Github, Menu, X, Sparkles, ShoppingBasket, Crown } from "lucide-react";
import { ViewTransitionLink } from "./ViewTransitionLink";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { BasketSidebar } from "./BasketSidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useBasket } from "@/hooks/use-basket";

// Pro site URL - use env var if available, otherwise default
const PRO_URL = process.env.NEXT_PUBLIC_PRO_URL ?? "https://pro.jeffreysprompts.com";

// Simplified nav - only essential links. Workflows + How It Was Made moved to footer.
const navLinks = [
  { href: "/", label: "Browse" },
  { href: "/bundles", label: "Bundles" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contribute", label: "Contribute" },
];

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const { items } = useBasket();

  useEffect(() => {
    const handleToggleBasket = () => setBasketOpen((prev) => !prev);
    window.addEventListener("toggle-basket", handleToggleBasket);
    return () => window.removeEventListener("toggle-basket", handleToggleBasket);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <ViewTransitionLink
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </ViewTransitionLink>
          ))}
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
                  {navLinks.map((link) => (
                    <ViewTransitionLink
                      key={link.href}
                      href={link.href}
                      className="block min-h-[44px] py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </ViewTransitionLink>
                  ))}
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
