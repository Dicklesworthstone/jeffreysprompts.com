"use client";

/**
 * Swap Meet - Community Prompts Marketplace
 *
 * Browse and discover community-contributed prompts.
 * Features: search, filtering, sorting, infinite scroll.
 */

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  Star,
  Sparkles,
  Users,
  ArrowUpDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommunityPromptCard } from "@/components/swap-meet/CommunityPromptCard";
import type { CommunityPrompt } from "@/lib/swap-meet/types";

// Mock data for community prompts (will be replaced with API calls)
const mockCommunityPrompts: CommunityPrompt[] = [
  {
    id: "comm-1",
    title: "Ultimate Code Review Assistant",
    description: "Comprehensive code review prompt that catches bugs, suggests improvements, and ensures best practices.",
    content: "Review this code thoroughly. Check for: 1) Potential bugs and edge cases, 2) Performance issues, 3) Security vulnerabilities, 4) Code style and readability, 5) Missing error handling. Provide specific line-by-line feedback with suggested fixes.",
    category: "automation",
    tags: ["code-review", "best-practices", "debugging"],
    author: {
      id: "user-1",
      username: "codewizard",
      displayName: "Code Wizard",
      avatarUrl: null,
      reputation: 1250,
    },
    stats: {
      views: 3420,
      copies: 892,
      saves: 234,
      rating: 4.8,
      ratingCount: 156,
    },
    featured: true,
    createdAt: "2026-01-10T12:00:00Z",
    updatedAt: "2026-01-11T08:30:00Z",
  },
  {
    id: "comm-2",
    title: "Creative Story Generator",
    description: "Generate engaging short stories with compelling characters and plot twists.",
    content: "Write a creative short story with the following elements: [GENRE], [SETTING], [MAIN CHARACTER]. Include: an engaging hook, rising tension, a surprising twist, and a satisfying conclusion. Use vivid imagery and dialogue.",
    category: "ideation",
    tags: ["creative-writing", "storytelling", "fiction"],
    author: {
      id: "user-2",
      username: "storysmith",
      displayName: "Story Smith",
      avatarUrl: null,
      reputation: 890,
    },
    stats: {
      views: 2150,
      copies: 567,
      saves: 189,
      rating: 4.6,
      ratingCount: 98,
    },
    featured: false,
    createdAt: "2026-01-09T15:30:00Z",
    updatedAt: "2026-01-09T15:30:00Z",
  },
  {
    id: "comm-3",
    title: "API Documentation Writer",
    description: "Generate comprehensive API documentation from code or specifications.",
    content: "Create detailed API documentation for the following endpoint/function. Include: endpoint URL, HTTP method, request parameters (with types and validation), response format, error codes, authentication requirements, rate limits, and 2-3 example requests with responses.",
    category: "documentation",
    tags: ["api", "docs", "technical-writing"],
    author: {
      id: "user-3",
      username: "docmaster",
      displayName: "Doc Master",
      avatarUrl: null,
      reputation: 1567,
    },
    stats: {
      views: 4890,
      copies: 1234,
      saves: 456,
      rating: 4.9,
      ratingCount: 234,
    },
    featured: true,
    createdAt: "2026-01-08T09:00:00Z",
    updatedAt: "2026-01-10T14:20:00Z",
  },
  {
    id: "comm-4",
    title: "Bug Hunter Pro",
    description: "Systematic bug detection prompt that finds hidden issues in your code.",
    content: "Analyze this code for bugs using a systematic approach: 1) Trace all execution paths, 2) Check boundary conditions, 3) Verify null/undefined handling, 4) Look for race conditions, 5) Check resource leaks, 6) Verify error propagation. For each bug found, explain the issue and provide a fix.",
    category: "debugging",
    tags: ["debugging", "bug-fixing", "code-analysis"],
    author: {
      id: "user-4",
      username: "bughunter",
      displayName: "Bug Hunter",
      avatarUrl: null,
      reputation: 2100,
    },
    stats: {
      views: 5670,
      copies: 1890,
      saves: 678,
      rating: 4.7,
      ratingCount: 312,
    },
    featured: false,
    createdAt: "2026-01-07T11:45:00Z",
    updatedAt: "2026-01-11T16:00:00Z",
  },
  {
    id: "comm-5",
    title: "Test Case Generator",
    description: "Generate comprehensive test cases for any function or feature.",
    content: "Generate test cases for the following code/feature. Include: 1) Happy path tests, 2) Edge cases, 3) Error scenarios, 4) Boundary conditions, 5) Integration points. For each test, provide: test name, input, expected output, and assertion logic.",
    category: "testing",
    tags: ["testing", "unit-tests", "qa"],
    author: {
      id: "user-5",
      username: "testguru",
      displayName: "Test Guru",
      avatarUrl: null,
      reputation: 1890,
    },
    stats: {
      views: 3210,
      copies: 987,
      saves: 345,
      rating: 4.5,
      ratingCount: 187,
    },
    featured: false,
    createdAt: "2026-01-06T14:20:00Z",
    updatedAt: "2026-01-06T14:20:00Z",
  },
  {
    id: "comm-6",
    title: "Refactoring Advisor",
    description: "Get expert advice on how to refactor messy code into clean, maintainable patterns.",
    content: "Analyze this code and suggest refactoring improvements. Focus on: 1) Reducing complexity, 2) Improving naming, 3) Extracting reusable functions, 4) Applying design patterns where appropriate, 5) Reducing duplication. Provide before/after examples for each suggestion.",
    category: "refactoring",
    tags: ["refactoring", "clean-code", "design-patterns"],
    author: {
      id: "user-6",
      username: "cleancode",
      displayName: "Clean Coder",
      avatarUrl: null,
      reputation: 1456,
    },
    stats: {
      views: 2890,
      copies: 756,
      saves: 267,
      rating: 4.8,
      ratingCount: 145,
    },
    featured: true,
    createdAt: "2026-01-05T10:15:00Z",
    updatedAt: "2026-01-09T11:30:00Z",
  },
];

