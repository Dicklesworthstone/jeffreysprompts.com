"use client";

import { ThemeProvider } from "./theme-provider";
import { AlertTriangle } from "lucide-react";
import { SpotlightSearch } from "./SpotlightSearch";
import { BasketProvider } from "@/contexts/basket-context";
import { ToastProvider, Toaster } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useServiceWorker } from "@/hooks/useServiceWorker";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Register service worker for PWA offline support
  useServiceWorker();

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
          <ErrorBoundary variant="default">
            {children}
          </ErrorBoundary>
          <ErrorBoundary variant="minimal" fallback={spotlightFallback}>
            <SpotlightSearch />
          </ErrorBoundary>
          <Toaster />
        </BasketProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default Providers;
