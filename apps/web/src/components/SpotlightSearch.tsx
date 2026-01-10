"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { searchPrompts, semanticRerank, type SearchResult, type RankedResult } from "@jeffreysprompts/core/search"
import { Badge } from "./ui/badge"
import { useToast } from "@/components/ui/toast"
import { useLocalStorage } from "@/hooks/useLocalStorage"

// ============================================================================
// Types
// ============================================================================

interface SpotlightSearchProps {
  /** Called when a prompt is selected */
  onSelect?: (promptId: string) => void
  /** Whether to copy to clipboard on select (default: true) */
  copyOnSelect?: boolean
}

// ============================================================================
// Icons
// ============================================================================

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
)

const CommandIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-3", className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.5 21C4.01472 21 2 18.9853 2 16.5V14H4V16.5C4 17.8807 5.11929 19 6.5 19C7.88071 19 9 17.8807 9 16.5V14H11V16.5C11 18.9853 8.98528 21 6.5 21Z" />
    <path d="M17.5 21C15.0147 21 13 18.9853 13 16.5V14H15V16.5C15 17.8807 16.1193 19 17.5 19C18.8807 19 20 17.8807 20 16.5V14H22V16.5C22 18.9853 19.9853 21 17.5 21Z" />
    <path d="M6.5 3C4.01472 3 2 5.01472 2 7.5V10H4V7.5C4 6.11929 5.11929 5 6.5 5C7.88071 5 9 6.11929 9 7.5V10H11V7.5C11 5.01472 8.98528 3 6.5 3Z" />
    <path d="M17.5 3C15.0147 3 13 5.01472 13 7.5V10H15V7.5C15 6.11929 16.1193 5 17.5 5C18.8807 5 20 6.11929 20 7.5V10H22V7.5C22 5.01472 19.9853 3 17.5 3Z" />
    <path d="M9 14H15V10H9V14Z" />
  </svg>
)

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
)

// ============================================================================
// Debounce Hook
// ============================================================================

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ============================================================================
// Component
// ============================================================================

