"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  X,
  Trash2,
  FileText,
  Package,
  Copy,
  Check,
  ShoppingBasket,
} from "lucide-react";
import { useBasket } from "@/hooks/use-basket";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { getPrompt, type Prompt } from "@jeffreysprompts/core/prompts";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";

interface BasketSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BasketSidebar({ isOpen, onClose }: BasketSidebarProps) {
  const { items, removeItem, clearBasket } = useBasket();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

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
        // ZIP download for multiple prompts
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
    } catch (_error) {
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
    } catch (_error) {
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

    const ids = basketPrompts.map((p) => p.id).join(" ");
    const command = `jfp install ${ids}`;

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast({
        type: "success",
        title: "Copied",
        message: "Install command copied to clipboard",
      });
      trackEvent("skill_install", { count: basketPrompts.length, source: "basket" });
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast({
        title: "Copy failed",
        message: "Could not copy to clipboard",
        type: "error",
      });
    }
  };

  const handleClearBasket = () => {
    clearBasket();
    toast({
      type: "info",
      title: "Basket cleared",
      message: "All items removed from basket",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 h-full w-80 max-w-full bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Basket</h2>
            <span className="text-sm text-muted-foreground">
              ({basketPrompts.length})
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          {basketPrompts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingBasket className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Your basket is empty</p>
              <p className="text-sm mt-1">
                Add prompts to export them together
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {basketPrompts.map((prompt) => (
                <li
                  key={prompt.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
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
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeItem(prompt.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
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
              <FileText className="h-4 w-4" />
              Download as Markdown
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleDownloadSkills}
              disabled={exporting}
            >
              <Package className="h-4 w-4" />
              Download as Skills ZIP
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleCopyInstallCommand}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy Install Command
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleClearBasket}
            >
              <Trash2 className="h-4 w-4" />
              Clear Basket
            </Button>
          </div>
        )}
      </aside>
    </>
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
