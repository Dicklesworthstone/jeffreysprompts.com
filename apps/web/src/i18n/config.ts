/**
 * i18n Configuration
 *
 * Defines supported locales and default locale for the application.
 */

export const locales = ["en", "es", "fr", "de", "ja", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function localizeHref(locale: string, href: string): string {
  const normalizedHref = href.startsWith("/") ? href : `/${href}`;

  if (locale === defaultLocale) {
    return normalizedHref;
  }

  const localePrefix = `/${locale}`;
  if (normalizedHref === "/" || normalizedHref === "") {
    return localePrefix;
  }

  if (normalizedHref === localePrefix || normalizedHref.startsWith(`${localePrefix}/`)) {
    return normalizedHref;
  }

  return `${localePrefix}${normalizedHref}`;
}

/**
 * Locale display names for the language switcher
 */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  zh: "中文",
};

/**
 * Locale flags for visual display (uses ISO country codes)
 */
export const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  ja: "🇯🇵",
  zh: "🇨🇳",
};
