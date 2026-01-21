"use client";

/**
 * Community Prompt Detail Page
 *
 * Shows full prompt details with author info, ratings, and related prompts.
 */

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft,
  Copy,
  Check,
  Star,
  Eye,
  BookmarkPlus,
  Share2,
  Flag,
  User,
  Calendar,
  Tag,
  ThumbsUp,
  ThumbsDown,
  GitFork,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { trackHistoryView } from "@/lib/history/client";
import { copyToClipboard } from "@/lib/clipboard";
import { CommunityPromptCard } from "@/components/swap-meet/CommunityPromptCard";
import type { CommunityPrompt } from "@/lib/swap-meet/types";

// Mock data - will be replaced with API fetch
const mockPrompts: Record<string, CommunityPrompt> = {
  "comm-1": {
    id: "comm-1",
    title: "Ultimate Code Review Assistant",
    description: "Comprehensive code review prompt that catches bugs, suggests improvements, and ensures best practices. Perfect for thorough PR reviews.",
    content: `Review this code thoroughly and provide comprehensive feedback.

## Analysis Framework

1. **Bug Detection**
   - Check for potential null/undefined errors
   - Look for off-by-one errors
   - Identify race conditions
   - Find memory leaks

2. **Security Review**
   - SQL injection vulnerabilities
   - XSS attack vectors
   - Authentication/authorization issues
   - Sensitive data exposure

3. **Performance Analysis**
   - Identify N+1 queries
   - Check for unnecessary re-renders
   - Look for memory-intensive operations
   - Suggest caching opportunities

4. **Code Quality**
   - Naming conventions
   - Function complexity
   - DRY principle violations
   - SOLID principle adherence

5. **Best Practices**
   - Error handling patterns
   - Logging practices
   - Testing coverage
   - Documentation quality

For each issue found, provide:
- Line number/location
- Severity (critical/warning/suggestion)
- Clear explanation of the problem
- Specific code fix recommendation`,
    category: "automation",
    tags: ["code-review", "best-practices", "debugging", "security", "performance"],
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
  "comm-2": {
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
  "comm-3": {
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
};

// Related prompts (mock)
const relatedPrompts: CommunityPrompt[] = [
  mockPrompts["comm-2"]!,
  mockPrompts["comm-3"]!,
];

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CommunityPromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [copied, setCopied] = useState(false);
  const [userRating, setUserRating] = useState<"up" | "down" | null>(null);

  const promptId = params.id as string;
  const prompt = mockPrompts[promptId];

  useEffect(() => {
    if (!prompt) return;
    trackHistoryView({ resourceType: "prompt", resourceId: prompt.id, source: "swap_meet" });
  }, [prompt]);

  const handleCopy = useCallback(async () => {
    if (!prompt) return;
    const result = await copyToClipboard(prompt.content);
    if (result.success) {
      setCopied(true);
      if ("vibrate" in navigator) navigator.vibrate(50);
      success("Copied to clipboard", prompt.title, { duration: 3000 });
      trackEvent("prompt_copy", { id: prompt.id, source: "swap-meet-detail" });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toastError("Failed to copy", "Please try again");
    }
  }, [prompt, success, toastError]);

  const handleRate = useCallback((rating: "up" | "down") => {
    setUserRating((prev) => (prev === rating ? null : rating));
    success(
      rating === "up" ? "Thanks for the feedback!" : "Thanks for the feedback",
      "Your rating helps improve recommendations",
      { duration: 3000 }
    );
  }, [success]);

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Prompt not found
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            The prompt you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button className="mt-6" onClick={() => router.push("/swap-meet")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Swap Meet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/swap-meet"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Swap Meet
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title Section */}
          <div className="mb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                {prompt.featured && (
                  <Badge className="mb-3 gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    <Star className="h-3 w-3" fill="currentColor" />
                    Featured
                  </Badge>
                )}
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
                  {prompt.title}
                </h1>
                <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
                  {prompt.description}
                </p>
              </div>
            </div>

            {/* Author & Meta */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                  {prompt.author.avatarUrl ? (
                    <Image
                      src={prompt.author.avatarUrl}
                      alt={prompt.author.displayName}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5 text-neutral-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {prompt.author.displayName}
                  </p>
                  <p className="text-xs">
                    @{prompt.author.username} · {prompt.author.reputation} rep
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(prompt.createdAt)}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500" fill="currentColor" />
                <span className="font-medium text-neutral-900 dark:text-white">
                  {prompt.stats.rating.toFixed(1)}
                </span>
                <span>({formatNumber(prompt.stats.ratingCount)} ratings)</span>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-neutral-500" />
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatNumber(prompt.stats.views)}
                </span>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">views</span>
              </div>
              <div className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-neutral-500" />
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatNumber(prompt.stats.copies)}
                </span>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">copies</span>
              </div>
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-neutral-500" />
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatNumber(prompt.stats.saves)}
                </span>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">saves</span>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4 text-neutral-400" />
              <Badge variant="outline" className="capitalize">
                {prompt.category}
              </Badge>
              {prompt.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Prompt Content */}
          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Prompt Content
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className={cn(
                      copied && "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {prompt.content}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Prompt
                </>
              )}
            </Button>
            <Button variant="outline" size="lg">
              <BookmarkPlus className="mr-2 h-5 w-5" />
              Save to Library
            </Button>
            <Button variant="outline" size="lg">
              <GitFork className="mr-2 h-5 w-5" />
              Fork & Edit
            </Button>
            <Button variant="outline" size="lg">
              <Share2 className="mr-2 h-5 w-5" />
              Share
            </Button>
          </div>

          {/* Rating Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
                Was this prompt helpful?
              </h3>
              <div className="flex items-center gap-4">
                <Button
                  variant={userRating === "up" ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleRate("up")}
                  className={cn(
                    userRating === "up" && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  <ThumbsUp className="mr-2 h-5 w-5" />
                  Yes, helpful
                </Button>
                <Button
                  variant={userRating === "down" ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleRate("down")}
                  className={cn(
                    userRating === "down" && "bg-red-600 hover:bg-red-700"
                  )}
                >
                  <ThumbsDown className="mr-2 h-5 w-5" />
                  Not helpful
                </Button>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" className="text-neutral-500">
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Prompts */}
          {relatedPrompts.length > 0 && (
            <section>
              <h2 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-white">
                Related Prompts
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {relatedPrompts.map((relatedPrompt, index) => (
                  <CommunityPromptCard
                    key={relatedPrompt.id}
                    prompt={relatedPrompt}
                    index={index}
                    onClick={(p) => router.push(`/swap-meet/${p.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </div>
    </div>
  );
}
