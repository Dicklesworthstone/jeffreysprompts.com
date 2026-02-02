import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateReferralCode,
  getReferralUrl,
  REFERRAL_CONSTANTS,
} from "@/lib/referral/referral-store";
import { getOrCreateUserId } from "@/lib/user-id";

/**
 * GET /api/referral/code
 *
 * Get the current user's referral code. Creates one if it doesn't exist.
 *
 * Uses the signed anonymous user cookie to identify the requester.
 *
 * Response:
 * {
 *   code: string;
 *   url: string;
 *   rewards: { ... };
 *   createdAt: string;
 * }
 */
export async function GET(request: NextRequest) {
  const { userId, cookie } = getOrCreateUserId(request);
  const referralCode = getOrCreateReferralCode(userId);

  const response = NextResponse.json(
    {
      success: true,
      data: {
        code: referralCode.code,
        url: getReferralUrl(referralCode.code),
        rewards: {
          referrer: `${REFERRAL_CONSTANTS.REFERRER_REWARD_MONTHS} month free Premium per successful referral`,
          referee: `${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off first month`,
          maxPerYear: `${REFERRAL_CONSTANTS.MAX_REWARD_MONTHS_PER_YEAR} months free`,
        },
        createdAt: referralCode.createdAt,
      },
    },
    {
      headers: {
        // User-specific data - prevent CDN caching
        "Cache-Control": "private, max-age=300",
      },
    }
  );

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

/**
 * POST /api/referral/code
 *
 * Generate a new referral code for a user (or return existing one).
 *
 * Uses the signed anonymous user cookie to identify the requester.
 */
export async function POST(request: NextRequest) {
  const { userId, cookie } = getOrCreateUserId(request);
  const referralCode = getOrCreateReferralCode(userId);

  const response = NextResponse.json({
    success: true,
    data: {
      code: referralCode.code,
      url: getReferralUrl(referralCode.code),
      rewards: {
        referrer: `${REFERRAL_CONSTANTS.REFERRER_REWARD_MONTHS} month free Premium per successful referral`,
        referee: `${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off first month`,
        maxPerYear: `${REFERRAL_CONSTANTS.MAX_REWARD_MONTHS_PER_YEAR} months free`,
      },
      createdAt: referralCode.createdAt,
    },
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
