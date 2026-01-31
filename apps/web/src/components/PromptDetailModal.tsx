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
  FileText,
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
import { ReportDialog } from "@/components/reporting/ReportDialog";
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
import { generateInstallOneLiner } from "@jeffreysprompts/core/export/skills";
import type { Prompt, PromptVariable } from "@jeffreysprompts/core/prompts/types";
import { RatingButton, RatingDisplay } from "@/components/ratings";

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
  const [copyFlash, setCopyFlash] = useState(false);
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
      const command = generateInstallOneLiner(prompt);
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="space-y-6">
      {/* Header info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="capitalize text-xs font-medium px-2.5 py-0.5 bg-neutral-50 dark:bg-neutral-800/50">
            {prompt.category}
          </Badge>
          {prompt.featured && (
            <Badge className="gap-1.5 text-xs bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-400 border-amber-400/30 dark:border-amber-500/30">
              <Sparkles className="w-3 h-3" />
              Featured
            </Badge>
          )}
          {prompt.estimatedTokens && (
            <span className="text-xs text-muted-foreground/70 font-medium">
              {prompt.estimatedTokens} tokens
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{prompt.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/70 px-2 py-0.5 rounded-md font-medium"
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
      </div>

      {/* Variable inputs */}
      {promptVariables.length > 0 && (
        <div className="space-y-4 p-4 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Variables
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {promptVariables.map((variable) => (
              <div key={variable.name} className="space-y-1.5">
                <Label htmlFor={`var-${variable.name}`} className="text-xs font-medium text-muted-foreground">
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
                    className="h-20 text-sm bg-white dark:bg-neutral-900/50"
                  />
                ) : variable.type === "select" && variable.options?.length ? (
                  <Select
                    value={variableValues[variable.name] ?? variable.default ?? ""}
                    onValueChange={(value) => updateVariable(variable.name, value)}
                  >
                    <SelectTrigger id={`var-${variable.name}`} className="bg-white dark:bg-neutral-900/50">
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
                    className="text-sm bg-white dark:bg-neutral-900/50"
                  />
                )}
                {variable.description && (
                  <p className="text-xs text-muted-foreground/70">
                    {variable.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context textarea */}
      <div className="space-y-2">
        <Label htmlFor="context" className="text-sm font-medium text-foreground">
          Additional Context <span className="text-muted-foreground/60 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Paste code, file contents, or other context here..."
          className="h-24 text-sm font-mono bg-neutral-50 dark:bg-neutral-900/50"
        />
      </div>

      {/* Prompt content preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Rendered Prompt</Label>
        <div className="relative rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900/50">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {renderedContent}
          </pre>
          {/* Fade overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-50 dark:from-neutral-900/50 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* When to use / Tips */}
      {((prompt.whenToUse?.length ?? 0) > 0 || (prompt.tips?.length ?? 0) > 0) && (
        <div className="grid gap-6 sm:grid-cols-2 text-sm">
          {(prompt.whenToUse?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                When to Use
              </h4>
              <ul className="text-muted-foreground space-y-2">
                {prompt.whenToUse?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(prompt.tips?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Tips
              </h4>
              <ul className="text-muted-foreground space-y-2">
                {prompt.tips?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action buttons - Mobile: stacked full-width, Desktop: inline */}
      <div className="pt-4 border-t border-border/50">
        {/* Primary action - Copy - always full width on mobile for prominence */}
        <Button
          onClick={handleCopy}
          size="lg"
          className={cn(
            "w-full font-medium transition-all duration-200 mb-3",
            "h-12 text-base",
            copied && "bg-emerald-600 hover:bg-emerald-700",
            copyFlash && "bg-emerald-500"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="copied"
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <motion.span
                  initial={prefersReducedMotion ? {} : { rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Check className="w-5 h-5 mr-2" />
                </motion.span>
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <Copy className="w-5 h-5 mr-2" />
                Copy Prompt
              </motion.span>
            )}
          </AnimatePresence>
        </Button>

        {/* Secondary actions - 2x2 grid on mobile, inline on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleInstall}
            className="h-11 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 sm:flex-1"
          >
            <Terminal className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">Install</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="h-11 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 sm:flex-1"
          >
            <Download className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">Download</span>
          </Button>
          {prompt && (
            <ReportDialog
              contentType="prompt"
              contentId={prompt.id}
              contentTitle={prompt.title}
              triggerVariant="outline"
              triggerSize="default"
              triggerClassName="h-11 font-medium col-span-2 sm:col-span-1 sm:flex-1"
              showLabel
            />
          )}
        </div>

        {/* Rating - allows users to rate this prompt */}
        <div className="flex items-center justify-center pt-3 border-t border-border/30 mt-3">
          <RatingButton
            contentType="prompt"
            contentId={prompt.id}
            showCount
          />
        </div>
      </div>
    </div>
  );

  // Render based on device type
  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={handleClose} title={prompt.title}>
        {modalContent}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader separated>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {prompt.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and customize the {prompt.title} prompt
          </DialogDescription>
        </DialogHeader>
        <DialogBody scrollable className="flex-1">
          {modalContent}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default PromptDetailModal;
