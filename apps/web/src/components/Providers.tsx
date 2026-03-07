"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ThemeProvider } from "./theme-provider";
import { AlertTriangle } from "lucide-react";
import { BasketProvider } from "@/contexts/basket-context";
import { ToastProvider } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";
import { useOnboarding } from "@/hooks/useOnboarding";
const KeyboardShortcutsModal = dynamic(
  () => import("@/components/KeyboardShortcutsModal").then((mod) => mod.KeyboardShortcutsModal),
  { ssr: false }
);
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { OfflineBanner } from "@/components/offline-banner";
import { MouseSpotlight } from "@/components/desktop/MouseSpotlight";
import { localizeHref } from "@/i18n/config";

/** Defers MouseSpotlight rendering until the first mouse interaction */
function LazyMouseSpotlight() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const activate = () => setActive(true);
    window.addEventListener("mousemove", activate, { once: true });
    return () => window.removeEventListener("mousemove", activate);
  }, []);

  if (!active) return null;
  return <MouseSpotlight />;
}

// Lazy load SpotlightSearch - it's only needed when user presses Cmd+K
const SpotlightSearch = dynamic(
  () => import("./SpotlightSearch").then((mod) => mod.SpotlightSearch),
  { ssr: false }
);

const FirstVisitWelcome = dynamic(
  () => import("@/components/onboarding").then((mod) => mod.FirstVisitWelcome),
  { ssr: false }
);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const serviceWorker = useServiceWorker();
  const router = useRouter();
  const locale = useLocale();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { isFirstVisit, completeFirstVisit } = useOnboarding();

  const openSpotlight = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("jfp:open-spotlight"));
    }
  }, []);

  const shortcuts = useMemo<KeyboardShortcut[]>(
    () => [
      {
        id: "search",
        description: "Open search",
        keys: "cmd+k",
        handler: openSpotlight,
        global: true,
        category: "Search",
      },
      {
        id: "search-focus",
        description: "Open search",
        keys: "/",
        handler: openSpotlight,
        category: "Search",
      },
      {
        id: "shortcuts-help",
        description: "Show keyboard shortcuts",
        keys: "?",
        handler: () => setShortcutsOpen(true),
        category: "Help",
      },
      {
        id: "shortcuts-help-mod",
        description: "Show keyboard shortcuts",
        keys: "cmd+/",
        handler: () => setShortcutsOpen(true),
        global: true,
        category: "Help",
      },
      {
        id: "shortcuts-close",
        description: "Close keyboard shortcuts",
        keys: "escape",
        handler: () => setShortcutsOpen(false),
        global: true,
        category: "Help",
      },
      {
        id: "new-prompt",
        description: "Create new prompt",
        keys: "cmd+n",
        handler: () => router.push(localizeHref(locale, "/contribute")),
        global: true,
        category: "Actions",
      },
      {
        id: "go-home",
        description: "Go to home",
        keys: "g h",
        handler: () => router.push(localizeHref(locale, "/")),
        category: "Navigation",
      },
      {
        id: "go-bundles",
        description: "Go to bundles",
        keys: "g b",
        handler: () => router.push(localizeHref(locale, "/bundles")),
        category: "Navigation",
      },
      {
        id: "go-workflows",
        description: "Go to workflows",
        keys: "g w",
        handler: () => router.push(localizeHref(locale, "/workflows")),
        category: "Navigation",
      },
      {
        id: "go-contribute",
        description: "Go to contribute",
        keys: "g c",
        handler: () => router.push(localizeHref(locale, "/contribute")),
        category: "Navigation",
      },
    ],
    [locale, openSpotlight, router]
  );

  useKeyboardShortcuts(shortcuts);

  const spotlightFallback = (
    <div className="mx-auto flex max-w-sm items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" />
      <span>Search is unavailable. Try refreshing.</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      >
        Refresh
      </Button>
    </div>
  );

  return (
    <ThemeProvider defaultTheme="system">
      <ToastProvider>
        <BasketProvider>
          <LazyMouseSpotlight />
          <ErrorBoundary variant="default">
            {children}
          </ErrorBoundary>
          <Suspense fallback={null}>
            <AnalyticsProvider />
          </Suspense>
          <ErrorBoundary fallback={spotlightFallback}>
            <SpotlightSearch />
          </ErrorBoundary>
          <KeyboardShortcutsModal
            isOpen={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
            shortcuts={shortcuts}
          />
          <BottomTabBar onOpenSearch={openSpotlight} />
          <OfflineBanner
            key={serviceWorker.isOffline ? "offline" : "online"}
            isOffline={serviceWorker.isOffline}
            isRegistered={serviceWorker.isRegistered}
            hasUpdate={serviceWorker.hasUpdate}
          />
          {isFirstVisit ? (
            <FirstVisitWelcome show={isFirstVisit} onDismiss={completeFirstVisit} />
          ) : null}
        </BasketProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default Providers;
