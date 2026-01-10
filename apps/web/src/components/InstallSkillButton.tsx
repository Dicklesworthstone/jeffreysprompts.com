"use client";

import { useState, useCallback } from "react";
import { Download, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface InstallSkillButtonProps {
  prompt: Prompt;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** Install to project (.claude/skills) instead of personal ($HOME/.config/claude/skills) */
  project?: boolean;
}

// Safe prompt ID pattern (kebab-case: lowercase letters, numbers, hyphens)
const SAFE_PROMPT_ID = /^[a-z0-9-]+$/;

/**
 * Generate a shell command to install a single skill via HEREDOC
 * Creates: mkdir + cat HEREDOC > SKILL.md
 */
function generateInstallCommand(prompt: Prompt, project: boolean): string {
  // Validate prompt ID to prevent shell injection
  if (!SAFE_PROMPT_ID.test(prompt.id)) {
    throw new Error(`Invalid prompt ID: ${prompt.id}`);
  }

  const skillContent = generateSkillMd(prompt);
  const baseDir = project
    ? ".claude/skills"
    : "$HOME/.config/claude/skills";
  const skillDir = `${baseDir}/${prompt.id}`;

  // Find a unique HEREDOC delimiter that doesn't appear in content
  let delimiter = "JFP_SKILL";
  let counter = 0;
  while (skillContent.includes(delimiter)) {
    counter++;
    delimiter = `JFP_SKILL_${counter}`;
  }

  const lines = [
    `mkdir -p "${skillDir}" && cat > "${skillDir}/SKILL.md" << '${delimiter}'`,
    skillContent,
    delimiter,
  ];

  return lines.join("\n");
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

  const handleCopy = useCallback(async () => {
    try {
      const command = generateInstallCommand(prompt, project);
      await navigator.clipboard.writeText(command);
      setCopied(true);
      success(
        "Install command copied",
        `Paste in terminal to install "${prompt.title}"`,
        4000
      );
      setTimeout(() => setCopied(false), 2000);
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
          <Check className="h-4 w-4 text-green-500" />
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

  const handleCopy = useCallback(async () => {
    try {
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
      await navigator.clipboard.writeText(command);
      setCopied(true);

      const skillCount = promptIds?.length
        ? `${promptIds.length} skill${promptIds.length > 1 ? "s" : ""}`
        : "all skills";

      success(
        "Install command copied",
        `Paste in terminal to install ${skillCount}`,
        4000
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
          <Check className="h-4 w-4 text-green-500" />
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
