"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Copy, Check, Gift, Share2, Users } from "lucide-react";
import { ReferralShareModal } from "./referral-share-modal";

interface ReferralCardProps {
  userId: string;
  className?: string;
}

interface ReferralCodeData {
  code: string;
  url: string;
  rewards: {
    referrer: string;
    referee: string;
    maxPerYear: string;
  };
}

export function ReferralCard({ userId, className }: ReferralCardProps) {
  const [referralData, setReferralData] = React.useState<ReferralCodeData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);

  React.useEffect(() => {
    async function fetchCode() {
      try {
        const response = await fetch(`/api/referral/code?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();
        if (data.success) {
          setReferralData(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch referral code:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCode();
  }, [userId]);

  const handleCopy = async () => {
    if (!referralData) return;
    try {
      await navigator.clipboard.writeText(referralData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-10 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!referralData) {
    return null;
  }

  return (
    <>
      <Card className={cn("", className)} hover="lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-5 text-violet-500" />
            Invite Friends, Get Rewards
          </CardTitle>
          <CardDescription>
            Share your referral link and both you and your friend get rewards when they subscribe!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={referralData.url}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy link"}
            >
              {copied ? (
                <Check className="size-4 text-emerald-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                <Users className="size-4" />
                Your Reward
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {referralData.rewards.referrer}
              </p>
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-300">
                <Gift className="size-4" />
                Friend Gets
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {referralData.rewards.referee}
              </p>
            </div>
          </div>

          <Button
            className="w-full"
            variant="glow"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="size-4" />
            Share Your Link
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Earn up to {referralData.rewards.maxPerYear} per year
          </p>
        </CardContent>
      </Card>

      <ReferralShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        referralCode={referralData.code}
        referralUrl={referralData.url}
      />
    </>
  );
}
