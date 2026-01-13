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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/reporting/ReportDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RelatedPrompts } from "@/components/RelatedPrompts";
import { ChangelogAccordion } from "@/components/ChangelogAccordion";
import { trackEvent } from "@/lib/analytics";
import {
  renderPrompt,
  extractVariables,
  formatVariableName,
  getVariablePlaceholder,
} from "@jeffreysprompts/core/template";
import { generateSkillMd, getUniqueDelimiter } from "@jeffreysprompts/core/export";
import type { Prompt, PromptVariable } from "@jeffreysprompts/core/prompts/types";

interface PromptContentProps {
  prompt: Prompt;
}

type VariableValues = Record<string, string>;

// Safe prompt ID pattern (kebab-case: lowercase letters, numbers, hyphens)
const SAFE_PROMPT_ID = /^[a-z0-9-]+$/;

function buildInstallCommand(prompt: Prompt): string {
  // Validate prompt ID to prevent shell injection
  if (!SAFE_PROMPT_ID.test(prompt.id)) {
    throw new Error(`Invalid prompt ID: ${prompt.id}`);
  }

  const skillContent = generateSkillMd(prompt);
  const delimiter = getUniqueDelimiter(skillContent);
  
  return `mkdir -p ~/.config/claude/skills/${prompt.id} && cat > ~/.config/claude/skills/${prompt.id}/SKILL.md << '${delimiter}'\n${skillContent}\n${delimiter}`;
}

export function PromptContent({ prompt }: PromptContentProps) {
  const { success, error } = useToast();
  const [copied, setCopied] = useState(false);
  const [context, setContext] = useState("");
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
      await navigator.clipboard.writeText(renderedContent);
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
    } catch {
      error("Failed to copy to clipboard");
    }
  }, [renderedContent, prompt.id, success, error]);

  const handleInstall = useCallback(async () => {
    const command = buildInstallCommand(prompt);
    try {
      await navigator.clipboard.writeText(command);
      success("Install command copied - paste in terminal");
      trackEvent("skill_install", { id: prompt.id, source: "prompt_page" });
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success("Downloaded SKILL.md");
    trackEvent("export", { id: prompt.id, format: "skill" });
  }, [prompt, success]);

  const updateVariable = useCallback(
    (name: string, value: string) => {
      setVariableValues((prev) => ({ ...prev, [name]: value }));
    },
    [setVariableValues]
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
    </div>
  );
}
