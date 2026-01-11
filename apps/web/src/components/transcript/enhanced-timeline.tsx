"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  User,
  Bot,
  Wrench,
  Code,
  Copy,
  Check,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type TranscriptMessage,
  type TranscriptSection,
} from "@/lib/transcript/types";
import { formatTime } from "@/lib/transcript/utils";

interface EnhancedTimelineProps {
  messages: TranscriptMessage[];
  sections: TranscriptSection[];
}

// Progress indicator showing overall position
function TimelineProgress({
  sections,
  expandedSections,
}: {
  sections: TranscriptSection[];
  expandedSections: Set<string>;
}) {
  return (
    <div className="hidden lg:flex flex-col items-center gap-1 sticky top-24 mr-6">
      {sections.map((section) => (
        <div
          key={section.id}
          className={cn(
            "w-3 h-3 rounded-full transition-all duration-300",
            expandedSections.has(section.id)
              ? "bg-violet-500 scale-125"
              : "bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600"
          )}
          title={section.title}
        />
      ))}
    </div>
  );
}

// Enhanced section header
function SectionHeader({
  section,
  index,
  isExpanded,
  onToggle,
  messageCount,
}: {
  section: TranscriptSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  messageCount: number;
}) {
  return (
    <motion.button
      onClick={onToggle}
      className={cn(
        "w-full group relative",
        "p-4 sm:p-5 rounded-2xl",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200/50 dark:border-zinc-800/50",
        "hover:border-violet-300 dark:hover:border-violet-700",
        "hover:shadow-lg hover:shadow-violet-500/5",
        "transition-all duration-300",
        isExpanded && "ring-2 ring-violet-500/20"
      )}
    >
      {/* Gradient accent on hover */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 rounded-t-2xl",
          "bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      />

      <div className="flex items-center gap-4">
        {/* Section number */}
        <div
          className={cn(
            "relative flex-shrink-0 w-12 h-12 rounded-xl",
            "bg-gradient-to-br from-violet-500 to-purple-600",
            "flex items-center justify-center",
            "text-white font-bold text-lg",
            "shadow-lg shadow-violet-500/30",
            "transition-transform duration-300",
            "group-hover:scale-110"
          )}
        >
          {index + 1}
          {/* Pulse effect when expanded */}
          {isExpanded && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-xl bg-violet-500"
            />
          )}
        </div>

        {/* Section info */}
        <div className="flex-1 text-left min-w-0">
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate">
            {section.title}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {section.summary}
          </p>
        </div>

        {/* Stats and toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {messageCount}
            </span>
            <span className="text-xs text-zinc-500">msgs</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
          >
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          </motion.div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-3 ml-16">
        {section.tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              "px-2 py-0.5 rounded-md text-xs font-medium",
              "bg-violet-100 dark:bg-violet-900/30",
              "text-violet-700 dark:text-violet-300"
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

// Individual message component
function MessageCard({ message }: { message: TranscriptMessage }) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUser = message.type === "user";
  const hasTools = message.toolCalls && message.toolCalls.length > 0;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Truncate very long content
  const displayContent =
    message.content.length > 500
      ? message.content.slice(0, 500) + "..."
      : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative pl-4 border-l-2 transition-colors",
        isUser
          ? "border-violet-500 hover:border-violet-400"
          : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            isUser
              ? "bg-violet-100 dark:bg-violet-900/50"
              : "bg-zinc-100 dark:bg-zinc-800"
          )}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          ) : (
            <Bot className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            isUser
              ? "text-violet-700 dark:text-violet-300"
              : "text-zinc-600 dark:text-zinc-400"
          )}
        >
          {isUser ? "Human" : "Claude"}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatTime(message.timestamp)}
        </span>

        {/* Tools indicator */}
        {hasTools && (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 ml-auto">
            <Wrench className="w-3 h-3" />
            {message.toolCalls!.length} tools
          </span>
        )}

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={cn(
            "p-1.5 rounded-md opacity-0 group-hover:opacity-100",
            "hover:bg-zinc-100 dark:hover:bg-zinc-800",
            "transition-all"
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div
        className={cn(
          "text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed",
          "whitespace-pre-wrap break-words",
          "bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3"
        )}
      >
        {displayContent}
      </div>

      {/* Tool calls */}
      {hasTools && (
        <div className="mt-2 space-y-1">
          {message.toolCalls!.slice(0, 3).map((tc) => (
            <div
              key={tc.id}
              className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
            >
              <Code className="w-3 h-3" />
              <span className="font-mono">{tc.name}</span>
              {typeof tc.input?.file_path === "string" && (
                <span className="truncate text-zinc-400">
                  {tc.input.file_path.split("/").pop()}
                </span>
              )}
            </div>
          ))}
          {message.toolCalls!.length > 3 && (
            <span className="text-xs text-zinc-400">
              +{message.toolCalls!.length - 3} more tools
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Message list with virtualization-like behavior
function MessageList({ messages }: { messages: TranscriptMessage[] }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const hasMore = visibleCount < messages.length;

  const visibleMessages = useMemo(
    () => messages.slice(0, visibleCount),
    [messages, visibleCount]
  );

  return (
    <div className="space-y-4 py-4 px-2 sm:px-4">
      {visibleMessages.map((msg) => (
        <MessageCard key={msg.id} message={msg} />
      ))}

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + 20)}
          className={cn(
            "w-full py-3 rounded-xl",
            "bg-zinc-100 dark:bg-zinc-800",
            "text-sm font-medium text-zinc-600 dark:text-zinc-400",
            "hover:bg-zinc-200 dark:hover:bg-zinc-700",
            "transition-colors"
          )}
        >
          Show more ({messages.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}

export function EnhancedTimeline({
  messages,
  sections,
}: EnhancedTimelineProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([sections[0]?.id])
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get messages for a section, filtered by search query
  const getSectionMessages = useCallback((section: TranscriptSection) => {
    const sectionMessages = messages.slice(section.startIndex, section.endIndex + 1);

    if (!searchQuery.trim()) {
      return sectionMessages;
    }

    const query = searchQuery.toLowerCase();
    return sectionMessages.filter((msg) =>
      msg.content.toLowerCase().includes(query) ||
      msg.toolCalls?.some((tc) =>
        tc.name.toLowerCase().includes(query) ||
        (typeof tc.input?.file_path === "string" && tc.input.file_path.toLowerCase().includes(query))
      )
    );
  }, [messages, searchQuery]);

  // Check if any section has matching messages (for UI feedback)
  const hasSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return true;
    return sections.some((section) => getSectionMessages(section).length > 0);
  }, [searchQuery, sections, getSectionMessages]);

  return (
    <div className="relative" id="timeline">
      {/* Section title */}
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          Session Timeline
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          {messages.length.toLocaleString()} messages across {sections.length}{" "}
          development phases
        </p>
      </div>

      {/* Search - mobile optimized */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "w-full pl-10 pr-4 py-3 rounded-xl",
            "bg-white dark:bg-zinc-900",
            "border border-zinc-200 dark:border-zinc-800",
            "text-zinc-900 dark:text-zinc-100",
            "placeholder:text-zinc-400",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/50",
            "transition-all"
          )}
        />
      </div>

      {/* No search results message */}
      {searchQuery.trim() && !hasSearchResults && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No messages found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}

      {/* Main layout with progress indicator */}
      {(hasSearchResults || !searchQuery.trim()) && (
        <div className="flex">
          <TimelineProgress
            sections={sections}
            expandedSections={expandedSections}
          />

          {/* Sections */}
          <div className="flex-1 space-y-4">
            {sections.map((section, index) => {
              const sectionMessages = getSectionMessages(section);
              const isExpanded = expandedSections.has(section.id);

              // Hide sections with no matching messages when searching
              if (searchQuery.trim() && sectionMessages.length === 0) {
                return null;
              }

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <SectionHeader
                    section={section}
                    index={index}
                    isExpanded={isExpanded}
                    onToggle={() => toggleSection(section.id)}
                    messageCount={sectionMessages.length}
                  />

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 ml-6 border-l-2 border-violet-200 dark:border-violet-800">
                          <MessageList messages={sectionMessages} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
