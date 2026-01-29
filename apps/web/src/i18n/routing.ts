/**
 * next-intl Routing Configuration
 *
 * Defines the routing behavior for internationalization.
 */

import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  // All supported locales
  locales,

  // Default locale when no locale is detected
  defaultLocale,

  // Don't show prefix for default locale (en)
  // This keeps English URLs clean (/ instead of /en/)
  localePrefix: "as-needed",
});
