"use client";

/**
 * Community Prompt Detail Page
 *
 * Shows full prompt details with author info, ratings, and related prompts.
 */

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
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
import { localizeHref } from "@/i18n/config";
import { CommunityPromptCard } from "@/components/swap-meet/CommunityPromptCard";
import { ClientDate } from "@/components/ClientDate";
import type { CommunityPrompt } from "@/lib/swap-meet/types";
import { getCommunityPrompt, getRelatedCommunityPrompts } from "@/lib/swap-meet/data";

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
  const locale = useLocale();
  const { success, error: toastError, info, warning } = useToast();
  const [copied, setCopied] = useState(false);
  const [userRating, setUserRating] = useState<"up" | "down" | null>(null);

  const promptId = params.id as string;
  const prompt = getCommunityPrompt(promptId);
  const relatedPrompts: CommunityPrompt[] = getRelatedCommunityPrompts(promptId);

  useEffect(() => {
    if (!prompt) return;
    trackHistoryView({
      resourceType: "community-prompt",
      resourceId: prompt.id,
      source: "swap_meet",
    });
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

  const handleSaveUnavailable = useCallback(() => {
    info(
      "Save to library not available",
      "Saving community prompts to your library is not wired up yet.",
      { duration: 3500 }
    );
  }, [info]);

  const handleForkUnavailable = useCallback(() => {
    info(
      "Fork & Edit not available",
      "Forking community prompts from Swap Meet is not wired up yet.",
      { duration: 3500 }
    );
  }, [info]);

  const handleShare = useCallback(async () => {
    const shareUrl = typeof window === "undefined" ? "" : window.location.href;
    if (!shareUrl) {
      toastError("Unable to share", "This page URL is not available yet.");
      return;
    }

    const result = await copyToClipboard(shareUrl);
    if (result.success) {
      success("Link copied", "Share link copied to clipboard", { duration: 3000 });
      trackEvent("share_copy", { id: promptId, source: "swap-meet-detail" });
      return;
    }

    toastError("Unable to share", "Please try again.");
  }, [promptId, success, toastError]);

  const handleReportUnavailable = useCallback(() => {
    warning(
      "Reporting not available",
      "Reporting community prompts from Swap Meet is not wired up yet.",
      { duration: 3500 }
    );
  }, [warning]);

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
          <Button className="mt-6" onClick={() => router.push(localizeHref(locale, "/swap-meet"))}>
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
            href={localizeHref(locale, "/swap-meet")}
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
                <ClientDate date={prompt.createdAt} format="date" fallback={formatDate(prompt.createdAt)} />
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
            <Button variant="outline" size="lg" onClick={handleSaveUnavailable}>
              <BookmarkPlus className="mr-2 h-5 w-5" />
              Save to Library
            </Button>
            <Button variant="outline" size="lg" onClick={handleForkUnavailable}>
              <GitFork className="mr-2 h-5 w-5" />
              Fork & Edit
            </Button>
            <Button variant="outline" size="lg" onClick={handleShare}>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-500"
                    onClick={handleReportUnavailable}
                  >
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
                    onClick={(p) => router.push(localizeHref(locale, `/swap-meet/${p.id}`))}
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
