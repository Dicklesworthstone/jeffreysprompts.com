"use client";

/**
 * BottomTabBar - Hyper-optimized mobile navigation.
 * 
 * Features:
 * - Liquid active indicator transitions
 * - Precision haptic feedback integration
 * - Context-aware transparency
 * - Staggered 'More' menu entrance
 */

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Package,
  Search,
  Workflow,
  Menu,
  X,
  Gift,
  Info,
  ShoppingBasket,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrecisionHaptic } from "@/hooks/usePrecisionHaptic";

interface TabItem {
  id: string;
  label: string;
  icon: typeof Home;
  href?: string;
  action?: "search" | "menu";
}

const tabs: TabItem[] = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "bundles", label: "Bundles", icon: Package, href: "/bundles" },
  { id: "search", label: "Search", icon: Search, action: "search" },
  { id: "workflows", label: "Workflows", icon: Workflow, href: "/workflows" },
  { id: "more", label: "More", icon: Menu, action: "menu" },
];

interface MoreMenuItem {
  label: string;
  icon: typeof Home;
  href?: string;
  action?: "basket";
}

const moreMenuItems: MoreMenuItem[] = [
  { label: "Basket", icon: ShoppingBasket, action: "basket" },
  { label: "Pricing", icon: CreditCard, href: "/pricing" },
  { label: "Contribute", icon: Gift, href: "/contribute" },
  { label: "How It's Made", icon: Info, href: "/how_it_was_made" },
];

interface BottomTabBarProps {
  /** Callback to open spotlight search */
  onOpenSearch?: () => void;
  /** Additional className */
  className?: string;
}

export function BottomTabBar({ onOpenSearch, className }: BottomTabBarProps) {
  const pathname = usePathname();
  const haptic = usePrecisionHaptic();

  const [isVisible, setIsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      if (Math.abs(diff) > scrollThreshold) {
        if (diff > 0 && currentScrollY > 100) {
          setIsVisible(false);
          setMenuOpen(false);
        } else {
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = useCallback(
    (tab: TabItem) => {
      if (!tab.href) return false;
      if (tab.href === "/") return pathname === "/";
      return pathname.startsWith(tab.href);
    },
    [pathname]
  );

  const handleTabClick = useCallback(
    (tab: TabItem) => {
      haptic.light();

      if (tab.action === "search") {
        setMenuOpen(false);
        onOpenSearch?.();
      } else if (tab.action === "menu") {
        setMenuOpen((prev) => !prev);
      }
    },
    [haptic, onOpenSearch]
  );

  const handleMoreAction = useCallback(
    (item: MoreMenuItem) => {
      if (item.action === "basket") {
        window.dispatchEvent(new CustomEvent("toggle-basket"));
      }
      haptic.medium();
      setMenuOpen(false);
    },
    [haptic]
  );

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden overflow-hidden">
            {/* Backdrop with dramatic blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setMenuOpen(false)}
            />
            
            {/* Staggered Menu */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 left-4"
            >
              <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border-2 border-white/10 overflow-hidden p-4">
                <div className="grid grid-cols-2 gap-3">
                  {moreMenuItems.map((item, index) => {
                    const content = (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 + 0.1 }}
                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-neutral-100 dark:bg-neutral-800 transition-all hover:bg-indigo-500 hover:text-white"
                      >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                      </motion.div>
                    );

                    if (item.href) {
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            haptic.medium();
                            setMenuOpen(false);
                          }}
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleMoreAction(item)}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={false}
        animate={{
          y: isVisible ? 0 : 100,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "fixed bottom-4 inset-x-4 z-50 md:hidden",
          "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl",
          "border-2 border-white/10 dark:border-neutral-800/50",
          "rounded-[2.5rem] shadow-2xl shadow-black/20",
          "pb-[env(safe-area-inset-bottom)]",
          className
        )}
        data-tab-bar
      >
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.id === "more" && menuOpen ? X : tab.icon;

            const content = (
              <motion.div
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  "w-full h-full relative transition-colors duration-300",
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-neutral-500 dark:text-neutral-400"
                )}
                whileTap={{ scale: 0.85 }}
              >
                <div className="relative z-10">
                  <motion.div
                    animate={active ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                  
                  {active && (
                    <motion.div
                      layoutId="liquidIndicator"
                      className="absolute -inset-3 -z-10 rounded-full bg-indigo-500/10"
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
              </motion.div>
            );

            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onClick={() => haptic.light()}
                  className="flex-1 min-w-0"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className="flex-1 min-w-0"
              >
                {content}
              </button>
            );
          })}
        </div>
      </motion.nav>

      {/* Rubber-band bottom spacer */}
      <div className="h-24 md:hidden pb-[env(safe-area-inset-bottom)]" />
    </>
  );
}

export default BottomTabBar;