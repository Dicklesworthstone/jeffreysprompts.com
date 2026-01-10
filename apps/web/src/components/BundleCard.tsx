"use client";

import { useState, useCallback, type ComponentType, type MouseEvent } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, Sparkles, Rocket, Code, FileText, Brain, Zap, Package, Star } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Bundle, BundleIcon } from "@jeffreysprompts/core/prompts/bundles";

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<BundleIcon, ComponentType<{ className?: string }>> = {
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
// Props
// ============================================================================

interface BundleCardProps {
  bundle: Bundle;
  index?: number; // for staggered animation
}

// ============================================================================
// Component
// ============================================================================

export function BundleCard({ bundle, index = 0 }: BundleCardProps) {
  const [copied, setCopied] = useState(false);

  // Get icon component
  const IconComponent = bundle.icon ? iconMap[bundle.icon] : Package;

  // Copy install command
  const handleCopyInstall = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const command = "jfp install " + bundle.promptIds.join(" ");
        await navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API not available
      }
    },
    [bundle.promptIds]
  );

  return (
    <Card
      className={cn(
        "group relative flex flex-col h-full",
        "hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800",
        "transition-all duration-200 ease-out",
        "bg-white dark:bg-zinc-900/50"
      )}
      style={{
        animationDelay: index * 50 + "ms",
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <IconComponent className="w-4 h-4" />
            </div>
            {bundle.featured && (
              <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                <Sparkles className="w-3 h-3" />
                Featured
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {bundle.promptIds.length} prompts
          </Badge>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
          {bundle.title}
        </h3>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
          {bundle.description}
        </p>

        {/* Included prompts */}
        <div className="flex flex-wrap gap-1.5">
          {bundle.promptIds.slice(0, 3).map((id) => (
            <span
              key={id}
              className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-mono"
            >
              {id}
            </span>
          ))}
          {bundle.promptIds.length > 3 && (
            <span className="text-xs text-zinc-400 px-1">
              +{bundle.promptIds.length - 3} more
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t dark:border-zinc-800">
        <div className="w-full">
          {/* Workflow preview */}
          {bundle.workflow && (
            <div className="text-xs bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg overflow-hidden h-16 relative mb-3">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-50 dark:to-zinc-800/50 pointer-events-none" />
              <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                {bundle.workflow.slice(0, 150)}...
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              v{bundle.version}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs"
                onClick={handleCopyInstall}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Install
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs"
                asChild
              >
                <Link href={"/bundles/" + bundle.id}>
                  View
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export default BundleCard;
