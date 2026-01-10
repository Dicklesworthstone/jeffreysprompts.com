"use client";

export type AnalyticsEvent =
  | "prompt_view"
  | "prompt_copy"
  | "search"
  | "export"
  | "skill_install";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

function getDoNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const dnt =
    nav.doNotTrack ||
    nav.msDoNotTrack ||
    (window as Window & { doNotTrack?: string }).doNotTrack;
  return dnt === "1" || dnt === "yes";
}

function sanitizeProps(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const entries = Object.entries(props).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

export function trackEvent(name: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  if (getDoNotTrack()) return;

  const plausible = (window as Window & { plausible?: (event: string, options?: { props?: AnalyticsProps }) => void })
    .plausible;

  if (typeof plausible !== "function") return;

  plausible(name, { props: sanitizeProps(props) });
}
