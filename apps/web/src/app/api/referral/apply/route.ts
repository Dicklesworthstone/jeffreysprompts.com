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
  type ValidationData =
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

  const createValidationResponse = (data: ValidationData): NextResponse => {
    const response = NextResponse.json({
      success: true,
      data,
    });

    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  };

  const referralCode = getReferralCodeByCode(code);
  if (!referralCode) {
    return createValidationResponse({
      valid: false,
      message: "Invalid referral code.",
    });
  }

  if (referralCode.userId === userId) {
    return createValidationResponse({
      valid: false,
      message: "You cannot use your own referral code.",
    });
  }

  if (getReferralByReferee(userId)) {
    return createValidationResponse({
      valid: false,
      message: "You have already used a referral code.",
    });
  }

  return createValidationResponse({
    valid: true,
    rewards: {
      extendedTrialDays: REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS,
      discountPercent: REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT,
      message: `You'll get a ${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off your first month!`,
    },
  });
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

  const code = typeof payload.code === "string" ? payload.code.trim() : undefined;
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
