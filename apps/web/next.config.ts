import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

// Bundle analyzer setup (run with ANALYZE=true)
const analyzeBundles = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Security headers for production
const isProd = process.env.NODE_ENV === "production";
const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";
const plausibleOrigin = (() => {
  try {
    return new URL(plausibleSrc).origin;
  } catch {
    return "https://plausible.io";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "script-src 'self'",
    "'unsafe-inline'",
    !isProd ? "'unsafe-eval'" : "",
    plausibleOrigin,
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://js.stripe.com",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    plausibleOrigin,
    "https://www.google-analytics.com",
    "https://api.stripe.com",
    "https://*.supabase.co",
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
  ].join(" "),
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
  "block-all-mixed-content",
].join("; ");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  // Transpile workspace packages
  transpilePackages: ["@jeffreysprompts/core"],
  // Optimize for production
  poweredByHeader: false,
  // Strict mode for better debugging
  reactStrictMode: true,
  // Turbopack config for monorepo - use relative path from apps/web
  turbopack: {
    root: "../..",
  },
  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry for error tracking and source maps
// Also wrap with bundle analyzer (enabled via ANALYZE=true)
export default withSentryConfig(analyzeBundles(nextConfig), {
  // Sentry organization and project (from env vars)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Source maps configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Webpack-specific Sentry configurations
  webpack: {
    // Automatically annotate React components for breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },
    // Tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
});
