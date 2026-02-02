import { NextRequest, NextResponse } from "next/server";
import {
  getReferralStats,
  getReferralsByReferrer,
  getReferralCodeByUserId,
  getReferralUrl,
  REFERRAL_CONSTANTS,
} from "@/lib/referral/referral-store";
import { getOrCreateUserId } from "@/lib/user-id";

/**
 * GET /api/referral/stats
 *
 * Get referral statistics for the current user.
 *
 * Query params:
 * - includeReferrals: Whether to include detailed referral list (default: false)
 *
 * Uses the signed anonymous user cookie to identify the requester.
 *
 * Response:
 * {
 *   stats: ReferralStats;
 *   code?: { code: string; url: string };
 *   referrals?: Referral[];
 * }
 */
export async function GET(request: NextRequest) {
  const { userId, cookie } = getOrCreateUserId(request);

  const includeReferrals = request.nextUrl.searchParams.get("includeReferrals") === "true";

  const stats = getReferralStats(userId);
  const code = getReferralCodeByUserId(userId);

  const response: {
    success: boolean;
    data: {
      stats: typeof stats & { rewardsRemaining: number };
      code: { code: string; url: string } | null;
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
    };
  } = {
    success: true,
    data: {
      stats: {
        ...stats,
        rewardsRemaining: Math.max(
          0,
          REFERRAL_CONSTANTS.MAX_REWARD_MONTHS_PER_YEAR - stats.totalRewardsEarned
        ),
      },
      code: code
        ? {
            code: code.code,
            url: getReferralUrl(code.code),
          }
        : null,
      rewards: {
        perReferral: `${REFERRAL_CONSTANTS.REFERRER_REWARD_MONTHS} month free Premium`,
        maxPerYear: `${REFERRAL_CONSTANTS.MAX_REWARD_MONTHS_PER_YEAR} months free`,
        earnedThisYear: `${stats.totalRewardsEarned} months`,
        remainingThisYear: `${Math.max(
          0,
          REFERRAL_CONSTANTS.MAX_REWARD_MONTHS_PER_YEAR - stats.totalRewardsEarned
        )} months`,
      },
    },
  };

  if (includeReferrals) {
    const referrals = getReferralsByReferrer(userId);
    response.data.referrals = referrals.map((r) => ({
      id: r.id,
      refereeId: r.refereeId,
      status: r.status,
      reward: r.referrerReward,
      convertedAt: r.convertedAt,
      rewardedAt: r.rewardedAt,
      createdAt: r.createdAt,
    }));
  }

  const res = NextResponse.json(response, {
    headers: {
      // User-specific data - prevent CDN caching
      "Cache-Control": "private, max-age=60",
    },
  });

  if (cookie) {
    res.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return res;
}
