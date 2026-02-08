"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  Terminal,
} from "lucide-react";
import { useBasket } from "@/hooks/use-basket";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/clipboard";
import { getPrompt } from "@jeffreysprompts/core/prompts/registry";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

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

// Helper functions
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
      const ids = basketPrompts.map((p) => p.id);
      const params = new URLSearchParams({ format: "md", ids: ids.join(",") });
      const response = await fetch(`/api/export?${params.toString()}`);
      if (!response.ok) throw new Error("export_failed");
      const blob = await response.blob();
      const filename = basketPrompts.length === 1 ? `${basketPrompts[0].id}.md` : "prompts.zip";
      downloadBlob(blob, filename);
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
      const ids = basketPrompts.map((p) => p.id);
      const params = new URLSearchParams({ format: "skill", ids: ids.join(",") });
      const response = await fetch(`/api/export?${params.toString()}`);
      if (!response.ok) throw new Error("export_failed");
      const blob = await response.blob();
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed right-0 top-0 h-full w-full sm:w-[380px] z-[9999] flex flex-col border-l border-neutral-200 dark:border-neutral-800 shadow-2xl",
              "bg-white/90 dark:bg-neutral-950/90 backdrop-blur-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Your Basket</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                    {basketPrompts.length} {basketPrompts.length === 1 ? "Item" : "Items"}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="h-10 w-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {basketPrompts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-6 text-center"
                >
                  <div className="relative mb-8">
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-24 h-24 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-inner"
                    >
                      <ShoppingBasket className="h-12 w-12 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
                    </motion.div>
                    <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-amber-400/50 animate-pulse" aria-hidden="true" />
                  </div>

                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    Empty Basket
                  </h3>

                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
                    Browse our curated collection and add prompts to export them in bulk.
                  </p>

                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="rounded-xl px-6 h-11 font-bold border-2 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all"
                  >
                    Start Browsing
                  </Button>
                </motion.div>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {basketPrompts.map((prompt, index) => (
                      <motion.li
                        key={prompt.id}
                        layout={!prefersReducedMotion}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.05,
                        }}
                        className="group flex items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 hover:border-indigo-500/30 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate group-hover:text-indigo-500 transition-colors">
                            {prompt.title}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-1">
                            {prompt.category}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                          onClick={() => removeItem(prompt.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Actions */}
            <AnimatePresence>
              {basketPrompts.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="p-6 border-t border-neutral-100 dark:border-neutral-800 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/30"
                >
                  <Button
                    onClick={handleCopyInstallCommand}
                    className={cn(
                      "w-full h-12 rounded-xl font-bold relative overflow-hidden transition-all duration-300 shadow-xl shadow-indigo-500/10",
                      copied ? "bg-emerald-500 hover:bg-emerald-600" : "bg-neutral-900 dark:bg-white dark:text-neutral-900"
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copied ? (
                        <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                          <Check className="h-5 w-5" />
                          Copied!
                        </motion.span>
                      ) : (
                        <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                          <Terminal className="h-5 w-5 text-indigo-500" />
                          Copy Install Command
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {/* Shimmer */}
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent skew-x-12"
                    />
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl font-bold border-2 text-xs"
                      onClick={handleDownloadMarkdown}
                      disabled={exporting}
                    >
                      <FileText className="h-4 w-4 mr-2 text-sky-500" />
                      MD Files
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl font-bold border-2 text-xs"
                      onClick={handleDownloadSkills}
                      disabled={exporting}
                    >
                      <Package className="h-4 w-4 mr-2 text-amber-500" />
                      Skills ZIP
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full h-11 rounded-xl font-bold text-neutral-400 hover:text-rose-500 transition-colors"
                    onClick={handleClearBasket}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}