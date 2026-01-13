"use client";

import { hasAnalyticsConsent } from "@/lib/consent/cookie-consent";

export type AnalyticsEvent =
  | "prompt_view"
  | "prompt_copy"
  | "prompt_publish"
  | "prompt_unpublish"
  | "search"
  | "export"
  | "skill_install"
  | "basket_add"
  | "basket_clear"
  | "filter_apply"
  | "share_link_create"
  | "share_link_copy"
  | "share_link_revoke"
  | "share_social"
  | "share_view"
  | "share_copy"
  | "share_save"
  | "share_fork";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export type GaEvent =
  | AnalyticsEvent
  | "page_view"
  | "scroll_depth"
  | "time_on_page"
  | "view_pricing"
  | "begin_checkout"
  | "purchase"
  | "subscription_cancel"
  | "sign_in"
  | "sign_out"
  | "sign_up"
  | "prompt_create"
  | "prompt_save"
  | "prompt_publish"
  | "pack_create"
  | "skill_create"
  | "collection_create"
  | "feature_gate_hit"
  | "swapmeet_browse"
  | "swapmeet_search"
  | "swapmeet_prompt_view"
  | "swapmeet_prompt_save"
  | "swapmeet_prompt_rate";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

function getDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const dnt =
    nav.doNotTrack ||
    nav.msDoNotTrack ||
    (window as Window & { doNotTrack?: string }).doNotTrack;
  // W3C spec allows "1", "yes", or "true" for DNT enabled
  return dnt === "1" || dnt === "yes" || dnt === "true";
}

function getGlobalPrivacyControl(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function shouldBlockTracking(): boolean {
  return getDoNotTrack() || getGlobalPrivacyControl();
}

function sanitizeProps(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const entries = Object.entries(props).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function trackEvent(name: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (shouldBlockTracking()) return;

  const plausible = (window as Window & { plausible?: (event: string, options?: { props?: AnalyticsProps }) => void })
    .plausible;

  if (typeof plausible === "function") {
    plausible(name, { props: sanitizeProps(props) });
  }
  trackGaEvent(name, props);
}

export function trackGaEvent(name: GaEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (shouldBlockTracking()) return;
  if (!GA_MEASUREMENT_ID) return;

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;

  gtag("event", name, sanitizeProps(props));
}

export function trackPageView(url: string): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (shouldBlockTracking()) return;
  if (!GA_MEASUREMENT_ID) return;

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;

  gtag("event", "page_view", {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}
