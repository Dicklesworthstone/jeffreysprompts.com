import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateReferralCode,
  getReferralUrl,
  REFERRAL_CONSTANTS,
} from "@/lib/referral/referral-store";

function getUserId(request: NextRequest): string | null {
  const headerId = request.headers.get("x-user-id")?.trim();
  if (headerId) return headerId;
  const queryId = request.nextUrl.searchParams.get("userId")?.trim();
  return queryId || null;
}

/**
 * GET /api/referral/code
 *
 * Get the current user's referral code. Creates one if it doesn't exist.
 *
 * Query params:
 * - userId: User ID (or via x-user-id header)
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
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "User ID is required." },
      { status: 400 }
    );
  }

  const referralCode = getOrCreateReferralCode(userId);

  return NextResponse.json(
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
}

/**
 * POST /api/referral/code
 *
 * Generate a new referral code for a user (or return existing one).
 *
 * Body:
 * {
 *   userId: string;
 * }
 */
export async function POST(request: NextRequest) {
  let payload: { userId?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const userId = payload.userId?.trim() || getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "User ID is required." },
      { status: 400 }
    );
  }

  const referralCode = getOrCreateReferralCode(userId);

  return NextResponse.json({
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
}
