"use client";

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

export type WebVitalName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB";

export interface WebVitalMetric {
  name: WebVitalName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

// Thresholds based on Google's Core Web Vitals recommendations
export const WEB_VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },     // Largest Contentful Paint (ms)
  FCP: { good: 1800, poor: 3000 },     // First Contentful Paint (ms)
  CLS: { good: 0.1, poor: 0.25 },      // Cumulative Layout Shift (unitless)
  INP: { good: 200, poor: 500 },       // Interaction to Next Paint (ms)
  TTFB: { good: 800, poor: 1800 },     // Time to First Byte (ms)
} as const;

function getRating(name: WebVitalName, value: number): "good" | "needs-improvement" | "poor" {
  const threshold = WEB_VITAL_THRESHOLDS[name];
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

function sendToAnalytics(metric: Metric): void {
  const body: WebVitalMetric = {
    name: metric.name as WebVitalName,
    value: metric.value,
    rating: getRating(metric.name as WebVitalName, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };

  // Send to GA4 (if available)
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") {
    gtag("event", "web_vitals", {
      event_category: "Web Vitals",
      event_label: body.name,
      value: Math.round(body.name === "CLS" ? body.value * 1000 : body.value),
      metric_id: body.id,
      metric_value: body.value,
      metric_rating: body.rating,
      non_interaction: true,
    });
  }

  // Send to custom endpoint (for detailed logging)
  // Note: In serverless environments, metrics are logged per-request rather than batched
  if (process.env.NODE_ENV === "production") {
    const endpoint = "/api/vitals";
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });

    // Use sendBeacon for reliable delivery even during page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: "POST",
        body: blob,
        keepalive: true,
      }).catch(() => {
        // Silently fail - vitals are non-critical
      });
    }
  }
}

export function initWebVitals(): void {
  if (typeof window === "undefined") return;

  try {
    // Core Web Vitals
    onLCP(sendToAnalytics);   // Largest Contentful Paint
    onCLS(sendToAnalytics);   // Cumulative Layout Shift
    onINP(sendToAnalytics);   // Interaction to Next Paint

    // Additional metrics
    onFCP(sendToAnalytics);   // First Contentful Paint
    onTTFB(sendToAnalytics);  // Time to First Byte
  } catch {
    // Silently fail if web-vitals has issues (e.g., unsupported browser)
  }
}

export function getPerformanceMetrics(): Record<string, number> | null {
  if (typeof window === "undefined" || !window.performance) return null;

  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!navigation) return null;

  return {
    // Navigation timing
    dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcpConnection: navigation.connectEnd - navigation.connectStart,
    tlsNegotiation: navigation.secureConnectionStart > 0
      ? navigation.connectEnd - navigation.secureConnectionStart
      : 0,
    serverResponse: navigation.responseStart - navigation.requestStart,
    contentDownload: navigation.responseEnd - navigation.responseStart,
    domParsing: navigation.domInteractive - navigation.responseEnd,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,

    // Total times
    ttfb: navigation.responseStart - navigation.startTime,
    domReady: navigation.domContentLoadedEventEnd - navigation.startTime,
    pageLoad: navigation.loadEventEnd - navigation.startTime,
  };
}
