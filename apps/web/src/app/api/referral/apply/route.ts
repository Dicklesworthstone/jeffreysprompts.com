import { NextRequest, NextResponse } from "next/server";
import {
  applyReferralCode,
  getReferralCodeByCode,
  getReferralByReferee,
  REFERRAL_CONSTANTS,
} from "@/lib/referral/referral-store";

function getUserId(request: NextRequest): string | null {
  const headerId = request.headers.get("x-user-id")?.trim();
  if (headerId) return headerId;
  const queryId = request.nextUrl.searchParams.get("userId")?.trim();
  return queryId || null;
}

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

  const referralCode = getReferralCodeByCode(code);
  if (!referralCode) {
    return NextResponse.json({
      success: true,
      data: {
        valid: false,
        message: "Invalid referral code.",
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      valid: true,
      rewards: {
        extendedTrialDays: REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS,
        discountPercent: REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT,
        message: `You'll get a ${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off your first month!`,
      },
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
 *   refereeId: string; // New user's ID
 * }
 *
 * Response:
 * {
 *   applied: boolean;
 *   rewards: { ... };
 * }
 */
export async function POST(request: NextRequest) {
  let payload: { code?: string; refereeId?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const code = payload.code?.trim();
  const refereeId = payload.refereeId?.trim() || getUserId(request);

  if (!code) {
    return NextResponse.json(
      { success: false, error: "Referral code is required." },
      { status: 400 }
    );
  }

  if (!refereeId) {
    return NextResponse.json(
      { success: false, error: "User ID is required." },
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

  return NextResponse.json({
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
}
