"use client";

import Link from "next/link";
import { Book, Code2, Terminal, Zap, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableOfContentsItem {
  id: string;
  title: string;
  level?: number;
}

interface DocsPageLayoutProps {
  title: string;
  description?: string;
  version?: string;
  tableOfContents: TableOfContentsItem[];
  children: React.ReactNode;
}

const docsNavigation = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs/api", label: "Introduction", icon: Book },
      { href: "/docs/api#authentication", label: "Authentication", icon: Zap },
    ],
  },
  {
    title: "API Reference",
    items: [
      { href: "/docs/api#prompts", label: "Prompts", icon: Code2 },
      { href: "/docs/api#skills", label: "Skills", icon: Terminal },
      { href: "/docs/api#share", label: "Share Links", icon: Code2 },
      { href: "/docs/api#health", label: "Health", icon: Zap },
    ],
  },
  {
    title: "Resources",
    items: [
      { href: "/openapi.json", label: "OpenAPI Spec", icon: ExternalLink, external: true },
    ],
  },
];

export function DocsPageLayout({
  title,
  description,
  version = "1.0.0",
  tableOfContents,
  children,
}: DocsPageLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-8 sm:py-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Book className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                {title}
              </h1>
            </div>
            {description && (
              <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl">
                {description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <span>API Version {version}</span>
              <span className="hidden sm:inline">•</span>
              <a
                href="/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                OpenAPI Spec
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-wide py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[250px_1fr_200px] xl:grid-cols-[280px_1fr_220px]">
          {/* Left Sidebar - Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              {docsNavigation.map((section) => (
                <nav key={section.title} className="space-y-2">
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
                    {section.title}
                  </h2>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isExternal = "external" in item && item.external;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            target={isExternal ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white py-1.5 transition-colors"
                          >
                            <ItemIcon className="h-4 w-4" />
                            {item.label}
                            {isExternal && <ExternalLink className="h-3 w-3 ml-auto" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            {/* Mobile TOC */}
            <details className="lg:hidden mb-8 bg-white dark:bg-neutral-900 rounded-lg border border-border/60">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-neutral-900 dark:text-white">
                Table of Contents
                <ChevronRight className="h-4 w-4 transition-transform [details[open]>summary>&]:rotate-90" />
              </summary>
              <nav className="px-4 pb-4">
                <ul className="space-y-1">
                  {tableOfContents.map((item) => (
                    <li key={item.id} className={item.level === 2 ? "ml-4" : ""}>
                      <a
                        href={`#${item.id}`}
                        className="block text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white py-1"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>

            {/* Page Content */}
            <article className={cn(
              "prose prose-zinc dark:prose-invert max-w-none",
              "prose-headings:scroll-mt-20",
              "prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8",
              "prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6",
              "prose-h4:text-base prose-h4:font-medium",
              "prose-p:text-neutral-600 dark:prose-p:text-neutral-400",
              "prose-li:text-neutral-600 dark:prose-li:text-neutral-400",
              "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline",
              "prose-code:bg-neutral-100 dark:prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:bg-neutral-900 dark:prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-border/40"
            )}>
              {children}
            </article>

            {/* Footer */}
            <footer className="mt-12 pt-8 border-t border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                <p>
                  Questions? Contact us at{" "}
                  <a
                    href="mailto:support@jeffreysprompts.com"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    support@jeffreysprompts.com
                  </a>
                </p>
                <a
                  href="https://github.com/Dicklesworthstone/jeffreysprompts.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </footer>
          </main>

          {/* Right Sidebar - On this page */}
          <aside className="hidden xl:block">
            <div className="sticky top-20">
              <nav className="space-y-2">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
                  On this page
                </h2>
                <ul className="space-y-1 text-sm">
                  {tableOfContents.map((item) => (
                    <li key={item.id} className={item.level === 2 ? "ml-3" : ""}>
                      <a
                        href={`#${item.id}`}
                        className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white py-1 transition-colors"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