export function SpotlightSearch({
  onSelect,
  copyOnSelect = true,
}: SpotlightSearchProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [copied, setCopied] = React.useState<string | null>(null)
  const [isReranking, setIsReranking] = React.useState(false)
  const { success, error } = useToast()

  // Persist semantic mode preference
  const [semanticMode, setSemanticMode] = useLocalStorage("jfp-semantic-search", false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Debounce search query
  const debouncedQuery = useDebouncedValue(query, 150)

  // Search when query changes
  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    let cancelled = false

    async function performSearch() {
      // Get more results if we'll be reranking
      const limit = semanticMode ? 20 : 10
      const searchResults = searchPrompts(debouncedQuery, { limit })

      if (cancelled) return

      if (semanticMode && searchResults.length > 0) {
        setIsReranking(true)
        setResults(searchResults) // Show BM25 results immediately

        try {
          // Convert to RankedResult format
          const rankedResults: RankedResult[] = searchResults.map((r) => ({
            id: r.prompt.id,
            score: r.score,
            text: `${r.prompt.title} ${r.prompt.description} ${r.prompt.tags.join(" ")}`,
          }))

          // Apply semantic reranking with hash fallback
          const reranked = await semanticRerank(debouncedQuery, rankedResults, {
            topN: 20,
            fallback: "hash",
          })

          if (cancelled) return

          // Map back to SearchResult format
          const rerankedIds = reranked.map((r) => r.id)
          const resultById = new Map(searchResults.map((r) => [r.prompt.id, r]))

          const rerankedResults = rerankedIds
            .map((id, idx) => {
              const original = resultById.get(id)
              if (!original) return null
              return { ...original, score: reranked[idx].score }
            })
            .filter((r): r is SearchResult => r !== null)
            .slice(0, 10)

          setResults(rerankedResults)
          trackEvent("search", {
            queryLength: debouncedQuery.length,
            resultCount: rerankedResults.length,
            source: "spotlight",
            semantic: true,
          })
        } catch (err) {
          console.warn("[SpotlightSearch] Semantic rerank failed, using BM25:", err)
          if (cancelled) return
          trackEvent("search", {
            queryLength: debouncedQuery.length,
            resultCount: searchResults.slice(0, 10).length,
            source: "spotlight",
            semantic: true,
          })
          // Keep BM25 results on failure
        } finally {
          if (!cancelled) setIsReranking(false)
        }
      } else {
        const nextResults = searchResults.slice(0, 10)
        if (cancelled) return
        setResults(nextResults)
        trackEvent("search", {
          queryLength: debouncedQuery.length,
          resultCount: nextResults.length,
          source: "spotlight",
          semantic: semanticMode,
        })
      }

      if (!cancelled) setSelectedIndex(0)
    }

    performSearch()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, semanticMode])

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when opening
  React.useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    } else {
      // Reset state when closing
      setQuery("")
      setResults([])
      setSelectedIndex(0)
      setCopied(null)
    }
  }, [isOpen])

  // Scroll selected item into view
  React.useEffect(() => {
    if (listRef.current && results.length > 0) {
      const items = listRef.current.querySelectorAll("[data-result-item]")
      const selectedItem = items[selectedIndex] as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex, results.length])

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case "Enter":
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          setIsOpen(false)
          break
      }
    },
    [results, selectedIndex]
  )

  // Handle prompt selection
  const handleSelect = React.useCallback(
    async (result: SearchResult) => {
      const promptId = result.prompt.id

      if (copyOnSelect) {
        try {
          await navigator.clipboard.writeText(result.prompt.content)
          setCopied(promptId)
          success("Copied prompt", result.prompt.title, 2500)
          // Keep dialog open briefly to show feedback
          setTimeout(() => setIsOpen(false), 500)
        } catch (err) {
          console.error("Failed to copy:", err)
          error("Failed to copy", "Please try again")
          setIsOpen(false)
        }
      } else {
        setIsOpen(false)
      }

      onSelect?.(promptId)
    },
    [copyOnSelect, onSelect, success, error]
  )

  // Don't render on server
  if (typeof document === "undefined") return null

  return createPortal(
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-50",
            "bg-black/60 backdrop-blur-sm",
            "animate-in fade-in-0 duration-200"
          )}
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search prompts"
          className={cn(
            "fixed left-1/2 top-[15%] z-50 -translate-x-1/2",
            "w-[calc(100%-2rem)] max-w-xl",
            "bg-card text-card-foreground",
            "border shadow-2xl rounded-xl",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            "overflow-hidden"
          )}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <SearchIcon className="text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search prompts..."
              className={cn(
                "flex-1 bg-transparent outline-none",
                "text-base placeholder:text-muted-foreground"
              )}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="spotlight-results"
              aria-activedescendant={results[selectedIndex] ? `spotlight-result-${results[selectedIndex].prompt.id}` : undefined}
              aria-autocomplete="list"
            />
            {/* Semantic mode toggle */}
            <button
              type="button"
              onClick={() => setSemanticMode(!semanticMode)}
              title={semanticMode ? "Semantic search enabled" : "Enable semantic search"}
              className={cn(
                "shrink-0 p-1.5 rounded-md transition-colors",
                semanticMode
                  ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-pressed={semanticMode}
              aria-label="Toggle semantic search"
            >
              <SparklesIcon className={cn(isReranking && "animate-pulse")} />
            </button>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-muted rounded font-mono">
              esc
            </kbd>
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            id="spotlight-results"
            role="listbox"
            aria-label="Search results"
            className={cn(
              "max-h-[60vh] overflow-y-auto",
              "overscroll-contain"
            )}
          >
            {results.length === 0 && query && (
              <div className="px-4 py-8 text-center text-muted-foreground" role="status">
                No results for &quot;{query}&quot;
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                Start typing to search prompts...
              </div>
            )}

            {results.map((result, index) => (
              <button
                key={result.prompt.id}
                id={`spotlight-result-${result.prompt.id}`}
                data-result-item
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(result)}
                className={cn(
                  "w-full px-4 py-3 text-left",
                  "flex flex-col gap-1",
                  "transition-colors duration-100",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50",
                  copied === result.prompt.id && "bg-green-500/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {result.prompt.title}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {result.prompt.category}
                  </Badge>
                  {copied === result.prompt.id && (
                    <span className="text-xs text-green-600 dark:text-green-400 ml-auto" aria-live="polite">
                      Copied!
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {result.prompt.description}
                </p>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 px-4 py-2 border-t text-xs text-muted-foreground bg-muted/30">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↓</kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↵</kbd>
                <span className="ml-1">Copy</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {semanticMode && (
                <span className="flex items-center gap-1 text-amber-500">
                  <SparklesIcon className={cn("size-3", isReranking && "animate-pulse")} />
                  {isReranking ? "Improving..." : "Semantic"}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CommandIcon className="size-3" />
                <span>K</span>
                <span className="ml-1">to open</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}

// ============================================================================
// Trigger Button (optional, for visible button)
// ============================================================================

interface SpotlightTriggerProps {
  className?: string
}

export function SpotlightTrigger({ className }: SpotlightTriggerProps) {
  const handleClick = React.useCallback(() => {
    // Simulate Cmd+K press
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }, [])

  return (
    <button
      onClick={handleClick}
      aria-label="Search prompts (Cmd+K)"
      className={cn(
        "flex items-center gap-2 px-3 py-2",
        "text-sm text-muted-foreground",
        "bg-muted/50 border rounded-lg",
        "hover:bg-muted transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <SearchIcon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Search prompts...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-xs bg-background rounded font-mono" aria-hidden="true">
        <CommandIcon className="size-3" />K
      </kbd>
    </button>
  )
}
