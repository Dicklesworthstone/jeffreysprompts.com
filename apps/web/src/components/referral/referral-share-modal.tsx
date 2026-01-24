"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  Mail,
  MessageCircle,
  Twitter,
  Linkedin,
  QrCode,
} from "lucide-react";

interface ReferralShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
  referralUrl: string;
}

const SHARE_MESSAGE = "Check out JeffreysPrompts! Use my referral link to get a 30-day trial or 20% off your first month:";

export function ReferralShareModal({
  open,
  onOpenChange,
  referralCode,
  referralUrl,
}: ReferralShareModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [showQR, setShowQR] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = (platform: "twitter" | "linkedin" | "email" | "sms") => {
    const encodedUrl = encodeURIComponent(referralUrl);
    const encodedMessage = encodeURIComponent(SHARE_MESSAGE);

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent("Join JeffreysPrompts with my referral!")}&body=${encodedMessage}%0A%0A${encodedUrl}`,
      sms: `sms:?body=${encodedMessage}%20${encodedUrl}`,
    };

    window.open(urls[platform], "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Referral Link</DialogTitle>
          <DialogDescription>
            Share this link with friends. When they subscribe, you both get rewards!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Referral Code Display */}
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
            <p className="text-2xl font-bold font-mono tracking-wider text-primary">
              {referralCode}
            </p>
          </div>

          {/* Copy Link */}
          <div className="flex gap-2">
            <Input
              value={referralUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => handleShare("twitter")}
              className="flex items-center gap-2"
            >
              <Twitter className="size-4" />
              Twitter
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare("linkedin")}
              className="flex items-center gap-2"
            >
              <Linkedin className="size-4" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare("email")}
              className="flex items-center gap-2"
            >
              <Mail className="size-4" />
              Email
            </Button>
            <Button
              variant="outline"
              onClick={() => handleShare("sms")}
              className="flex items-center gap-2"
            >
              <MessageCircle className="size-4" />
              Text
            </Button>
          </div>

          {/* QR Code Toggle */}
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowQR(!showQR)}
            >
              <QrCode className="size-4" />
              {showQR ? "Hide QR Code" : "Show QR Code"}
            </Button>

            {showQR && (
              <div className="mt-4 flex justify-center">
                {/* QR Code placeholder - would use a QR library in production */}
                <div className="size-48 bg-white rounded-lg p-4 flex items-center justify-center border">
                  <div className="text-center text-sm text-muted-foreground">
                    <QrCode className="size-24 mx-auto mb-2 text-gray-800" />
                    <p>QR for:</p>
                    <p className="font-mono text-xs break-all">{referralCode}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
