"use client";

/**
 * ShareManagement - Section for managing all active share links
 *
 * Features:
 * - List all active share links
 * - View count per link
 * - Quick copy link
 * - Edit settings
 * - Revoke links
 */

import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  Link2,
  Lock,
  Unlock,
  Clock,
  Eye,
  Trash2,
  ExternalLink,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import type { ShareLink, ShareableContentType } from "./ShareDialog";

export interface ManagedShareLink extends ShareLink {
  contentType: ShareableContentType;
  contentTitle: string;
  contentId: string;
}

interface ShareManagementProps {
  /** Active share links to display */
  shareLinks: ManagedShareLink[];
  /** Callback when a link is revoked */
  onRevoke?: (linkCode: string) => void;
  /** Callback when a link is updated */
  onUpdate?: (linkCode: string, updates: Partial<ShareLink>) => void;
  /** Show loading state */
  isLoading?: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Expires today";
  if (diffDays === 1) return "Expires tomorrow";
  if (diffDays < 7) return `Expires in ${diffDays} days`;

  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `Expires in ${weeks} ${weeks === 1 ? "week" : "weeks"}`;

  return `Expires ${formatDate(dateString)}`;
}

function ShareLinkRow({
  link,
  onCopy,
  onRevoke,
  copiedCode,
}: {
  link: ManagedShareLink;
  onCopy: (url: string, code: string) => void;
  onRevoke: (code: string) => void;
  copiedCode: string | null;
}) {
  const isCopied = copiedCode === link.linkCode;
  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-colors",
        isExpired
          ? "border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900/50"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      )}
    >
      {/* Content type icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
        <Link2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      </div>

      {/* Content info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-900 dark:text-white truncate">
            {link.contentTitle}
          </p>
          <Badge variant="outline" className="shrink-0 capitalize text-xs">
            {link.contentType}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {link.viewCount} views
          </span>
          {link.password && (
            <span className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              Protected
            </span>
          )}
          {link.expiresAt ? (
            <span
              className={cn(
                "flex items-center gap-1",
                isExpired && "text-red-500"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeDate(link.expiresAt)}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Unlock className="h-3.5 w-3.5" />
              Never expires
            </span>
          )}
          <span className="text-neutral-400">
            Created {formatDate(link.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onCopy(link.url, link.linkCode)}
          className={cn(isCopied && "text-emerald-600 dark:text-emerald-400")}
          title="Copy link"
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => window.open(link.url, "_blank")}
          title="Open link"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRevoke(link.linkCode)}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Revoke link"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ShareManagement({
  shareLinks,
  onRevoke,
  isLoading = false,
}: ShareManagementProps) {
  const { success, error: toastError } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const handleCopy = useCallback(
    async (url: string, code: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedCode(code);
        if ("vibrate" in navigator) navigator.vibrate(50);
        success("Link copied", "Share link copied to clipboard", { duration: 3000 });
        trackEvent("share_link_copy", { source: "management" });
        setTimeout(() => setCopiedCode(null), 2000);
      } catch {
        toastError("Failed to copy", "Please try again");
      }
    },
    [success, toastError]
  );

  const handleRevoke = useCallback(
    async (linkCode: string) => {
      setIsRevoking(linkCode);
      try {
        // Mock API call - will be replaced with real API
        await new Promise((resolve) => setTimeout(resolve, 500));
        onRevoke?.(linkCode);
        success("Link revoked", "The share link is no longer active", { duration: 3000 });
        trackEvent("share_link_revoke", { source: "management" });
      } catch {
        toastError("Failed to revoke", "Please try again");
      } finally {
        setIsRevoking(null);
      }
    },
    [onRevoke, success, toastError]
  );

  // Filter out any currently revoking links
  const activeLinks = shareLinks.filter(
    (link) => link.linkCode !== isRevoking
  );
  const expiredLinks = activeLinks.filter(
    (link) => link.expiresAt && new Date(link.expiresAt) < new Date()
  );
  const validLinks = activeLinks.filter(
    (link) => !link.expiresAt || new Date(link.expiresAt) >= new Date()
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-neutral-500" />
            <h2 className="text-lg font-semibold">Share Links</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Share Links
            </h2>
          </div>
          <Badge variant="secondary">
            {validLinks.length} active
            {expiredLinks.length > 0 && ` · ${expiredLinks.length} expired`}
          </Badge>
        </div>
        <p className="text-sm text-neutral-500">
          Manage your shared content links
        </p>
      </CardHeader>
      <CardContent>
        {activeLinks.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Link2 className="h-6 w-6 text-neutral-400" />
            </div>
            <h3 className="font-medium text-neutral-900 dark:text-white">
              No share links yet
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Share a prompt, pack, or skill to create your first link.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active links */}
            {validLinks.map((link) => (
              <ShareLinkRow
                key={link.linkCode}
                link={link}
                onCopy={handleCopy}
                onRevoke={handleRevoke}
                copiedCode={copiedCode}
              />
            ))}

            {/* Expired links section */}
            {expiredLinks.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-4">
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                  <span className="text-xs text-neutral-400">
                    Expired Links
                  </span>
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                </div>
                {expiredLinks.map((link) => (
                  <ShareLinkRow
                    key={link.linkCode}
                    link={link}
                    onCopy={handleCopy}
                    onRevoke={handleRevoke}
                    copiedCode={copiedCode}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ShareManagement;
