"use client";

/**
 * PromptContent - Client component for prompt permalink pages
 *
 * Features:
 * - Full prompt content display
 * - Variable inputs with localStorage persistence
 * - Copy, install, download buttons
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Download,
  Terminal,
  ArrowLeft,
  Tag,
  Hash,
  User,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/reporting/ReportDialog";
import { ShareDialog, type ShareLink } from "@/components/sharing/ShareDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RelatedPrompts } from "@/components/RelatedPrompts";
import { ChangelogAccordion } from "@/components/ChangelogAccordion";
import { trackEvent } from "@/lib/analytics";
import { trackHistoryView } from "@/lib/history/client";
import type { RatingSummary, RatingValue } from "@/lib/ratings/rating-store";
import {
  renderPrompt,
  extractVariables,
  formatVariableName,
  getVariablePlaceholder,
} from "@jeffreysprompts/core/template";
import { generateSkillMd, generateInstallOneLiner } from "@jeffreysprompts/core/export";
import { copyToClipboard } from "@/lib/clipboard";
import type { Prompt, PromptVariable } from "@jeffreysprompts/core/prompts/types";

interface PromptContentProps {
  prompt: Prompt;
}

type VariableValues = Record<string, string>;

export function PromptContent({ prompt }: PromptContentProps) {
  const { success, error } = useToast();
  const [copied, setCopied] = useState(false);
  const [context, setContext] = useState("");
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [userRating, setUserRating] = useState<RatingValue | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [existingShare, setExistingShare] = useState<ShareLink | null>(null);
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store variable values in localStorage
  const [variableValues, setVariableValues] = useLocalStorage<VariableValues>(
    `jfp-vars-${prompt.id}`,
    {}
  );

  // Extract variables from content and merge with defined variables
  const promptVariables = useMemo(() => {
    const defined = prompt.variables ?? [];
    const extractedNames = extractVariables(prompt.content);
    const definedNames = new Set(defined.map((v) => v.name));

    const undefinedVars: PromptVariable[] = extractedNames
      .filter((name) => !definedNames.has(name))
      .map((name) => ({
        name,
        label: formatVariableName(name),
        type: "text" as const,
      }));

    return [...defined, ...undefinedVars];
  }, [prompt]);

  // Render the prompt with current variable values
  const renderedContent = useMemo(() => {
    let content = renderPrompt(prompt, variableValues);
    if (context.trim()) {
      content += "\n\n---\n\n**Context:**\n" + context;
    }
    return content;
  }, [prompt, variableValues, context]);

  useEffect(() => {
    trackEvent("prompt_view", { id: prompt.id, source: "prompt_page" });
    trackHistoryView({ resourceType: "prompt", resourceId: prompt.id, source: "prompt_page" });
  }, [prompt.id]);

  useEffect(() => {
    const params = new URLSearchParams({
      contentType: "prompt",
      contentId: prompt.id,
    });
    fetch(`/api/ratings?${params.toString()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.summary) {
          setRatingSummary(payload.summary);
        }
        setUserRating(payload?.userRating ?? null);
      })
      .catch(() => {
        setRatingSummary(null);
        setUserRating(null);
      });
  }, [prompt.id]);

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current) {
        clearTimeout(copiedResetTimer.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      const result = await copyToClipboard(renderedContent);
      if (result.success) {
        setCopied(true);
        success("Copied to clipboard");
        trackEvent("prompt_copy", { id: prompt.id, source: "prompt_page" });
        if (copiedResetTimer.current) {
          clearTimeout(copiedResetTimer.current);
        }
        copiedResetTimer.current = setTimeout(() => {
          setCopied(false);
          copiedResetTimer.current = null;
        }, 2000);
      } else {
        error("Failed to copy to clipboard");
      }
    } catch {
      error("Failed to copy to clipboard");
    }
  }, [renderedContent, prompt.id, success, error]);

  const handleInstall = useCallback(async () => {
    // Generate standard install command (default to personal)
    const command = generateInstallOneLiner(prompt);
    try {
      const result = await copyToClipboard(command);
      if (result.success) {
        success("Install command copied - paste in terminal");
        trackEvent("skill_install", { id: prompt.id, source: "prompt_page" });
      } else {
        error("Failed to copy install command");
      }
    } catch {
      error("Failed to copy install command");
    }
  }, [prompt, success, error]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generateSkillMd(prompt)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prompt.id}-SKILL.md`;
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
    success("Downloaded SKILL.md");
    trackEvent("export", { id: prompt.id, format: "skill" });
  }, [prompt, success]);

  const updateVariable = useCallback(
    (name: string, value: string) => {
      setVariableValues((prev) => ({ ...prev, [name]: value }));
    },
    [setVariableValues]
  );

  const handleRating = useCallback(
    async (value: RatingValue) => {
      if (ratingBusy) return;
      if (userRating === value) return;
      setRatingBusy(true);
      try {
        const response = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "prompt",
            contentId: prompt.id,
            value,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          error(payload?.error ?? "Unable to submit rating.");
          return;
        }
        setRatingSummary(payload?.summary ?? null);
        setUserRating(payload?.rating?.value ?? value);
        trackEvent("prompt_rating", { id: prompt.id, value });
      } catch {
        error("Unable to submit rating.");
      } finally {
        setRatingBusy(false);
      }
    },
    [error, prompt.id, ratingBusy, userRating]
  );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Back navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to prompts
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{prompt.category}</Badge>
          {prompt.featured && (
            <Badge className="bg-amber-500/20 text-amber-600">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {prompt.difficulty && (
            <Badge variant="outline">{prompt.difficulty}</Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-2">{prompt.title}</h1>
        <p className="text-lg text-muted-foreground mb-4">{prompt.description}</p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Rating</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-pressed={userRating === "up"}
              onClick={() => handleRating("up")}
              disabled={ratingBusy}
              className={userRating === "up" ? "border-emerald-300 text-emerald-600" : ""}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <span className="min-w-[2ch] text-neutral-700 dark:text-neutral-300">
              {ratingSummary?.upvotes ?? 0}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-pressed={userRating === "down"}
              onClick={() => handleRating("down")}
              disabled={ratingBusy}
              className={userRating === "down" ? "border-rose-300 text-rose-600" : ""}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <span className="min-w-[2ch] text-neutral-700 dark:text-neutral-300">
              {ratingSummary?.downvotes ?? 0}
            </span>
          </div>
          <Badge variant="secondary">
            {ratingSummary?.total ? `${ratingSummary.approvalRate}% approval` : "No ratings yet"}
          </Badge>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {prompt.author}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            v{prompt.version}
          </span>
          {prompt.estimatedTokens && (
            <span>~{prompt.estimatedTokens} tokens</span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {prompt.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Variable inputs */}
      {promptVariables.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {promptVariables.map((variable) => (
              <div key={variable.name}>
                <Label htmlFor={variable.name}>
                  {variable.label}
                  {variable.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {variable.description && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {variable.description}
                  </p>
                )}
                {variable.type === "multiline" ? (
                  <Textarea
                    id={variable.name}
                    value={variableValues[variable.name] ?? ""}
                    onChange={(e) =>
                      updateVariable(variable.name, e.target.value)
                    }
                    placeholder={getVariablePlaceholder(variable.name, variable.type)}
                    rows={3}
                  />
                ) : (
                  <Input
                    id={variable.name}
                    type="text"
                    value={variableValues[variable.name] ?? ""}
                    onChange={(e) =>
                      updateVariable(variable.name, e.target.value)
                    }
                    placeholder={getVariablePlaceholder(variable.name, variable.type)}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Context input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Additional Context</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste code, documentation, or other context here..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Prompt content */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Prompt</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstall}
              className="gap-2"
            >
              <Terminal className="h-4 w-4" />
              Install
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <ReportDialog
              contentType="prompt"
              contentId={prompt.id}
              contentTitle={prompt.title}
              triggerVariant="outline"
              triggerSize="sm"
              triggerClassName="gap-2"
              showLabel
            />
          </div>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-x-auto">
            {renderedContent}
          </pre>
        </CardContent>
      </Card>

      {/* When to use */}
      {prompt.whenToUse && prompt.whenToUse.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">When to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {prompt.whenToUse.map((use, i) => (
                <li key={i} className="text-muted-foreground">
                  {use}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {prompt.tips && prompt.tips.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {prompt.tips.map((tip, i) => (
                <li key={i} className="text-muted-foreground">
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ChangelogAccordion changelog={prompt.changelog} />

      <RelatedPrompts promptId={prompt.id} />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contentType="prompt"
        contentId={prompt.id}
        contentTitle={prompt.title}
        existingShare={existingShare}
        onShareCreated={(share) => setExistingShare(share)}
        onShareRevoked={() => setExistingShare(null)}
      />
    </div>
  );
}
