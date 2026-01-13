"use client";

/**
 * Public Share Page
 *
 * Shows shared content (prompt, pack, skill) with public access.
 * Features:
 * - Password protection support
 * - View tracking
 * - Save to library CTA (requires login)
 * - Fork/clone option
 * - Sign up CTA for non-authenticated users
 */

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Lock,
  User,
  Calendar,
  Eye,
  BookmarkPlus,
  GitFork,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

// Mock shared content data
interface SharedPrompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  author: {
    displayName: string;
    username: string;
    showAuthor: boolean;
  };
  createdAt: string;
  viewCount: number;
}

interface ShareData {
  linkCode: string;
  contentType: "prompt" | "pack" | "skill";
  requiresPassword: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  content: SharedPrompt | null;
}

// Mock data for demonstration
const mockShareData: Record<string, ShareData> = {
  "x7KmN2pQ4rYz": {
    linkCode: "x7KmN2pQ4rYz",
    contentType: "prompt",
    requiresPassword: false,
    isExpired: false,
    expiresAt: null,
    content: {
      id: "shared-1",
      title: "Ultimate Code Review Assistant",
      description:
        "Comprehensive code review prompt that catches bugs, suggests improvements, and ensures best practices. Perfect for thorough PR reviews.",
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

For each issue found, provide:
- Line number/location
- Severity (critical/warning/suggestion)
- Clear explanation of the problem
- Specific code fix recommendation`,
      category: "automation",
      tags: ["code-review", "best-practices", "debugging", "security"],
      author: {
        displayName: "Code Wizard",
        username: "codewizard",
        showAuthor: true,
      },
      createdAt: "2026-01-10T12:00:00Z",
      viewCount: 342,
    },
  },
  "protected123": {
    linkCode: "protected123",
    contentType: "prompt",
    requiresPassword: true,
    isExpired: false,
    expiresAt: "2026-02-01T00:00:00Z",
    content: null, // Requires password
  },
  "expired456": {
    linkCode: "expired456",
    contentType: "prompt",
    requiresPassword: false,
    isExpired: true,
    expiresAt: "2026-01-01T00:00:00Z",
    content: null,
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const linkCode = params.linkCode as string;

  // Load share data
  useEffect(() => {
    const loadShareData = async () => {
      setIsLoading(true);
      // Mock API call - will be replaced with real API
      await new Promise((resolve) => setTimeout(resolve, 300));

      const data = mockShareData[linkCode];
      setShareData(data || null);
      setIsLoading(false);

      if (data && !data.requiresPassword && !data.isExpired) {
        trackEvent("share_view", { linkCode });
      }
    };

    loadShareData();
  }, [linkCode]);

  const handleCopy = useCallback(async () => {
    if (!shareData?.content) return;

    try {
      await navigator.clipboard.writeText(shareData.content.content);
      setCopied(true);
      if ("vibrate" in navigator) navigator.vibrate(50);
      success("Copied to clipboard", shareData.content.title, 3000);
      trackEvent("share_copy", { linkCode });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError("Failed to copy", "Please try again");
    }
  }, [shareData, linkCode, success, toastError]);

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) {
        setPasswordError("Please enter a password");
        return;
      }

      setIsVerifying(true);
      setPasswordError("");

      // Mock password verification - will be replaced with real API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // For demo, password "secret" works
      if (password === "secret") {
        setShareData((prev) =>
          prev
            ? {
                ...prev,
                requiresPassword: false,
                content: mockShareData["x7KmN2pQ4rYz"]?.content || null,
              }
            : null
        );
        trackEvent("share_view", { linkCode, passwordProtected: true });
      } else {
        setPasswordError("Incorrect password");
      }

      setIsVerifying(false);
    },
    [password, linkCode]
  );

  const handleSaveToLibrary = useCallback(() => {
    // This would trigger authentication if not logged in
    success(
      "Saved to library",
      "This prompt has been added to your library",
      3000
    );
    trackEvent("share_save", { linkCode });
  }, [linkCode, success]);

  const handleFork = useCallback(() => {
    // This would trigger authentication if not logged in
    success(
      "Forked to your library",
      "You can now edit this prompt",
      3000
    );
    trackEvent("share_fork", { linkCode });
  }, [linkCode, success]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-2/3 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-64 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <AlertCircle className="h-8 w-8 text-neutral-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Share Link Not Found
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            This link doesn&apos;t exist or has been removed.
          </p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Expired
  if (shareData.isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Share Link Expired
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            This share link expired on{" "}
            {shareData.expiresAt && formatDate(shareData.expiresAt)}.
          </p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Password required
  if (shareData.requiresPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <Lock className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Password Protected
              </h1>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Enter the password to view this content.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={passwordError}
                    icon={<Lock className="h-4 w-4" />}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isVerifying}
                  >
                    {isVerifying ? "Verifying..." : "View Content"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-neutral-500">
              Don&apos;t have the password?{" "}
              <Link href="/" className="text-primary hover:underline">
                Explore other prompts
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Content view
  const content = shareData.content;
  if (!content) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              JeffreysPrompts.com
            </Link>
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              {content.viewCount} views
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title Section */}
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Shared Prompt
            </div>

            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
              {content.description}
            </p>

            {/* Author & Meta */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              {content.author.showAuthor && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <User className="h-4 w-4 text-neutral-500" />
                  </div>
                  <span>{content.author.displayName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(content.createdAt)}
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {content.category}
              </Badge>
              {content.tags.map((tag) => (
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className={cn(
                    copied &&
                      "border-emerald-500 text-emerald-600 dark:text-emerald-400"
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
              <div className="p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {content.content}
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
            <Button variant="outline" size="lg" onClick={handleSaveToLibrary}>
              <BookmarkPlus className="mr-2 h-5 w-5" />
              Save to Library
            </Button>
            <Button variant="outline" size="lg" onClick={handleFork}>
              <GitFork className="mr-2 h-5 w-5" />
              Fork
            </Button>
          </div>

          {/* CTA for non-authenticated users */}
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 border-violet-200 dark:border-violet-800">
            <CardContent className="py-6">
              <div className="flex flex-col items-center text-center sm:flex-row sm:text-left gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Discover More Prompts
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Explore thousands of curated prompts for coding, writing,
                    and more.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/")}
                  className="shrink-0 bg-violet-600 hover:bg-violet-700"
                >
                  Browse All Prompts
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
