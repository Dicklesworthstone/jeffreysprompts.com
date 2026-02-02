import { Metadata } from "next";
import { Gift } from "lucide-react";
import { ReferralCard } from "@/components/referral/referral-card";
import { ReferralStats } from "@/components/referral/referral-stats";

export const metadata: Metadata = {
  title: "Referrals - JeffreysPrompts",
  description: "Invite friends to JeffreysPrompts and earn rewards! Get 1 month free Premium for each friend who subscribes.",
};

export default function ReferralsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Gift className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
              Referral Program
            </h1>
          </div>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Share JeffreysPrompts with your friends and colleagues. When they subscribe,
            you both get rewarded! Earn up to 12 months of free Premium per year.
          </p>
        </div>
      </div>

      <div className="container-wide py-10">
        {/* How It Works Section */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-6">How It Works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold mb-4">
                1
              </div>
              <h3 className="font-medium mb-2">Share Your Link</h3>
              <p className="text-sm text-muted-foreground">
                Copy your unique referral link and share it with friends via email, social media, or text.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold mb-4">
                2
              </div>
              <h3 className="font-medium mb-2">Friends Sign Up</h3>
              <p className="text-sm text-muted-foreground">
                When someone uses your link, they get a 30-day trial or 20% off their first month.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold mb-4">
                3
              </div>
              <h3 className="font-medium mb-2">You Get Rewarded</h3>
              <p className="text-sm text-muted-foreground">
                Once they subscribe, you get 1 month of free Premium. Earn up to 12 months per year!
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Referral Card */}
          <ReferralCard />

          {/* Stats Card */}
          <ReferralStats />
        </div>

        {/* Terms */}
        <div className="mt-10 rounded-xl border bg-card p-6">
          <h3 className="font-medium mb-4">Referral Program Terms</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              Referral rewards are credited after the referred user maintains a paid subscription for at least 1 month.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              You can earn up to 12 months of free Premium per calendar year through referrals.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              Self-referrals are not allowed. The referrer and referee must be different users.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              Rewards cannot be exchanged for cash or transferred to other accounts.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-500">•</span>
              JeffreysPrompts reserves the right to modify or terminate the referral program at any time.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
