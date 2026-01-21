import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Download,
  Sparkles,
  Rocket,
  Code,
  FileText,
  Brain,
  Zap,
  Package,
  Star,
} from "lucide-react";
import {
  bundles,
  getBundle,
  getBundlePrompts,
  generateBundleSkillMd,
  type BundleIcon,
} from "@jeffreysprompts/core/prompts/bundles";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ReportDialog } from "@/components/reporting/ReportDialog";
import { HistoryTracker } from "@/components/history/HistoryTracker";

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<BundleIcon, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  rocket: Rocket,
  code: Code,
  "file-text": FileText,
  brain: Brain,
  zap: Zap,
  package: Package,
  star: Star,
};

// ============================================================================
// Static Generation
// ============================================================================

export function generateStaticParams() {
  return bundles.map((bundle) => ({
    id: bundle.id,
  }));
}

// ============================================================================
// Metadata
// ============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const bundle = getBundle(id);

  if (!bundle) {
    return {
      title: "Bundle Not Found | JeffreysPrompts",
    };
  }

  return {
    title: `${bundle.title} | JeffreysPrompts`,
    description: bundle.description,
    openGraph: {
      title: bundle.title,
      description: bundle.description,
      url: `https://jeffreysprompts.com/bundles/${bundle.id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: bundle.title,
      description: bundle.description,
    },
  };
}

// ============================================================================
// Page Component
// ============================================================================

export default async function BundleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const bundle = getBundle(id);

  if (!bundle) {
    notFound();
  }

  const prompts = getBundlePrompts(bundle);
  const IconComponent = bundle.icon ? iconMap[bundle.icon] : Package;
  const installCommand = `jfp install ${bundle.promptIds.join(" ")}`;
  const skillMdContent = generateBundleSkillMd(bundle);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <HistoryTracker resourceType="bundle" resourceId={bundle.id} source="bundle_page" />
      {/* Header */}
      <div className="border-b dark:border-neutral-800">
        <div className="container mx-auto px-4 py-8">
          {/* Back link */}
          <Link
            href="/bundles"
            className="inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bundles
          </Link>

          {/* Bundle header */}
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <IconComponent className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {bundle.title}
                </h1>
                {bundle.featured && (
                  <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                    <Sparkles className="w-3 h-3" />
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                {bundle.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                <span>v{bundle.version}</span>
                <span>by {bundle.author}</span>
                <span>{prompts.length} prompts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Workflow */}
            {bundle.workflow && (
              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                  Workflow
                </h2>
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-lg border dark:border-neutral-700">
                    <div className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">
                      {bundle.workflow}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* When to Use */}
            {bundle.whenToUse && bundle.whenToUse.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                  When to Use This Bundle
                </h2>
                <ul className="space-y-2">
                  {bundle.whenToUse.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-neutral-600 dark:text-neutral-400"
                    >
                      <span className="text-violet-500 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Included Prompts */}
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Included Prompts
              </h2>
              <div className="space-y-4">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="bg-white dark:bg-neutral-900/50 border dark:border-neutral-800 rounded-lg p-4 hover:border-violet-200 dark:hover:border-violet-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                          {prompt.title}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {prompt.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {prompt.category}
                      </Badge>
                    </div>

                    {/* Content preview */}
                    <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400 max-h-32 overflow-hidden relative">
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-50 dark:from-neutral-800/50 to-transparent pointer-events-none" />
                      {prompt.content.slice(0, 300)}
                      {prompt.content.length > 300 && "..."}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {prompt.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Install card */}
            <div className="sticky top-20 bg-white dark:bg-neutral-900/50 border dark:border-neutral-800 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                Install this Bundle
              </h3>

              {/* CLI command */}
              <div className="mb-4">
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 block">
                  CLI Command
                </label>
                <div className="relative">
                  <code className="block bg-neutral-100 dark:bg-neutral-800 p-3 pr-12 rounded text-sm font-mono text-neutral-700 dark:text-neutral-300 break-all">
                    {installCommand}
                  </code>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <CopyButton text={installCommand} size="sm" />
                  </div>
                </div>
              </div>

              {/* Download as SKILL.md */}
              <div className="mb-4">
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 block">
                  Claude Code Skill
                </label>
                <DownloadSkillButton
                  bundleId={bundle.id}
                  skillContent={skillMdContent}
                />
              </div>

              {/* Prompt count */}
              <div className="pt-4 border-t dark:border-neutral-700">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Total prompts
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {prompts.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Version
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {bundle.version}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Updated
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {bundle.updatedAt}
                  </span>
                </div>
                <div className="mt-4">
                  <ReportDialog
                    contentType="bundle"
                    contentId={bundle.id}
                    contentTitle={bundle.title}
                    triggerVariant="outline"
                    triggerSize="sm"
                    triggerClassName="w-full justify-center"
                    showLabel
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Download Button Component (Client Component inlined)
// ============================================================================

function DownloadSkillButton({
  bundleId,
  skillContent,
}: {
  bundleId: string;
  skillContent: string;
}) {
  return (
    <a
      href={`data:text/markdown;charset=utf-8,${encodeURIComponent(skillContent)}`}
      download={`${bundleId}-bundle.SKILL.md`}
      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
    >
      <Download className="w-4 h-4" />
      Download as SKILL.md
    </a>
  );
}
