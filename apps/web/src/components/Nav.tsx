"use client";

import Link from "next/link";
import { Github, Menu, X, Sparkles, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { BasketSidebar } from "./BasketSidebar";
import { Button } from "./ui/button";
import { useBasket } from "@/hooks/use-basket";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Prompts" },
  { href: "/bundles", label: "Bundles" },
  { href: "/contribute", label: "Contribute" },
  { href: "/workflows", label: "Workflows" },
  { href: "/how_it_was_made", label: "How It Was Made" },
];

export function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const { items } = useBasket();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg transition-colors hover:text-primary"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">JeffreysPrompts</span>
          <span className="sm:hidden">JFP</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            onClick={() => setBasketOpen(true)}
            aria-label={`Open basket (${items.length} items)`}
          >
            <ShoppingBasket className="h-5 w-5" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {items.length > 9 ? "9+" : items.length}
              </span>
            )}
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <a
              href="https://github.com/Dicklesworthstone/jeffreysprompts.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "max-h-48" : "max-h-0"
        )}
      >
        <div className="container mx-auto px-4 py-3 space-y-1 border-t border-border/40">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Basket Sidebar */}
      <BasketSidebar isOpen={basketOpen} onClose={() => setBasketOpen(false)} />
    </header>
  );
}
