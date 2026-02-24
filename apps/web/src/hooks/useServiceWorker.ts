"use client";

import { useEffect, useState } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOffline: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

/**
 * Hook to register and manage the service worker for PWA functionality.
 * Handles registration, updates, and offline state detection.
 */
export function useServiceWorker(): ServiceWorkerState {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOffline: false,
    hasUpdate: false,
    registration: null,
    error: null,
  });

  useEffect(() => {
    // Check if service workers are supported
    const isSupported = "serviceWorker" in navigator;
    setState((prev) => ({ ...prev, isSupported }));

    if (!isSupported) {
      return;
    }

    // Track cleanup functions for event listeners
    let updateFoundHandler: (() => void) | null = null;
    let stateChangeHandler: (() => void) | null = null;
    let currentRegistration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });

        currentRegistration = registration;

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setState((prev) => ({ ...prev, hasUpdate: true }));
        }

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Listen for new service worker installations
        updateFoundHandler = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            // Clean up previous handler to prevent memory leak
            if (installingWorker && stateChangeHandler) {
              installingWorker.removeEventListener("statechange", stateChangeHandler);
            }
            installingWorker = newWorker;
            stateChangeHandler = () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setState((prev) => ({ ...prev, hasUpdate: true }));
              }
            };
            newWorker.addEventListener("statechange", stateChangeHandler);
          }
        };
        registration.addEventListener("updatefound", updateFoundHandler);

        console.log("[SW] Service Worker registered successfully");
      } catch (error) {
        console.error("[SW] Service Worker registration failed:", error);
        setState((prev) => ({
          ...prev,
          error: error as Error,
        }));
      }
    };

    registerSW();

    // Track online/offline state
    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    // Set initial offline state
    setState((prev) => ({ ...prev, isOffline: !navigator.onLine }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      // Clean up service worker event listeners to prevent memory leaks
      if (currentRegistration && updateFoundHandler) {
        currentRegistration.removeEventListener("updatefound", updateFoundHandler);
      }
      if (installingWorker && stateChangeHandler) {
        installingWorker.removeEventListener("statechange", stateChangeHandler);
      }
    };
  }, []);

  return state;
}

/**
 * Trigger a service worker update check
 */
export async function checkForUpdates(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
    }
  }
}

/**
 * Skip waiting and activate the new service worker immediately
 */
export async function skipWaitingAndReload(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage("skipWaiting");
      window.location.reload();
    }
  }
}
