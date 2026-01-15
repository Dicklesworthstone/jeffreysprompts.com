"use client";

/**
 * ShareDialog - Modal for creating and managing share links
 *
 * Features:
 * - Generate shareable links for prompts, packs, and skills
 * - Optional password protection
 * - Configurable expiration
 * - Social sharing options (Twitter, LinkedIn)
 * - Copy to clipboard functionality
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
  Twitter,
  Linkedin,
  Globe,
  Share2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

// Types
export type ShareableContentType = "prompt" | "pack" | "skill" | "collection";

export interface ShareLink {
  linkCode: string;
  url: string;
  password: string | null;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
}

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ShareableContentType;
  contentId: string;
  contentTitle: string;
  /** Existing share link if one already exists */
  existingShare?: ShareLink | null;
  /** Whether the content is currently public (in Swap Meet) */
  isPublic?: boolean;
  /** Callback when a new share link is created */
  onShareCreated?: (share: ShareLink) => void;
  /** Callback when share link is revoked */
  onShareRevoked?: () => void;
  /** Callback when visibility is toggled */
  onVisibilityChange?: (isPublic: boolean) => void;
}

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never expires" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

function generateMockLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function ShareDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentTitle,
  existingShare,
  isPublic = false,
  onShareCreated,
  onShareRevoked,
  onVisibilityChange,
}: ShareDialogProps) {
  const { success, error: toastError } = useToast();
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Form state
  const [passwordEnabled, setPasswordEnabled] = useState(
    !!existingShare?.password
  );
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState<string>(
    existingShare?.expiresAt ? "custom" : "never"
  );

  // Derived state
  const shareUrl = existingShare?.url || null;
  const hasExistingShare = !!existingShare;

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if ("vibrate" in navigator) navigator.vibrate(50);
      success("Link copied", "Share link copied to clipboard", { duration: 3000 });
      trackEvent("share_link_copy", { contentType, contentId });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError("Failed to copy", "Please try again");
    }
  }, [shareUrl, contentType, contentId, success, toastError]);

  const handleCreateShare = useCallback(async () => {
    setIsCreating(true);
    try {
      // Mock API call - will be replaced with real API
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newLinkCode = generateMockLinkCode();
      const mockShare: ShareLink = {
        linkCode: newLinkCode,
        url: `https://jeffreysprompts.com/share/${newLinkCode}`,
        password: passwordEnabled ? password : null,
        expiresAt:
          expiration !== "never"
            ? new Date(
                Date.now() + parseInt(expiration) * 24 * 60 * 60 * 1000
              ).toISOString()
            : null,
        viewCount: 0,
        createdAt: new Date().toISOString(),
      };

      onShareCreated?.(mockShare);
      success("Share link created", "Your content is now shareable", { duration: 3000 });
      trackEvent("share_link_create", { contentType, contentId });
    } catch {
      toastError("Failed to create share link", "Please try again");
    } finally {
      setIsCreating(false);
    }
  }, [
    contentType,
    contentId,
    passwordEnabled,
    password,
    expiration,
    onShareCreated,
    success,
    toastError,
  ]);

  const handleRevokeShare = useCallback(async () => {
    setIsRevoking(true);
    try {
      // Mock API call - will be replaced with real API
      await new Promise((resolve) => setTimeout(resolve, 500));

      onShareRevoked?.();
      success("Share link revoked", "The link is no longer accessible", { duration: 3000 });
      trackEvent("share_link_revoke", { contentType, contentId });
    } catch {
      toastError("Failed to revoke link", "Please try again");
    } finally {
      setIsRevoking(false);
    }
  }, [contentType, contentId, onShareRevoked, success, toastError]);

  const handleSocialShare = useCallback(
    (platform: "twitter" | "linkedin") => {
      if (!shareUrl) return;

      const text = `Check out "${contentTitle}" on JeffreysPrompts`;
      let url: string;

      if (platform === "twitter") {
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      } else {
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      }

      window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
      trackEvent("share_social", { platform, contentType, contentId });
    },
    [shareUrl, contentTitle, contentType, contentId]
  );

  const handleVisibilityToggle = useCallback(
    (checked: boolean) => {
      onVisibilityChange?.(checked);
      if (checked) {
        success(
          "Published to Swap Meet",
          "Your prompt is now visible to the community",
          { duration: 3000 }
        );
        trackEvent("prompt_publish", { contentId });
      } else {
        success(
          "Made private",
          "Your prompt is no longer visible in Swap Meet",
          { duration: 3000 }
        );
        trackEvent("prompt_unpublish", { contentId });
      }
    },
    [contentId, onVisibilityChange, success]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share {contentType === "prompt" ? "Prompt" : contentType}
          </DialogTitle>
          <DialogDescription>
            Create a shareable link for &quot;{contentTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Make Public Section (for prompts only) */}
          {contentType === "prompt" && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      isPublic
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-neutral-200 dark:bg-neutral-800"
                    )}
                  >
                    {isPublic ? (
                      <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Lock className="h-5 w-5 text-neutral-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {isPublic ? "Public in Swap Meet" : "Private"}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {isPublic
                        ? "Visible to all community members"
                        : "Only you can see this prompt"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={handleVisibilityToggle}
                />
              </div>
            </div>
          )}

          {/* Share Link Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
              Share Link
            </h3>

            {hasExistingShare ? (
              <div className="space-y-4">
                {/* Link display */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={shareUrl || ""}
                      readOnly
                      icon={<Link2 className="h-4 w-4" />}
                      className="pr-4 font-mono text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className={cn(
                      "h-11 w-11 shrink-0",
                      copied && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span>{existingShare.viewCount} views</span>
                  </div>
                  {existingShare.password && (
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-4 w-4" />
                      <span>Password protected</span>
                    </div>
                  )}
                  {existingShare.expiresAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>
                        Expires{" "}
                        {new Date(existingShare.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Revoke button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeShare}
                  disabled={isRevoking}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isRevoking ? "Revoking..." : "Revoke Link"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Password toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {passwordEnabled ? (
                      <Lock className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <Unlock className="h-4 w-4 text-neutral-500" />
                    )}
                    <Label htmlFor="password-toggle" className="cursor-pointer">
                      Password protection
                    </Label>
                  </div>
                  <Switch
                    id="password-toggle"
                    checked={passwordEnabled}
                    onCheckedChange={setPasswordEnabled}
                  />
                </div>

                {passwordEnabled && (
                  <Input
                    type="password"
                    placeholder="Enter a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4" />}
                  />
                )}

                {/* Expiration */}
                <div className="space-y-2">
                  <Label>Link expiration</Label>
                  <Select value={expiration} onValueChange={setExpiration}>
                    <SelectTrigger>
                      <Clock className="mr-2 h-4 w-4 text-neutral-500" />
                      <SelectValue placeholder="Select expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Create button */}
                <Button
                  onClick={handleCreateShare}
                  disabled={isCreating || (passwordEnabled && !password)}
                  className="w-full"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {isCreating ? "Creating..." : "Create Share Link"}
                </Button>
              </div>
            )}
          </div>

          {/* Social Sharing */}
          {hasExistingShare && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                Share on Social
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare("twitter")}
                  className="flex-1"
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSocialShare("linkedin")}
                  className="flex-1"
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter separated>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