const categories = [
  { value: "all", label: "All Categories" },
  { value: "ideation", label: "Ideation" },
  { value: "documentation", label: "Documentation" },
  { value: "automation", label: "Automation" },
  { value: "refactoring", label: "Refactoring" },
  { value: "testing", label: "Testing" },
  { value: "debugging", label: "Debugging" },
  { value: "workflow", label: "Workflow" },
  { value: "communication", label: "Communication" },
];

const sortOptions = [
  { value: "trending", label: "Trending", icon: TrendingUp },
  { value: "newest", label: "Newest", icon: Clock },
  { value: "top-rated", label: "Top Rated", icon: Star },
  { value: "most-copied", label: "Most Copied", icon: Users },
];

export default function SwapMeetPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("trending");
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort prompts
  const filteredPrompts = useMemo(() => {
    let results = [...mockCommunityPrompts];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      results = results.filter((p) => p.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case "trending":
        results.sort((a, b) => b.stats.views - a.stats.views);
        break;
      case "newest":
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "top-rated":
        results.sort((a, b) => b.stats.rating - a.stats.rating);
        break;
      case "most-copied":
        results.sort((a, b) => b.stats.copies - a.stats.copies);
        break;
    }

    return results;
  }, [searchQuery, selectedCategory, sortBy]);

  const featuredPrompts = useMemo(
    () => mockCommunityPrompts.filter((p) => p.featured),
    []
  );

  const handlePromptClick = useCallback(
    (prompt: CommunityPrompt) => {
      router.push(`/swap-meet/${prompt.id}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-100/50 via-transparent to-transparent dark:from-violet-900/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Users className="h-4 w-4" />
              Community Marketplace
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
              Swap Meet
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
              Discover, share, and trade prompts with the community. Find the perfect prompt or share your own creations.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-8 max-w-2xl"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              <Input
                type="search"
                placeholder="Search community prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 w-full rounded-xl border-neutral-200 bg-white pl-12 pr-4 text-lg shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-600 dark:text-neutral-400"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-white">2,847</span>
              Community Prompts
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-white">1,234</span>
              Contributors
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-white">45.2K</span>
              Total Copies
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Section */}
      {featuredPrompts.length > 0 && !searchQuery && selectedCategory === "all" && (
        <section className="border-b border-neutral-200 bg-neutral-50/50 py-12 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Editor&apos;s Picks
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPrompts.slice(0, 3).map((prompt, index) => (
                <CommunityPromptCard
                  key={prompt.id}
                  prompt={prompt}
                  index={index}
                  onClick={handlePromptClick}
                  featured
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filter & Sort Bar */}
      <section className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.slice(0, 5).map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  className="rounded-full"
                >
                  {cat.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="rounded-full"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700"
            >
              <div className="flex flex-wrap gap-2">
                {categories.slice(5).map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className="rounded-full"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Results Header */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Showing <span className="font-medium text-neutral-900 dark:text-white">{filteredPrompts.length}</span> prompts
              {searchQuery && (
                <span>
                  {" "}for &quot;<span className="font-medium">{searchQuery}</span>&quot;
                </span>
              )}
            </p>
          </div>

          {/* Prompt Grid */}
          {filteredPrompts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrompts.map((prompt, index) => (
                <CommunityPromptCard
                  key={prompt.id}
                  prompt={prompt}
                  index={index}
                  onClick={handlePromptClick}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <Search className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                No prompts found
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Try adjusting your search or filters to find what you&apos;re looking for.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Load More (placeholder for infinite scroll) */}
          {filteredPrompts.length > 0 && (
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg">
                Load More Prompts
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
