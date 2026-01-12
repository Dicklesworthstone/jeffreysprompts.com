"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AnalyticsProps, GaEvent } from "@/lib/analytics";
import { trackGaEvent, trackPageView } from "@/lib/analytics";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { initWebVitals } from "@/lib/performance";

const SCROLL_THRESHOLDS = [25, 50, 75, 100];

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent, privacySignals } = useCookieConsent();
  const hasAnalyticsConsent =
    consent?.analytics === true && !privacySignals.dnt && !privacySignals.gpc;

  const url = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const startTimeRef = useRef<number | null>(null);
  const scrollTrackedRef = useRef<Set<number>>(new Set());
  const webVitalsInitRef = useRef(false);

  // Initialize Web Vitals tracking (once per session)
  useEffect(() => {
    if (!hasAnalyticsConsent) return;
    if (webVitalsInitRef.current) return;
    webVitalsInitRef.current = true;
    initWebVitals();
  }, [hasAnalyticsConsent]);

  useEffect(() => {
    if (!hasAnalyticsConsent) return;
    startTimeRef.current = Date.now();
    scrollTrackedRef.current = new Set();

    const gaReadyHandler = () => trackPageView(url);

    if (typeof window !== "undefined") {
      const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag === "function") {
        trackPageView(url);
      } else {
        window.addEventListener("jfp:ga-ready", gaReadyHandler, { once: true });
      }
    }

    if (pathname === "/pricing") {
      trackGaEvent("view_pricing", { page_path: url });
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const el = target?.closest("[data-analytics]") as HTMLElement | null;
      if (!el) return;
      const eventName = el.dataset.analytics as GaEvent | undefined;
      if (!eventName) return;

      const props: AnalyticsProps = {};
      if (el.dataset.analyticsPlan) props.plan = el.dataset.analyticsPlan;
      if (el.dataset.analyticsSource) props.source = el.dataset.analyticsSource;
      if (Object.keys(props).length > 0) {
        trackGaEvent(eventName, props);
      } else {
        trackGaEvent(eventName);
      }
    };

    const handleScroll = () => {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      const percent = maxScroll <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / maxScroll) * 100));

      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold && !scrollTrackedRef.current.has(threshold)) {
          scrollTrackedRef.current.add(threshold);
          trackGaEvent("scroll_depth", { percent: threshold, page_path: url });
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("click", handleClick, { capture: true });
    handleScroll();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("jfp:ga-ready", gaReadyHandler);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("click", handleClick, { capture: true });

      if (startTimeRef.current) {
        const durationMs = Date.now() - startTimeRef.current;
        trackGaEvent("time_on_page", { duration_ms: durationMs, page_path: url });
      }
    };
  }, [pathname, url, hasAnalyticsConsent]);

  return null;
}

export default AnalyticsProvider;
