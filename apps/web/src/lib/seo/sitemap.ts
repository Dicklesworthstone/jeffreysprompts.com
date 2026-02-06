import type { MetadataRoute } from "next";
import { prompts } from "@jeffreysprompts/core/prompts";
import { bundles } from "@jeffreysprompts/core/prompts/bundles";

const SITE_URL = "https://jeffreysprompts.com";
const MAX_URLS_PER_SITEMAP = 50000;

type SitemapEntry = MetadataRoute.Sitemap[number];

function buildUrl(path: string): string {
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export function getStaticRoutes(): SitemapEntry[] {
  const now = new Date();
  return [
    { url: buildUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: buildUrl("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: buildUrl("/bundles"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: buildUrl("/workflows"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: buildUrl("/how_it_was_made"), lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: buildUrl("/help"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: buildUrl("/help/getting-started"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/getting-started/introduction"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/getting-started/browsing-prompts"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/getting-started/using-prompts"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/prompts"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/prompts/copying-prompts"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/prompts/exporting"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/prompts/saving-to-basket"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/cli"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/cli/installation"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/cli/basic-usage"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/help/cli/search-commands"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: buildUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: buildUrl("/contribute"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: buildUrl("/guidelines"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: buildUrl("/dmca"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: buildUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: buildUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: buildUrl("/changelog"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: buildUrl("/swap-meet"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];
}

export function getPromptRoutes(): SitemapEntry[] {
  return prompts.map((prompt) => ({
    url: buildUrl(`/prompts/${prompt.id}`),
    lastModified: parseDate(prompt.created) ?? new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));
}

export function getBundleRoutes(): SitemapEntry[] {
  return bundles.map((bundle) => ({
    url: buildUrl(`/bundles/${bundle.id}`),
    lastModified: parseDate(bundle.updatedAt) ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
}

export function getAllSitemapEntries(): MetadataRoute.Sitemap {
  return [
    ...getStaticRoutes(),
    ...getPromptRoutes(),
    ...getBundleRoutes(),
  ];
}

export function getSitemapPageCount(): number {
  return Math.max(1, Math.ceil(getAllSitemapEntries().length / MAX_URLS_PER_SITEMAP));
}

export function getSitemapPage(page: number): MetadataRoute.Sitemap {
  const entries = getAllSitemapEntries();
  const start = page * MAX_URLS_PER_SITEMAP;
  return entries.slice(start, start + MAX_URLS_PER_SITEMAP);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(value?: SitemapEntry["lastModified"]): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function buildSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urlset = entries
    .map((entry) => {
      const lastMod = formatDate(entry.lastModified);
      const changefreq = entry.changeFrequency;
      const priority = typeof entry.priority === "number" ? entry.priority.toFixed(1) : null;
      const parts = [
        `<loc>${escapeXml(entry.url)}</loc>`,
        lastMod ? `<lastmod>${lastMod}</lastmod>` : null,
        changefreq ? `<changefreq>${changefreq}</changefreq>` : null,
        priority ? `<priority>${priority}</priority>` : null,
      ].filter(Boolean);
      return `  <url>\n    ${parts.join("\n    ")}\n  </url>`;
    })
    .join("\n");

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    urlset,
    "</urlset>",
  ].join("\n");
}

export { SITE_URL, MAX_URLS_PER_SITEMAP };
