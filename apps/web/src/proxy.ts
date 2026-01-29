/**
 * Internationalization Proxy (Next.js 16+)
 *
 * Handles locale detection and routing for multi-language support.
 * - Detects user's preferred language from browser/cookie
 * - Rewrites URLs to include locale segment internally
 * - Sets locale cookie for persistence
 *
 * Note: In Next.js 16, middleware.ts was renamed to proxy.ts
 */

import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export const proxy = createMiddleware(routing);

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/...)
  // - Static files (/_next/static/..., /favicon.ico, etc.)
  // - Monitoring routes (/monitoring)
  // - Robots and sitemap
  matcher: [
    // Match all pathnames except those starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico, sitemap.xml, robots.txt
    // - monitoring (Sentry tunnel)
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|monitoring|icons|manifest.json).*)",
  ],
};
