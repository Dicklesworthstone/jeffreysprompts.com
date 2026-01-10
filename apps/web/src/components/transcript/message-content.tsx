"use client";

import { useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { detectLanguage } from "@/lib/transcript/utils";

interface MessageContentProps {
  content: string;
}

interface ContentBlock {
  type: "text" | "code";
  content: string;
  language?: string;
}

/**
 * Parse content into text and code blocks.
 * Handles fenced code blocks with optional language hints.
 */
function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.split("\n");

  let currentBlock: ContentBlock | null = null;
  let inCodeBlock = false;
  let codeBlockLanguage: string | undefined;

  for (const line of lines) {
    // Check for code fence start
    const fenceMatch = line.match(/^```(\w*)?$/);

    if (fenceMatch && !inCodeBlock) {
      // Starting a code block
      if (currentBlock && currentBlock.content.trim()) {
        blocks.push(currentBlock);
      }
      inCodeBlock = true;
      codeBlockLanguage = fenceMatch[1] || undefined;
      currentBlock = {
        type: "code",
        content: "",
        language: codeBlockLanguage,
      };
    } else if (line === "```" && inCodeBlock) {
      // Ending a code block
      if (currentBlock) {
        // If no language was specified in the fence, detect it
        if (!currentBlock.language && currentBlock.content.trim()) {
          currentBlock.language = detectLanguage(currentBlock.content);
        }
        blocks.push(currentBlock);
      }
      inCodeBlock = false;
      currentBlock = null;
    } else if (inCodeBlock && currentBlock) {
      // Inside a code block
      currentBlock.content += (currentBlock.content ? "\n" : "") + line;
    } else {
      // Regular text
      if (!currentBlock || currentBlock.type !== "text") {
        if (currentBlock && currentBlock.content.trim()) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: "text", content: "" };
      }
      currentBlock.content += (currentBlock.content ? "\n" : "") + line;
    }
  }

  // Don't forget the last block
  if (currentBlock && currentBlock.content.trim()) {
    if (currentBlock.type === "code" && !currentBlock.language) {
      currentBlock.language = detectLanguage(currentBlock.content);
    }
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * MessageContent - Renders markdown-like content with syntax-highlighted code blocks.
 *
 * Used in the transcript viewer to display Claude's responses with proper
 * code formatting and syntax highlighting.
 */
export function MessageContent({ content }: MessageContentProps) {
  const blocks = useMemo(() => parseContent(content), [content]);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="message-content space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <div key={index} className="relative rounded-lg overflow-hidden">
              {block.language && block.language !== "text" && (
                <div className="absolute top-0 right-0 px-2 py-1 text-xs font-mono text-zinc-400 bg-zinc-800/80 rounded-bl">
                  {block.language}
                </div>
              )}
              <SyntaxHighlighter
                language={block.language || "text"}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  lineHeight: "1.5",
                }}
                showLineNumbers={block.content.split("\n").length > 5}
                wrapLines
              >
                {block.content}
              </SyntaxHighlighter>
            </div>
          );
        }

        // Text block
        return (
          <div
            key={index}
            className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-relaxed"
          >
            {block.content}
          </div>
        );
      })}
    </div>
  );
}
