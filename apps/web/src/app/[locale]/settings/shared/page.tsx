"use client";

/**
 * My Shared Links Page
 *
 * Allows users to view and manage their active share links.
 * Features:
 * - List all share links created by the user
 * - View counts and expiration status
 * - Revoke links directly
 * - Copy links to clipboard
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import ShareManagement, { type ManagedShareLink } from "@/components/sharing/ShareManagement";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { getBundle } from "@jeffreysprompts/core/prompts/bundles";
import { getWorkflow } from "@jeffreysprompts/core/prompts/workflows";

function resolveContentTitle(contentType: string, contentId: string): string {
  switch (contentType) {
    case "prompt": {
      const prompt = getPrompt(contentId);
      return prompt?.title ?? contentId;
    }
    case "bundle": {
      const bundle = getBundle(contentId);
      return bundle?.title ?? contentId;
    }
    case "workflow": {
      const workflow = getWorkflow(contentId);
      return workflow?.title ?? contentId;
    }
    default:
      return contentId;
  }
}

interface ApiShareLink {
  code: string;
  contentType: "prompt" | "bundle" | "workflow" | "collection";
  contentId: string;
  viewCount: number;
  expiresAt: string | null;
  isExpired: boolean;
  isActive: boolean;
  createdAt: string;
  url: string;
}

export default function SharedLinksPage() {
  const { success, error } = useToast();
  const [shareLinks, setShareLinks] = useState<ManagedShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchShareLinks = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/share/mine?includeInactive=true"
      );

      if (!response.ok) {
        if (response.status === 400) {
          setShareLinks([]);
          return;
        }
        throw new Error("Failed to fetch share links");
      }

      const data = await response.json();
      // Map API content types to shareable content types
      const mapContentType = (apiType: string): ManagedShareLink["contentType"] => {
        if (apiType === "bundle") return "pack";
        if (apiType === "workflow") return "collection"; // workflows mapped to collection for UI purposes
        if (apiType === "prompt" || apiType === "pack" || apiType === "skill" || apiType === "collection") {
          return apiType;
        }
        return "prompt"; // fallback
      };

      const links: ManagedShareLink[] = (data.links as ApiShareLink[]).map(
        (link) => ({
          linkCode: link.code,
          url: link.url,
          password: null,
          expiresAt: link.expiresAt,
          viewCount: link.viewCount,
          createdAt: link.createdAt,
          contentType: mapContentType(link.contentType),
          contentTitle: resolveContentTitle(link.contentType, link.contentId),
          contentId: link.contentId,
        })
      );

      setShareLinks(links);
    } catch {
      error("Failed to load share links", "Please try again later");
    }
  }, [error]);

  useEffect(() => {
    const loadLinks = async () => {
      setIsLoading(true);
      await fetchShareLinks();
      setIsLoading(false);
    };
    loadLinks();
  }, [fetchShareLinks]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchShareLinks();
    setIsRefreshing(false);
    success("Share links refreshed");
  }, [fetchShareLinks, success]);

  const handleRevoke = useCallback(async (linkCode: string) => {
    const response = await fetch(`/api/share/${linkCode}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        typeof errorData.error === "string" ? errorData.error : "Failed to revoke link";
      throw new Error(message);
    }

    setShareLinks((prev) => prev.filter((link) => link.linkCode !== linkCode));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-10">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Link2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
            My Shared Links
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Manage share links you&apos;ve created for prompts, packs, and
            skills. Revoke links anytime to stop sharing.
          </p>
        </div>
      </div>

      <div className="container-wide py-10 space-y-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {shareLinks.length === 0
              ? "No share links yet"
              : `${shareLinks.length} share link${shareLinks.length === 1 ? "" : "s"}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Share links list */}
        <ShareManagement
          shareLinks={shareLinks}
          onRevoke={handleRevoke}
          isLoading={isLoading}
        />

        {/* Empty state with CTA */}
        {!isLoading && shareLinks.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <Link2 className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                No shared links yet
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Share a prompt to create your first link. Anyone with the link
                can view the content, and you can revoke access anytime.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/">Browse Prompts</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Share Links</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Share links allow you to share prompts, packs, and skills with
              others without making them public in the Swap Meet.
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-1">
              <li>
                <strong>Password protection:</strong> Optionally require a
                password to view shared content
              </li>
              <li>
                <strong>Expiration:</strong> Set links to automatically expire
                after a certain period
              </li>
              <li>
                <strong>View tracking:</strong> See how many times your shared
                content has been viewed
              </li>
              <li>
                <strong>Revoke anytime:</strong> Instantly disable a link to
                stop sharing
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
