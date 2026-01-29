"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
// JSZip is dynamically imported when needed to reduce initial bundle
import {
  X,
  Trash2,
  FileText,
  Package,
  Copy,
  Check,
  ShoppingBasket,
  Sparkles,
  Search,
} from "lucide-react";
import { useBasket } from "@/hooks/use-basket";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/clipboard";
import { getPrompt, type Prompt } from "@jeffreysprompts/core/prompts";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";

interface BasketSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const buildInstallCommand = (promptIds: string[]) => {
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://jeffreysprompts.com";
  const params = new URLSearchParams();
  if (promptIds.length > 0) {
    params.set("ids", promptIds.join(","));
  }
  const query = params.toString();
  const url = query ? `${baseUrl}/install.sh?${query}` : `${baseUrl}/install.sh`;
  return `curl -fsSL "${url}" | bash`;
};

export function BasketSidebar({ isOpen, onClose }: BasketSidebarProps) {
  const { items, removeItem, clearBasket } = useBasket();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Portal mounting (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const basketPrompts = useMemo(
    () => items.map((id) => getPrompt(id)).filter((p): p is Prompt => p !== undefined),
    [items]
  );

  // Clean up any missing prompts from the basket (e.g., if registry changed)
  useEffect(() => {
    if (basketPrompts.length === items.length) return;
    const missingIds = items.filter((id) => !getPrompt(id));
    if (missingIds.length === 0) return;
    for (const id of missingIds) {
      removeItem(id);
    }
  }, [items, basketPrompts.length, removeItem]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (copyFlashTimerRef.current) clearTimeout(copyFlashTimerRef.current);
    };
  }, []);

  const handleDownloadMarkdown = async () => {
    if (basketPrompts.length === 0) return;

    setExporting(true);
    try {
      if (basketPrompts.length === 1) {
        // Single file download
        const prompt = basketPrompts[0];
        const content = generatePromptMarkdown(prompt);
        downloadFile(`${prompt.id}.md`, content, "text/markdown");
      } else {
        // ZIP download for multiple prompts - dynamically import JSZip
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const prompt of basketPrompts) {
          const content = generatePromptMarkdown(prompt);
          zip.file(`${prompt.id}.md`, content);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, "prompts.zip");
      }
      toast({
        type: "success",
        title: "Downloaded",
        message: `${basketPrompts.length} prompt${basketPrompts.length > 1 ? "s" : ""} exported as Markdown`,
      });
      trackEvent("export", { format: "md", count: basketPrompts.length, source: "basket" });
    } catch {
      toast({
        title: "Export failed",
        message: "Could not generate markdown files",
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadSkills = async () => {
    if (basketPrompts.length === 0) return;

    setExporting(true);
    try {
      // Dynamically import JSZip to reduce initial bundle
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const prompt of basketPrompts) {
        const content = generateSkillMd(prompt);
        // Each skill goes in its own directory
        zip.file(`${prompt.id}/SKILL.md`, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "skills.zip");
      toast({
        type: "success",
        title: "Downloaded",
        message: `${basketPrompts.length} skill${basketPrompts.length > 1 ? "s" : ""} ready to install`,
      });
      trackEvent("export", { format: "skill", count: basketPrompts.length, source: "basket" });
    } catch {
      toast({
        title: "Export failed",
        message: "Could not generate skill files",
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCopyInstallCommand = async () => {
    if (basketPrompts.length === 0) return;

    const ids = basketPrompts.map((p) => p.id);
    const command = buildInstallCommand(ids);
    const result = await copyToClipboard(command);

    if (result.success) {
      setCopied(true);
      setCopyFlash(true);

      // Haptic feedback for mobile devices
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }

      toast({
        type: "success",
        title: "Copied",
        message: "Install command copied to clipboard",
      });
      trackEvent("skill_install", { count: basketPrompts.length, source: "basket" });

      // Reset flash quickly
      if (copyFlashTimerRef.current) clearTimeout(copyFlashTimerRef.current);
      copyFlashTimerRef.current = setTimeout(() => setCopyFlash(false), 300);

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 2000);
    } else {
      console.error("Clipboard copy failed:", result.error);
      toast({
        title: "Copy failed",
        message: "Could not copy to clipboard",
        type: "error",
      });
    }
  };

  const handleClearBasket = () => {
    const count = basketPrompts.length;
    clearBasket();
    toast({
      type: "info",
      title: "Basket cleared",
      message: "All items removed from basket",
    });
    trackEvent("basket_clear", { count, source: "sidebar" });
  };

  // Don't render on server (portal requires document.body)
  if (!isMounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 h-full w-80 max-w-full border-l border-border z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col",
          // Solid background with fallback for CSS variable issues
          "bg-white dark:bg-neutral-950",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Basket</h2>
            <span className="text-sm text-muted-foreground">
              ({basketPrompts.length})
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close basket" className="h-11 w-11 -mr-2 touch-manipulation">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          {basketPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              {/* Illustrated empty state with decorative sparkle */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <ShoppingBasket className="h-10 w-10 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>

              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Your basket is empty
              </h3>

              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-[240px]">
                Save prompts here to download or install them all at once.
              </p>

              {/* CTA to close sidebar and browse */}
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="gap-2"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                Browse prompts
              </Button>

              {/* Hint for mobile users */}
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4 sm:hidden">
                Tip: Swipe right on any prompt card to add it
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {basketPrompts.map((prompt) => (
                  <motion.li
                    key={prompt.id}
                    layout={!prefersReducedMotion}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
                    transition={{
                      duration: prefersReducedMotion ? 0.1 : 0.2,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors overflow-hidden"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {prompt.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {prompt.category}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 -mr-1 touch-manipulation"
                      onClick={() => removeItem(prompt.id)}
                      aria-label={`Remove "${prompt.title}" from basket`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Actions */}
        {basketPrompts.length > 0 && (
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleDownloadMarkdown}
              disabled={exporting}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Download as Markdown
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleDownloadSkills}
              disabled={exporting}
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              Download as Skills ZIP
            </Button>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 transition-colors",
                copyFlash && "bg-emerald-100 dark:bg-emerald-900/30"
              )}
              onClick={handleCopyInstallCommand}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={prefersReducedMotion ? {} : { scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={prefersReducedMotion ? {} : { scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={prefersReducedMotion ? {} : { scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={prefersReducedMotion ? {} : { scale: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </motion.span>
                )}
              </AnimatePresence>
              Copy Install Command
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleClearBasket}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear Basket
            </Button>
          </div>
        )}
      </aside>
    </>,
    document.body
  );
}

// Helper functions
function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
