"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Download, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/clipboard";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface InstallSkillButtonProps {
  prompt: Prompt;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** Install to project (.claude/skills) instead of personal ($HOME/.config/claude/skills) */
  project?: boolean;
}

/**
 * Button to copy a shell install command for a single skill
 */
export function InstallSkillButton({
  prompt,
  variant = "outline",
  size = "sm",
  className,
  project = false,
}: InstallSkillButtonProps) {
  const [copied, setCopied] = useState(false);
  const { success, error } = useToast();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : "https://jeffreysprompts.com";
      const params = new URLSearchParams({ ids: prompt.id });
      if (project) {
        params.set("project", "1");
      }
      const url = `${baseUrl}/install.sh?${params.toString()}`;
      const command = `curl -fsSL "${url}" | bash`;
      const result = await copyToClipboard(command);
      if (result.success) {
        setCopied(true);
        success(
          "Install command copied",
          `Paste in terminal to install "${prompt.title}"`,
          { duration: 4000 }
        );
        trackEvent("skill_install", { id: prompt.id, source: "install_button", project });
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = setTimeout(() => {
          setCopied(false);
          resetTimerRef.current = null;
        }, 2000);
      } else {
        error("Failed to copy", "Please try again");
      }
    } catch {
      error("Failed to copy", "Please try again");
    }
  }, [prompt, project, success, error]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("gap-2", className)}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Terminal className="h-4 w-4" />
          <span>Install Skill</span>
        </>
      )}
    </Button>
  );
}

interface InstallAllSkillsButtonProps {
  promptIds?: string[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** Install to project (.claude/skills) instead of personal ($HOME/.config/claude/skills) */
  project?: boolean;
}

/**
 * Button to copy curl|bash command for installing all (or selected) skills
 * Uses the /install-cli.sh endpoint
 */
export function InstallAllSkillsButton({
  promptIds,
  variant = "default",
  size = "default",
  className,
  project = false,
}: InstallAllSkillsButtonProps) {
  const [copied, setCopied] = useState(false);
  const { success, error } = useToast();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    // Build the install URL
    const baseUrl = typeof window !== "undefined"
      ? window.location.origin
      : "https://jeffreysprompts.com";

    let url = `${baseUrl}/install.sh`;
    const params = new URLSearchParams();

    if (promptIds && promptIds.length > 0) {
      params.set("ids", promptIds.join(","));
    }
    if (project) {
      params.set("project", "1");
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const command = `curl -fsSL "${url}" | bash`;
    const result = await copyToClipboard(command);

    if (result.success) {
      setCopied(true);

      const skillCount = promptIds?.length
        ? `${promptIds.length} skill${promptIds.length > 1 ? "s" : ""}`
        : "all skills";

      success(
        "Install command copied",
        `Paste in terminal to install ${skillCount}`,
        { duration: 4000 }
      );
      trackEvent("skill_install", {
        count: promptIds?.length ?? "all",
        source: "install_all_button",
        project,
      });
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, 2000);
    } else {
      error("Failed to copy", "Please try again");
    }
  }, [promptIds, project, success, error]);

  const label = promptIds?.length
    ? `Install ${promptIds.length} Skill${promptIds.length > 1 ? "s" : ""}`
    : "Install All Skills";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("gap-2", className)}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
