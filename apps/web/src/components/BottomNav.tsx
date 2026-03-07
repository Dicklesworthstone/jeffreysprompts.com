"use client";

/**
 * BottomNav - Mobile-only bottom navigation bar
 *
 * Features:
 * - Shows on mobile (md:hidden)
 * - 4 primary navigation items with icons
 * - Framer Motion sliding indicator
 * - iOS safe area support
 * - Accessible with proper ARIA labels
 */

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Package, Settings, Workflow } from "lucide-react";
import { ViewTransitionLink } from "./ViewTransitionLink";
import { cn } from "@/lib/utils";
import { stripLocalePrefix } from "@/i18n/config";

const navItems = [
  { href: "/", label: "Browse", icon: Home },
  { href: "/bundles", label: "Bundles", icon: Package },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const normalizedPathname = stripLocalePrefix(pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Mobile navigation"
    >
      {/* Glass background with blur */}
      <div className="border-t border-border/40 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
        {/* Safe area padding for iOS */}
        <div className="pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-16 items-center justify-around px-2">
            {navItems.map((item) => {
              const isActive = isActiveRoute(normalizedPathname, item.href);
              const Icon = item.icon;

              return (
                <ViewTransitionLink
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors touch-manipulation",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Sliding background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-primary/10 dark:bg-primary/15"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}

                  {/* Icon */}
                  <Icon
                    className={cn(
                      "relative z-10 h-5 w-5 transition-transform",
                      isActive && "scale-110"
                    )}
                  />

                  {/* Label */}
                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-medium leading-none",
                      isActive && "font-semibold"
                    )}
                  >
                    {item.label}
                  </span>
                </ViewTransitionLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
