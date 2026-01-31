"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language = "bash",
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const result = await copyToClipboard(code);
    if (!result.success) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border/40 bg-neutral-900 dark:bg-neutral-950">
      {/* Header */}
      {(filename || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 dark:bg-neutral-900 border-b border-border/40">
          <div className="flex items-center gap-2">
            {filename && (
              <span className="text-xs text-neutral-400 font-mono">{filename}</span>
            )}
            {!filename && language && (
              <span className="text-xs text-neutral-500 uppercase">{language}</span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-neutral-400" />
            )}
          </button>
        </div>
      )}

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className={cn(
          "p-4 text-sm font-mono leading-relaxed",
          !filename && !language && "relative"
        )}>
          {!filename && !language && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100"
              aria-label={copied ? "Copied" : "Copy code"}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-neutral-400" />
              )}
            </button>
          )}
          <code className="text-neutral-100">
            {showLineNumbers ? (
              lines.map((line, i) => (
                <div key={i} className="table-row">
                  <span className="table-cell pr-4 text-neutral-500 select-none text-right">
                    {i + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))
            ) : (
              code
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}

interface CodeTabsProps {
  tabs: {
    label: string;
    language: string;
    code: string;
  }[];
}

export function CodeTabs({ tabs }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="rounded-lg overflow-hidden border border-border/40 bg-neutral-900 dark:bg-neutral-950">
      {/* Tab Headers */}
      <div className="flex border-b border-border/40 bg-neutral-800 dark:bg-neutral-900">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(index)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === index
                ? "text-white bg-neutral-900 dark:bg-neutral-950"
                : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <CodeBlock code={tabs[activeTab].code} language={tabs[activeTab].language} />
    </div>
  );
}
