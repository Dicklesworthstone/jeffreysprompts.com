import { NextRequest, NextResponse } from "next/server";
import {
  applyReferralCode,
  getReferralCodeByCode,
  getReferralByReferee,
  REFERRAL_CONSTANTS,
} from "@/lib/referral/referral-store";
import { getOrCreateUserId } from "@/lib/user-id";

/**
 * GET /api/referral/apply?code=XXXX
 *
 * Validate a referral code before applying it.
 *
 * Query params:
 * - code: Referral code to validate
 *
 * Response:
 * {
 *   valid: boolean;
 *   rewards: { ... };
 * }
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json(
      { success: false, error: "Referral code is required." },
      { status: 400 }
    );
  }

  const { userId, cookie } = getOrCreateUserId(request);
  const referralCode = getReferralCodeByCode(code);
  const existingReferral = getReferralByReferee(userId);

  let data:
    | {
        valid: false;
        message: string;
      }
    | {
        valid: true;
        rewards: {
          extendedTrialDays: number;
          discountPercent: number;
          message: string;
        };
      };

  if (!referralCode) {
    data = {
      valid: false,
      message: "Invalid referral code.",
    };
  } else if (referralCode.userId === userId) {
    data = {
      valid: false,
      message: "You cannot use your own referral code.",
    };
  } else if (existingReferral) {
    data = {
      valid: false,
      message: "You have already used a referral code.",
    };
  } else {
    data = {
      valid: true,
      rewards: {
        extendedTrialDays: REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS,
        discountPercent: REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT,
        message: `You'll get a ${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off your first month!`,
      },
    };
  }

  const response = NextResponse.json({
    success: true,
    data,
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

/**
 * POST /api/referral/apply
 *
 * Apply a referral code when signing up.
 *
 * Body:
 * {
 *   code: string;
 * }
 *
 * Uses the signed anonymous user cookie to identify the referee.
 *
 * Response:
 * {
 *   applied: boolean;
 *   rewards: { ... };
 * }
 */
export async function POST(request: NextRequest) {
  let payload: { code?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const code = payload.code?.trim();
  const { userId: refereeId, cookie } = getOrCreateUserId(request);

  if (!code) {
    return NextResponse.json(
      { success: false, error: "Referral code is required." },
      { status: 400 }
    );
  }

  // Check if user already has a referral
  const existingReferral = getReferralByReferee(refereeId);
  if (existingReferral) {
    return NextResponse.json(
      { success: false, error: "You have already used a referral code." },
      { status: 400 }
    );
  }

  const result = applyReferralCode({ code, refereeId });

  if ("error" in result) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    success: true,
    data: {
      applied: true,
      referralId: result.id,
      rewards: {
        extendedTrialDays: REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS,
        discountPercent: REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT,
        message: `Referral code applied! You'll get a ${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off your first month.`,
      },
      status: result.status,
      createdAt: result.createdAt,
    },
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
