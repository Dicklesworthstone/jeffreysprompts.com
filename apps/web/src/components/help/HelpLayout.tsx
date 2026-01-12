"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  BookOpen,
  Sparkles,
  Terminal,
  ChevronRight,
  Search,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { helpCategories } from "@/lib/help-categories";

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Sparkles,
  Terminal,
};

interface HelpLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  showBreadcrumb?: boolean;
  category?: string;
}

export function HelpLayout({
  title,
  description,
  children,
  showBreadcrumb = true,
  category,
}: HelpLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-8 sm:py-12">
          {showBreadcrumb && (
            <nav className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              <Link href="/help" className="hover:text-neutral-900 dark:hover:text-white">
                Help Center
              </Link>
              {category && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <Link
                    href={`/help/${category}`}
                    className="hover:text-neutral-900 dark:hover:text-white capitalize"
                  >
                    {category.replace(/-/g, " ")}
                  </Link>
                </>
              )}
            </nav>
          )}

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <HelpCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-wide py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              {/* Search placeholder */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="search"
                  placeholder="Search help..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Categories */}
              <nav className="space-y-1">
                {helpCategories.map((cat) => {
                  const Icon = iconMap[cat.iconName];
                  const isActive = pathname.startsWith(`/help/${cat.slug}`);
                  return (
                    <Link
                      key={cat.slug}
                      href={`/help/${cat.slug}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {cat.title}
                    </Link>
                  );
                })}
              </nav>

              {/* Contact support */}
              <div className="border-t border-border/60 pt-6">
                <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                  Need more help?
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/contact"
                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Contact support
                  </Link>
                  <a
                    href="https://github.com/Dicklesworthstone/jeffreysprompts.com/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open a GitHub issue
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            {/* Mobile category nav */}
            <div className="lg:hidden mb-6 flex flex-wrap gap-2">
              {helpCategories.map((cat) => {
                const isActive = pathname.startsWith(`/help/${cat.slug}`);
                return (
                  <Link
                    key={cat.slug}
                    href={`/help/${cat.slug}`}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-colors",
                      isActive
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    )}
                  >
                    {cat.title}
                  </Link>
                );
              })}
            </div>

            {children}

            {/* Mobile contact support */}
            <div className="mt-10 rounded-xl border border-border/60 bg-white dark:bg-neutral-900 p-5 lg:hidden">
              <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                Need more help?
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/contact"
                  className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <HelpCircle className="h-4 w-4" />
                  Contact support
                </Link>
                <a
                  href="https://github.com/Dicklesworthstone/jeffreysprompts.com/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open a GitHub issue
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

interface ArticleCardProps {
  href: string;
  title: string;
  description?: string;
  iconName?: keyof typeof iconMap;
}

export function ArticleCard({ href, title, description, iconName }: ArticleCardProps) {
  const Icon = iconName ? iconMap[iconName] : null;

  return (
    <Link
      href={href}
      className="group block p-5 rounded-xl border border-border/60 bg-white dark:bg-neutral-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
            <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
      </div>
    </Link>
  );
}

interface ArticleContentProps {
  children: React.ReactNode;
}

export function ArticleContent({ children }: ArticleContentProps) {
  return (
    <article
      className={cn(
        "prose prose-zinc dark:prose-invert max-w-none",
        "prose-headings:scroll-mt-20",
        "prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-2 prose-h2:mb-4",
        "prose-h3:text-lg prose-h3:font-medium",
        "prose-p:text-neutral-600 dark:prose-p:text-neutral-400",
        "prose-li:text-neutral-600 dark:prose-li:text-neutral-400",
        "prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline",
        "prose-code:bg-neutral-100 dark:prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
      )}
    >
      {children}
    </article>
  );
}
