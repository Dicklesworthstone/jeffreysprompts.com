"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { searchPrompts, type SearchResult } from "@jeffreysprompts/core/search/engine"
import { semanticRerank, type RankedResult } from "@jeffreysprompts/core/search/semantic"
import { featuredPrompts, prompts, categories as CATEGORIES } from "@jeffreysprompts/core/prompts/registry"
import type { Prompt, PromptCategory } from "@jeffreysprompts/core/prompts/types"
import { Badge } from "./ui/badge"
import { useToast } from "@/components/ui/toast"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { useIsSmallScreen } from "@/hooks/useIsMobile"
import { trackHistoryView } from "@/lib/history/client"
import { copyToClipboard } from "@/lib/clipboard"
import { AgenticScan } from "./AgenticScan"

// ============================================================================
// Constants
// ============================================================================

const MAX_RECENT_SEARCHES = 5

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

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
  </svg>
)

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
)

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

const XIcon = ({ className }: { className?: string }) => (
  <svg className={cn("size-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
)

// ============================================================================
// Skeleton Component
// ============================================================================

/** Skeleton placeholder for search results during semantic reranking */
function SearchResultSkeleton({ index }: { index: number }) {
  return (
    <div
      className="px-4 py-3 flex items-start gap-3 animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-4 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
        </div>
        <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
        <div className="flex gap-1.5 mt-1.5">
          <div className="h-4 w-12 bg-neutral-100 dark:bg-neutral-800 rounded" />
          <div className="h-4 w-14 bg-neutral-100 dark:bg-neutral-800 rounded" />
        </div>
      </div>
      <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
    </div>
  )
}

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
  const [selectedCategory, setSelectedCategory] = React.useState<PromptCategory | null>(null)
  const isMobile = useIsSmallScreen()
  const { success, error } = useToast()

  // Persist semantic mode preference and recent searches
  const [semanticMode, setSemanticMode] = useLocalStorage("jfp-semantic-search", false)
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>("jfp-recent-searches", [])

  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null)

  // Save search to recent searches
  const saveRecentSearch = React.useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== searchQuery.toLowerCase())
      return [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    })
    trackHistoryView({ resourceType: "search", searchQuery: searchQuery.trim(), source: "spotlight" })
  }, [setRecentSearches])

  // Clear recent searches
  const clearRecentSearches = React.useCallback(() => {
    setRecentSearches([])
  }, [setRecentSearches])

  // Debounce search query
  const debouncedQuery = useDebouncedValue(query, 150)
  const isSearching = query.trim() !== debouncedQuery.trim()

  // Search when query changes
  React.useEffect(() => {
    if (!debouncedQuery.trim() && !selectedCategory) {
      setResults([])
      setIsReranking(false)
      return
    }

    if (!debouncedQuery.trim() && selectedCategory) {
      const categoryResults: SearchResult[] = prompts
        .filter((prompt) => prompt.category === selectedCategory)
        .map((prompt) => ({
          prompt,
          score: 1,
          matchedFields: ["category"],
        }))
      setResults(categoryResults)
      setIsReranking(false)
      trackEvent("search", {
        queryLength: 0,
        resultCount: categoryResults.length,
        source: "spotlight",
        semantic: false,
      })
      setSelectedIndex(0)
      return
    }

    let cancelled = false

    async function performSearch() {
      // Get more results if we'll be reranking
      const limit = semanticMode ? 20 : 10
      const searchOptions: Parameters<typeof searchPrompts>[1] = { limit }

      // Add category filter if selected
      if (selectedCategory) {
        searchOptions.category = selectedCategory
      }

      const searchResults = searchPrompts(debouncedQuery || "", searchOptions)

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

          // Apply semantic reranking with hash fallback and a safety timeout
          const rerankPromise = semanticRerank(debouncedQuery, rankedResults, {
            topN: 20,
            fallback: "hash",
          })

          const timeoutPromise = new Promise<RankedResult[]>((_, reject) => 
            setTimeout(() => reject(new Error("rerank_timeout")), 2000)
          )

          const reranked = await Promise.race([rerankPromise, timeoutPromise])

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
          // Limit to 10 results on failure (same as non-semantic mode)
          const fallbackResults = searchResults.slice(0, 10)
          setResults(fallbackResults)
          trackEvent("search", {
            queryLength: debouncedQuery.length,
            resultCount: fallbackResults.length,
            source: "spotlight",
            semantic: false, // Fell back to BM25
          })
        } finally {
          if (!cancelled) setIsReranking(false)
        }
      } else {
        setIsReranking(false)
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
      setIsReranking(false)
    }
  }, [debouncedQuery, semanticMode, selectedCategory])

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

  // Allow other components to open SpotlightSearch
  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener("jfp:open-spotlight", handleOpen as EventListener)
    return () => window.removeEventListener("jfp:open-spotlight", handleOpen as EventListener)
  }, [])

  // Focus management when opening/closing
  React.useEffect(() => {
    if (isOpen) {
      // Save the previously focused element for restoration on close (accessibility)
      previousActiveElementRef.current = document.activeElement as HTMLElement | null
      // Small delay for animation
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    } else {
      // Reset state when closing
      setQuery("")
      setResults([])
      setSelectedIndex(0)
      setCopied(null)
      setSelectedCategory(null)
      // Restore focus to previously focused element (accessibility)
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus()
        previousActiveElementRef.current = null
      }
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

  // Unified prompt selection handler
  const selectPrompt = React.useCallback(
    async (prompt: Prompt) => {
      const promptId = prompt.id

      if (copyOnSelect) {
        try {
          const result = await copyToClipboard(prompt.content)
          if (!result.success) {
            throw result.error ?? new Error("Clipboard copy failed")
          }
          setCopied(promptId)
          success("Copied prompt", prompt.title, { duration: 2500 })
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

  // Handle prompt selection from search results
  const handleSelect = React.useCallback(
    async (result: SearchResult) => {
      // Save search query to recent searches
      if (query.trim()) {
        saveRecentSearch(query.trim())
      }
      await selectPrompt(result.prompt)
    },
    [query, saveRecentSearch, selectPrompt]
  )

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const maxIndex = Math.max(0, results.length - 1)
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, maxIndex))
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
    [results, selectedIndex, handleSelect]
  )

  // Helper to handle featured prompt selection
  const handleFeaturedSelect = React.useCallback(
    (prompt: Prompt) => {
      selectPrompt(prompt)
    },
    [selectPrompt]
  )

  // Don't render on server
  if (typeof document === "undefined") return null

  // Show featured prompts in empty state
  const showFeatured = !query.trim() && featuredPrompts.length > 0

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="spotlight-backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)}
            aria-hidden
          />

          {/* Dialog */}
          <motion.div
            key="spotlight-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search prompts"
            className={cn(
              "fixed z-50 bg-card/80 backdrop-blur-2xl text-card-foreground overflow-hidden",
              // Mobile: full screen with flex layout
              isMobile ? [
                "inset-0 flex flex-col",
                "pt-[env(safe-area-inset-top)]",
                "pb-[env(safe-area-inset-bottom)]",
              ] : [
                "left-1/2 top-[12%]",
                "w-[calc(100%-2rem)] max-w-xl",
                "border border-border/40 rounded-2xl",
                "shadow-[0_25px_80px_-12px_rgba(0,0,0,0.4)]",
              ]
            )}
            initial={isMobile ? { opacity: 0, y: 30 } : { opacity: 0, scale: 0.95, x: "-50%", y: -20 }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, x: "-50%", y: 0 }}
            exit={isMobile ? { opacity: 0, y: 30 } : { opacity: 0, scale: 0.95, x: "-50%", y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <AnimatePresence>
              {isReranking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AgenticScan />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Search Input */}
            <div className={cn(
              "relative flex items-center gap-3 px-4 border-b border-border/50 overflow-hidden",
              isMobile ? "py-4" : "py-3.5"
            )}>
              {/* Scanning bar for semantic search */}
              <AnimatePresence>
                {isReranking && (
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10"
                    style={{
                      background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
                    }}
                  />
                )}
              </AnimatePresence>

              <SearchIcon className="text-muted-foreground/70 shrink-0 relative z-10" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search prompts..."
                className={cn(
                  "flex-1 bg-transparent outline-none relative z-10",
                  "text-base placeholder:text-muted-foreground/60 font-medium"
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
                  "relative shrink-0 size-10 rounded-lg flex items-center justify-center transition-all duration-300 touch-manipulation z-10",
                  semanticMode
                    ? "text-amber-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                aria-pressed={semanticMode}
                aria-label="Toggle semantic search"
              >
                {semanticMode && (
                  <motion.div
                    layoutId="semantic-glow"
                    className="absolute inset-0 rounded-lg bg-amber-500/10 blur-sm"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                <SparklesIcon className={cn("size-4 relative z-10", isReranking && "animate-pulse")} />
              </button>
              {/* Mobile: close button / Desktop: esc hint */}
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 size-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation z-10"
                  aria-label="Close search"
                >
                  <XIcon className="size-5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-tight text-muted-foreground/70 bg-muted/50 rounded-md font-mono border border-border/50 relative z-10">
                  esc
                </kbd>
              )}
            </div>

            {/* Category pills - horizontal scroll on mobile */}
            <div
              className={cn(
                "flex gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/20",
                "overflow-x-auto scrollbar-none"
              )}
              role="group"
              aria-label="Filter by category"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                aria-pressed={!selectedCategory}
                aria-label="Show all categories"
                className={cn(
                  "shrink-0 px-3 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-colors touch-manipulation",
                  !selectedCategory
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                All
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  aria-pressed={selectedCategory === category}
                  aria-label={`Filter by ${category}`}
                  className={cn(
                    "shrink-0 px-3 py-2.5 min-h-[44px] rounded-full text-sm font-medium capitalize transition-colors touch-manipulation",
                    selectedCategory === category
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              id="spotlight-results"
              role="listbox"
              aria-label="Search results"
              className={cn(
                "overflow-y-auto overscroll-contain",
                isMobile ? "flex-1" : "max-h-[60vh]"
              )}
            >
              {/* Recent searches - shown when no query and no category selected */}
              {!query.trim() && !selectedCategory && recentSearches.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      aria-label="Clear recent search history"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((recentQuery) => (
                    <button
                      key={recentQuery}
                      onClick={() => setQuery(recentQuery)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left",
                        "flex items-center gap-3",
                        "transition-colors duration-150",
                        "hover:bg-muted/50"
                      )}
                      aria-label={`Search for "${recentQuery}"`}
                    >
                      <ClockIcon className="size-4 text-muted-foreground/40 shrink-0" aria-hidden="true" />
                      <span className="text-sm text-foreground truncate">{recentQuery}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* No results state */}
              {results.length === 0 && query && !isSearching && !isReranking && (
                <div className="px-4 py-10 text-center" role="status">
                  <p className="text-muted-foreground">No results for &quot;{query}&quot;</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Try different keywords or enable semantic search</p>
                </div>
              )}

              {/* Skeleton loading state during search or semantic reranking */}
              {results.length === 0 && (isSearching || isReranking) && query.trim() !== "" && (
                <div className="py-2" role="status" aria-label="Loading search results">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SearchResultSkeleton key={i} index={i} />
                  ))}
                </div>
              )}

              {/* Featured prompts in empty state */}
              {showFeatured && !selectedCategory && (
                <div className="py-2">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <StarIcon className="size-3.5 text-amber-500" aria-hidden="true" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Featured</span>
                  </div>
                  {featuredPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handleFeaturedSelect(prompt)}
                      aria-label={`Copy "${prompt.title}" to clipboard`}
                      className={cn(
                        "w-full px-4 py-3 text-left",
                        "flex items-start gap-3",
                        "transition-colors duration-150",
                        "hover:bg-muted/50",
                        copied === prompt.id && "bg-emerald-500/10"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground truncate">
                            {prompt.title}
                          </span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0 capitalize">
                            {prompt.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {prompt.description}
                        </p>
                        {/* Preview snippet */}
                        <p className="text-xs text-muted-foreground/60 mt-1.5 line-clamp-1 font-mono">
                          {prompt.content.slice(0, 80)}...
                        </p>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        {copied === prompt.id ? (
                          <CheckIcon className="size-4 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <CopyIcon className="size-4 text-muted-foreground/40" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Search results with layout animations for smooth reordering */}
              <AnimatePresence mode="popLayout">
                {results.map((result, index) => (
                  <motion.button
                    key={result.prompt.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      layout: { duration: 0.25, ease: "easeOut" },
                      opacity: { duration: 0.2 },
                      y: { duration: 0.2, delay: index * 0.02 },
                    }}
                    id={`spotlight-result-${result.prompt.id}`}
                    data-result-item
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full px-4 py-3 text-left",
                      "flex items-start gap-3",
                      "transition-colors duration-150",
                      index === selectedIndex
                        ? "bg-neutral-100 dark:bg-neutral-800/50"
                        : "hover:bg-muted/50",
                      copied === result.prompt.id && "bg-emerald-500/10",
                      isReranking && "opacity-70"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "truncate",
                          index === selectedIndex ? "text-neutral-900 dark:text-white font-semibold" : "text-foreground font-medium"
                        )}>
                          {result.prompt.title}
                        </span>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0 capitalize">
                          {result.prompt.category}
                        </Badge>
                        {result.prompt.featured && (
                          <StarIcon className="size-3 text-amber-500 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {result.prompt.description}
                      </p>
                      {/* Tags */}
                      {result.prompt.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {result.prompt.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 pt-0.5">
                      {copied === result.prompt.id ? (
                        <CheckIcon className="size-4 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <CopyIcon className={cn(
                          "size-4",
                          index === selectedIndex ? "text-neutral-600 dark:text-neutral-400" : "text-muted-foreground/40"
                        )} aria-hidden="true" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-t border-border/50 text-xs text-muted-foreground/70 bg-muted/20">
              <div className="flex items-center gap-4">
                <span className="hidden sm:flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-muted/70 rounded font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-muted/70 rounded font-mono">↓</kbd>
                  <span className="ml-0.5">Navigate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-muted/70 rounded font-mono">↵</kbd>
                  <span className="ml-0.5">Copy</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {semanticMode && (
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <SparklesIcon className={cn("size-3", isReranking && "animate-pulse")} aria-hidden="true" />
                    {isReranking ? "Improving..." : "Semantic"}
                  </span>
                )}
                <span className="hidden sm:flex items-center gap-1">
                  <CommandIcon className="size-3" aria-hidden="true" />
                  <span>K</span>
                  <span className="ml-0.5 text-muted-foreground/50">to open</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ============================================================================
// Trigger Button (optional, for visible button)
// ============================================================================

interface SpotlightTriggerProps {
  className?: string
  /** Whether to hide the "Search prompts..." text and kbd hint (default: false) */
  hideText?: boolean
}

export function SpotlightTrigger({ className, hideText = false }: SpotlightTriggerProps) {
  const handleClick = React.useCallback(() => {
    // Dispatch custom event to open spotlight
    const event = new CustomEvent("jfp:open-spotlight")
    window.dispatchEvent(event)
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
      <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
      {!hideText && (
        <>
          <span className="hidden sm:inline">Search prompts...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-xs bg-background rounded font-mono border border-border/50" aria-hidden="true">
            <CommandIcon className="size-3" />K
          </kbd>
        </>
      )}
    </button>
  )
}