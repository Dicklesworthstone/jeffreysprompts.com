"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  canPrompt: boolean;
}

/**
 * Hook to handle PWA installation prompts.
 * Captures the beforeinstallprompt event and provides methods to trigger installation.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAInstallState>(() => {
    if (typeof window === "undefined") {
      return {
        isInstallable: false,
        isInstalled: false,
        isIOS: false,
        canPrompt: false,
      };
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    return {
      isInstallable: false,
      isInstalled,
      isIOS,
      canPrompt: false,
    };
  });

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    e.preventDefault();
    const promptEvent = e as BeforeInstallPromptEvent;
    setDeferredPrompt(promptEvent);
    setState((prev) => ({
      ...prev,
      isInstallable: true,
      canPrompt: true,
    }));
  }, []);

  const handleAppInstalled = useCallback(() => {
    setDeferredPrompt(null);
    setState((prev) => ({
      ...prev,
      isInstalled: true,
      isInstallable: false,
      canPrompt: false,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [handleBeforeInstallPrompt, handleAppInstalled]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: "dismissed" as const, reason: "no-prompt" };
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setState((prev) => ({
          ...prev,
          canPrompt: false,
        }));
      }

      return { outcome, reason: null };
    } catch (error) {
      console.error("[PWA] Install prompt error:", error);
      return { outcome: "dismissed" as const, reason: "error" };
    }
  }, [deferredPrompt]);

  return {
    ...state,
    promptInstall,
  };
}
