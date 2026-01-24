"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, Clock, CheckCircle, Trophy, Gift } from "lucide-react";

interface ReferralStatsProps {
  userId: string;
  className?: string;
}

interface StatsData {
  stats: {
    totalReferrals: number;
    pendingReferrals: number;
    convertedReferrals: number;
    rewardedReferrals: number;
    totalRewardsEarned: number;
    rewardsRemaining: number;
  };
  rewards: {
    perReferral: string;
    maxPerYear: string;
    earnedThisYear: string;
    remainingThisYear: string;
  };
  referrals?: Array<{
    id: string;
    refereeId: string;
    status: string;
    reward: string | null;
    convertedAt: string | null;
    rewardedAt: string | null;
    createdAt: string;
  }>;
}

export function ReferralStats({ userId, className }: ReferralStatsProps) {
  const [data, setData] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(
          `/api/referral/stats?userId=${encodeURIComponent(userId)}&includeReferrals=true`
        );
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch referral stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 w-40 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const statItems = [
    {
      label: "Total Referrals",
      value: data.stats.totalReferrals,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Pending",
      value: data.stats.pendingReferrals,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Converted",
      value: data.stats.convertedReferrals,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Rewarded",
      value: data.stats.rewardedReferrals,
      icon: Trophy,
      color: "text-violet-500",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-violet-500" />
          Your Referral Stats
        </CardTitle>
        <CardDescription>
          Track your referrals and rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className={cn("rounded-lg p-4", item.bgColor)}
            >
              <div className="flex items-center gap-2">
                <item.icon className={cn("size-5", item.color)} />
                <span className="text-2xl font-bold">{item.value}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Rewards Summary */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="size-5 text-violet-500" />
            <span className="font-medium">Rewards Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Earned This Year</p>
              <p className="font-medium">{data.rewards.earnedThisYear}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className="font-medium">{data.rewards.remainingThisYear}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Per Referral</p>
              <p className="font-medium">{data.rewards.perReferral}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Max Per Year</p>
              <p className="font-medium">{data.rewards.maxPerYear}</p>
            </div>
          </div>
        </div>

        {/* Recent Referrals */}
        {data.referrals && data.referrals.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Recent Referrals</h4>
            <div className="space-y-2">
              {data.referrals.slice(0, 5).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "size-2 rounded-full",
                        referral.status === "pending" && "bg-amber-500",
                        referral.status === "converted" && "bg-emerald-500",
                        referral.status === "rewarded" && "bg-violet-500"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        Referral #{referral.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      referral.status === "pending" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                      referral.status === "converted" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                      referral.status === "rewarded" && "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    )}
                  >
                    {referral.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
