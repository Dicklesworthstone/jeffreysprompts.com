"use client";

/**
 * PromptDetailModal - Full prompt view with variable inputs
 *
 * Features:
 * - Desktop: Dialog modal with scrollable content
 * - Mobile: Bottom sheet (thumb-friendly)
 * - Variable inputs with localStorage persistence per prompt ID
 * - Copy/Install/Download buttons
 * - Context textarea for additional context
 * - Template rendering with variable substitution
 *
 * @module components/PromptDetailModal
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Copy,
  Check,
  Download,
  Terminal,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { trackHistoryView } from "@/lib/history/client";
import { copyToClipboard } from "@/lib/clipboard";
import {
  renderPrompt,
  extractVariables,
  formatVariableName,
  getVariablePlaceholder,
} from "@jeffreysprompts/core/template";
import type { Prompt, PromptVariable } from "@jeffreysprompts/core/prompts/types";
import { RatingButton, RatingDisplay } from "@/components/ratings";
import { ReviewList } from "@/components/reviews";
import { CostBadge } from "@/components/CostBadge";

interface PromptDetailModalProps {
  prompt: Prompt | null;
  open: boolean;
  onClose: () => void;
}

type VariableValues = Record<string, string>;

export function PromptDetailModal({
  prompt,
  open,
  onClose,
}: PromptDetailModalProps) {
  const isMobile = useIsMobile();
  const { success, error } = useToast();
  const [copied, setCopied] = useState(false);
  const [, setCopyFlash] = useState(false);
  const [context, setContext] = useState("");
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const handleClose = useCallback(() => {
    setCopied(false);
    setCopyFlash(false);
    setContext("");
    onClose();
  }, [onClose]);

  // Store variable values per prompt ID in localStorage
  const storageKey = prompt ? `jfp-vars-${prompt.id}` : "";
  const [variableValues, setVariableValues] = useLocalStorage<VariableValues>(
    storageKey,
    {}
  );

  // Extract variables from content and merge with defined variables
  const promptVariables = useMemo(() => {
    if (!prompt) return [];

    // Get variables defined in the prompt
    const defined = prompt.variables ?? [];

    // Extract any additional variables from content that aren't defined
    const extractedNames = extractVariables(prompt.content);
    const definedNames = new Set(defined.map((v) => v.name));

    // Create entries for undefined variables found in content
    const undefinedVars: PromptVariable[] = extractedNames
      .filter((name) => !definedNames.has(name))
      .map((name) => ({
        name,
        label: formatVariableName(name),
        type: "text" as const,
      }));

    return [...defined, ...undefinedVars];
  }, [prompt]);

  // Render prompt with current variable values and context
  const renderedContent = useMemo(() => {
    if (!prompt) return "";
    let content = renderPrompt(prompt, variableValues);
    if (context.trim()) {
      content += `\n\n---\n\n**Context:**\n${context}`;
    }
    return content;
  }, [prompt, variableValues, context]);

  // Update a single variable value
  const updateVariable = useCallback(
    (name: string, value: string) => {
      setVariableValues((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [setVariableValues]
  );

  useEffect(() => {
    if (!prompt || !open) return;
    trackHistoryView({ resourceType: "prompt", resourceId: prompt.id, source: "modal" });
  }, [prompt, open]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const result = await copyToClipboard(renderedContent);

    if (result.success) {
      setCopied(true);
      setCopyFlash(true);

      // Haptic feedback for mobile devices
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }

      success("Copied to clipboard", prompt?.title ?? "Prompt");
      if (prompt) {
        trackEvent("prompt_copy", { id: prompt.id, source: "modal" });
      }

      // Reset flash quickly
      if (copyFlashTimer.current) clearTimeout(copyFlashTimer.current);
      copyFlashTimer.current = setTimeout(() => setCopyFlash(false), 300);

      if (copiedResetTimer.current) {
        clearTimeout(copiedResetTimer.current);
      }
      copiedResetTimer.current = setTimeout(() => {
        setCopied(false);
        copiedResetTimer.current = null;
      }, 2000);
    } else {
      error("Failed to copy", "Please try again");
    }
  }, [renderedContent, prompt, success, error]);

  // Generate install command and copy
  const handleInstall = useCallback(async () => {
    if (!prompt) return;
    try {
      const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : "https://jeffreysprompts.com";
      const params = new URLSearchParams({ ids: prompt.id });
      const url = `${baseUrl}/install.sh?${params.toString()}`;
      const command = `curl -fsSL "${url}" | bash`;
      const result = await copyToClipboard(command);

      if (result.success) {
        success("Install command copied", `Paste in terminal to install "${prompt.title}"`);
        trackEvent("skill_install", { id: prompt.id, source: "modal" });
      } else {
        error("Failed to copy", "Please try again");
      }
    } catch {
      error("Failed to copy", "Please try again");
    }
  }, [prompt, success, error]);

  // Download as markdown
  const handleDownload = useCallback(() => {
    if (!prompt) return;

    const blob = new Blob([renderedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prompt.id}.md`;
    try {
      document.body.appendChild(a);
      a.click();
    } finally {
      // Ensure cleanup even if click() throws
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }
    success("Downloaded", `${prompt.id}.md`);
    trackEvent("export", { id: prompt.id, format: "md", source: "modal" });
  }, [prompt, renderedContent, success]);

  useEffect(() => {
    if (open && prompt) {
      trackEvent("prompt_view", { id: prompt.id, source: "modal" });
    }
  }, [open, prompt]);

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current) clearTimeout(copiedResetTimer.current);
      if (copyFlashTimer.current) clearTimeout(copyFlashTimer.current);
    };
  }, []);

  if (!prompt) return null;

  // Modal content (shared between Dialog and BottomSheet)
  const modalContent = (
    <div className="space-y-10">
      {/* Header info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="capitalize text-xs font-bold px-3 py-1 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            {prompt.category}
          </Badge>
          {prompt.featured && (
            <Badge className="gap-2 text-xs font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-400/30 dark:border-amber-500/30 px-3 py-1">
              <Sparkles className="w-3.5 h-3.5" />
              Featured
            </Badge>
          )}
          {prompt.estimatedTokens && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {prompt.estimatedTokens} tokens
              </div>
              <CostBadge
                tokens={prompt.estimatedTokens}
                variant="compact"
                className="font-bold"
              />
            </div>
          )}
        </div>

        <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">{prompt.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {prompt.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs uppercase tracking-widest font-bold text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Rating Display */}
        <div className="pt-2">
          <RatingDisplay
            contentType="prompt"
            contentId={prompt.id}
            variant="detailed"
          />
        </div>
      </motion.div>

      {/* Variable inputs */}
      {promptVariables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 p-6 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-2xl border-2 border-indigo-100/50 dark:border-indigo-500/10 backdrop-blur-sm"
        >
          <h4 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            Customize Variables
          </h4>
          <div className="grid gap-6 sm:grid-cols-2">
            {promptVariables.map((variable) => (
              <div key={variable.name} className="space-y-2">
                <Label htmlFor={`var-${variable.name}`} className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  {variable.label}
                  {variable.required && (
                    <span className="text-rose-500 ml-1">*</span>
                  )}
                </Label>
                {variable.type === "multiline" ? (
                  <Textarea
                    id={`var-${variable.name}`}
                    value={variableValues[variable.name] ?? variable.default ?? ""}
                    onChange={(e) => updateVariable(variable.name, e.target.value)}
                    placeholder={getVariablePlaceholder(variable.name, variable.type)}
                    className="h-24 bg-white dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800 focus:ring-indigo-500/30"
                  />
                ) : variable.type === "select" && variable.options?.length ? (
                  <Select
                    value={variableValues[variable.name] ?? variable.default ?? ""}
                    onValueChange={(value) => updateVariable(variable.name, value)}
                  >
                    <SelectTrigger id={`var-${variable.name}`} className="bg-white dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800 h-11">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {variable.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`var-${variable.name}`}
                    value={variableValues[variable.name] ?? variable.default ?? ""}
                    onChange={(e) => updateVariable(variable.name, e.target.value)}
                    placeholder={getVariablePlaceholder(variable.name, variable.type)}
                    className="h-11 bg-white dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800 focus:ring-indigo-500/30"
                  />
                )}
                {variable.description && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {variable.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Context textarea */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <Label htmlFor="context" className="text-sm font-bold text-neutral-900 dark:text-white">
          Additional Context <span className="text-neutral-400 font-normal ml-1">(Optional)</span>
        </Label>
        <Textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Paste code, file contents, or other context to append..."
          className="h-28 font-mono bg-neutral-50 dark:bg-black/20 border-neutral-200 dark:border-neutral-800 focus:ring-indigo-500/30"
        />
      </motion.div>

      {/* Prompt content preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <Label className="text-sm font-bold text-neutral-900 dark:text-white">Live Preview</Label>
        <div className="relative rounded-2xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 bg-neutral-900 shadow-inner">
          <div className="absolute top-0 left-0 right-0 h-8 bg-neutral-800/50 flex items-center px-4 gap-1.5 border-b border-white/5">
             <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
             <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
             <span className="text-xs text-neutral-500 font-mono ml-2 uppercase tracking-widest">prompt.md</span>
          </div>
          <pre className="p-6 pt-12 text-sm font-mono whitespace-pre-wrap break-words max-h-80 overflow-y-auto text-neutral-300 leading-relaxed scrollbar-thin">
            {renderedContent}
          </pre>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-neutral-900 to-transparent pointer-events-none" />
        </div>
      </motion.div>

      {/* When to use / Tips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {((prompt.whenToUse?.length ?? 0) > 0 || (prompt.tips?.length ?? 0) > 0) && (
          <div className="grid gap-10 sm:grid-cols-2 text-sm">
            {(prompt.whenToUse?.length ?? 0) > 0 && (
              <div className="space-y-4">
                <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
                  When to Use
                </h4>
                <ul className="text-neutral-600 dark:text-neutral-400 space-y-3">
                  {prompt.whenToUse?.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(prompt.tips?.length ?? 0) > 0 && (
              <div className="space-y-4">
                <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full bg-amber-500" />
                  Expert Tips
                </h4>
                <ul className="text-neutral-600 dark:text-neutral-400 space-y-3">
                  {prompt.tips?.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="pt-10 border-t border-neutral-100 dark:border-neutral-800"
      >
        <div className="flex flex-col gap-4">
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleCopy}
              size="lg"
              className={cn(
                "w-full font-bold transition-all duration-300 relative overflow-hidden",
                "h-14 text-lg rounded-2xl shadow-xl",
                "focus:ring-4 focus:ring-indigo-500/20",
                copied ? "bg-emerald-500" : "bg-neutral-900 dark:bg-white dark:text-neutral-900"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center"
                  >
                    <Check className="w-6 h-6 mr-3" />
                    Copied to Clipboard!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center"
                  >
                    <Copy className="w-6 h-6 mr-3" />
                    Copy Final Prompt
                  </motion.span>
                )}
              </AnimatePresence>
              
              {/* Shimmer on copy button */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent skew-x-12"
              />
            </Button>
          </motion.div>

          <div className="grid grid-cols-2 sm:flex gap-3">
            <Button
              variant="outline"
              onClick={handleInstall}
              className="h-12 font-bold rounded-xl flex-1 border-2"
            >
              <Terminal className="w-4 h-4 mr-2" />
              Terminal Install
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="h-12 font-bold rounded-xl flex-1 border-2"
            >
              <Download className="w-4 h-4 mr-2" />
              Save .md File
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-800">
          <RatingButton
            contentType="prompt"
            contentId={prompt.id}
            showCount
          />
        </div>
      </motion.div>

      {/* Reviews section */}
      <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
        <ReviewList
          contentType="prompt"
          contentId={prompt.id}
        />
      </div>
    </div>
  );

  // Render based on device type
  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={handleClose} title={prompt.title}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {modalContent}
        </motion.div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        size="xl" 
        className={cn(
          "max-h-[90vh] overflow-hidden flex flex-col border-2 p-0 perspective-1000",
          "bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl",
          "border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl"
        )}
      >
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, rotateX: -5 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{ transformStyle: "preserve-3d" }}
          className="h-full flex flex-col"
        >
          <DialogHeader separated className="border-b-2 border-neutral-100 dark:border-neutral-800 px-4 sm:px-10 pt-8 pb-6">
            <DialogTitle className="flex items-center gap-4 text-2xl sm:text-3xl font-bold">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              {prompt.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              View and customize the {prompt.title} prompt
            </DialogDescription>
          </DialogHeader>
          <DialogBody scrollable className="flex-1 p-0 px-4 sm:px-10 py-8">
            <div className="max-w-4xl mx-auto">
              {modalContent}
            </div>
          </DialogBody>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default PromptDetailModal;
