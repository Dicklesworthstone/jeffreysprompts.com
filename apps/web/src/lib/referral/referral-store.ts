import { createSignedToken, parseSignedToken } from "@/lib/user-id";

/**
 * Referral Program Store
 *
 * Manages referral codes and tracking for user growth.
 *
 * Referral codes use a deterministic deploy-stable format so they remain valid
 * across serverless instances and future deployments. Anonymous user cookies
 * now prefer a Vercel project-scoped fallback secret for cross-deploy stability,
 * but referral stats still remain in-memory and are therefore best-effort only
 * until this subsystem gets durable storage.
 */

export type ReferralStatus = "pending" | "converted" | "rewarded";

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  codeUsed: string;
  status: ReferralStatus;
  referrerReward: string | null;
  refereeReward: string | null;
  convertedAt: string | null;
  rewardedAt: string | null;
  createdAt: string;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  rewardedReferrals: number;
  totalRewardsEarned: number; // In months of free Premium
}

interface ReferralStore {
  codes: Map<string, ReferralCode>;
  codesByUserId: Map<string, string>;
  codesByCode: Map<string, string>;
  referrals: Map<string, Referral>;
  referralsByReferrer: Map<string, string[]>;
  referralsByReferee: Map<string, string>;
}

const STORE_KEY = "__jfp_referral_store__";
const REFERRAL_CODE_PREFIX = "u_";
const MAX_USER_ID_LENGTH = 200;
// Reward constants
const REFERRER_REWARD_MONTHS = 1; // 1 month free Premium per successful referral
const MAX_REWARD_MONTHS_PER_YEAR = 12;
const REFEREE_EXTENDED_TRIAL_DAYS = 30;
const REFEREE_DISCOUNT_PERCENT = 20;

function getStore(): ReferralStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ReferralStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      codes: new Map(),
      codesByUserId: new Map(),
      codesByCode: new Map(),
      referrals: new Map(),
      referralsByReferrer: new Map(),
      referralsByReferee: new Map(),
    };
  }

  return globalStore[STORE_KEY];
}

function isValidReferralUserId(userId: string): boolean {
  if (!userId) return false;
  if (userId.length > MAX_USER_ID_LENGTH) return false;
  if (userId.trim() !== userId) return false;
  return !userId.includes(".");
}

function createReferralCodeToken(userId: string): string {
  return `${REFERRAL_CODE_PREFIX}${createSignedToken(userId, "referral-code")}`;
}

function decodeReferralCodeToken(code: string): string | null {
  if (code.startsWith(REFERRAL_CODE_PREFIX)) {
    return parseSignedToken(
      code.slice(REFERRAL_CODE_PREFIX.length),
      "referral-code",
      isValidReferralUserId
    );
  }

  return parseSignedToken(code, "referral-code", isValidReferralUserId);
}

/**
 * Get or create a referral code for a user.
 * Each user has exactly one referral code.
 */
export function getOrCreateReferralCode(userId: string): ReferralCode {
  const store = getStore();

  // Check if user already has a code
  const existingCodeId = store.codesByUserId.get(userId);
  if (existingCodeId) {
    const existingCode = store.codes.get(existingCodeId);
    if (existingCode) return existingCode;
  }

  const code = createReferralCodeToken(userId);

  const referralCode: ReferralCode = {
    id: crypto.randomUUID(),
    userId,
    code,
    createdAt: new Date().toISOString(),
  };

  store.codes.set(referralCode.id, referralCode);
  store.codesByUserId.set(userId, referralCode.id);
  store.codesByCode.set(code, referralCode.id);

  return referralCode;
}

/**
 * Get a referral code by its code string.
 */
export function getReferralCodeByCode(code: string): ReferralCode | null {
  const store = getStore();
  const normalizedCode = code.trim();

  const directCodeId =
    store.codesByCode.get(normalizedCode) ??
    store.codesByCode.get(normalizedCode.toUpperCase());

  if (directCodeId) {
    return store.codes.get(directCodeId) ?? null;
  }

  const userId = decodeReferralCodeToken(normalizedCode);
  if (!userId) {
    return null;
  }

  return {
    id: `stateless:${userId}`,
    userId,
    code: normalizedCode,
    createdAt: new Date(0).toISOString(),
  };
}

/**
 * Get a user's referral code if it exists.
 */
export function getReferralCodeByUserId(userId: string): ReferralCode | null {
  const store = getStore();
  const codeId = store.codesByUserId.get(userId);
  if (codeId) {
    return store.codes.get(codeId) ?? null;
  }

  return {
    id: `stateless:${userId}`,
    userId,
    code: createReferralCodeToken(userId),
    createdAt: new Date(0).toISOString(),
  };
}

/**
 * Apply a referral code when a new user signs up.
 * Returns the created referral or null if invalid.
 */
export function applyReferralCode(input: {
  code: string;
  refereeId: string;
}): Referral | { error: string } {
  const store = getStore();

  // Get the referral code
  const referralCode = getReferralCodeByCode(input.code);
  if (!referralCode) {
    return { error: "Invalid referral code." };
  }

  // Prevent self-referral
  if (referralCode.userId === input.refereeId) {
    return { error: "You cannot use your own referral code." };
  }

  // Check if user has already used a referral code
  const existingReferral = store.referralsByReferee.get(input.refereeId);
  if (existingReferral) {
    return { error: "You have already used a referral code." };
  }

  const referral: Referral = {
    id: crypto.randomUUID(),
    referrerId: referralCode.userId,
    refereeId: input.refereeId,
    codeUsed: referralCode.code,
    status: "pending",
    referrerReward: null,
    refereeReward: `${REFEREE_EXTENDED_TRIAL_DAYS}-day trial OR ${REFEREE_DISCOUNT_PERCENT}% off`,
    convertedAt: null,
    rewardedAt: null,
    createdAt: new Date().toISOString(),
  };

  store.referrals.set(referral.id, referral);
  store.referralsByReferee.set(input.refereeId, referral.id);

  const referrerReferrals = store.referralsByReferrer.get(referralCode.userId) ?? [];
  referrerReferrals.push(referral.id);
  store.referralsByReferrer.set(referralCode.userId, referrerReferrals);

  return referral;
}

/**
 * Mark a referral as converted when the referee becomes a paying customer.
 */
export function convertReferral(refereeId: string): Referral | null {
  const store = getStore();

  const referralId = store.referralsByReferee.get(refereeId);
  if (!referralId) return null;

  const referral = store.referrals.get(referralId);
  if (!referral || referral.status !== "pending") return null;

  referral.status = "converted";
  referral.convertedAt = new Date().toISOString();
  store.referrals.set(referralId, referral);

  return referral;
}

/**
 * Award rewards to the referrer after a successful conversion.
 */
export function awardReferralReward(referralId: string): Referral | { error: string } {
  const store = getStore();

  const referral = store.referrals.get(referralId);
  if (!referral) {
    return { error: "Referral not found." };
  }

  if (referral.status !== "converted") {
    return { error: "Referral must be converted before rewarding." };
  }

  // Check if referrer has reached yearly cap
  const stats = getReferralStats(referral.referrerId);
  if (stats.totalRewardsEarned >= MAX_REWARD_MONTHS_PER_YEAR) {
    return { error: "Referrer has reached the yearly reward cap." };
  }

  referral.status = "rewarded";
  referral.referrerReward = `${REFERRER_REWARD_MONTHS} month free Premium`;
  referral.rewardedAt = new Date().toISOString();
  store.referrals.set(referralId, referral);

  return referral;
}

/**
 * Get all referrals made by a user (as referrer).
 */
export function getReferralsByReferrer(userId: string): Referral[] {
  const store = getStore();
  const referralIds = store.referralsByReferrer.get(userId) ?? [];
  return referralIds
    .map((id) => store.referrals.get(id))
    .filter((r): r is Referral => Boolean(r))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get a user's referral (as referee).
 */
export function getReferralByReferee(userId: string): Referral | null {
  const store = getStore();
  const referralId = store.referralsByReferee.get(userId);
  if (!referralId) return null;
  return store.referrals.get(referralId) ?? null;
}

/**
 * Get referral statistics for a user.
 */
export function getReferralStats(userId: string): ReferralStats {
  const referrals = getReferralsByReferrer(userId);

  const pendingReferrals = referrals.filter((r) => r.status === "pending").length;
  const convertedReferrals = referrals.filter((r) => r.status === "converted").length;
  const rewardedReferrals = referrals.filter((r) => r.status === "rewarded").length;

  // Calculate rewards earned in the current calendar year
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1).toISOString();
  const rewardsThisYear = referrals.filter(
    (r) => r.status === "rewarded" && r.rewardedAt && r.rewardedAt >= yearStart
  ).length;

  return {
    totalReferrals: referrals.length,
    pendingReferrals,
    convertedReferrals,
    rewardedReferrals,
    totalRewardsEarned: rewardsThisYear * REFERRER_REWARD_MONTHS,
  };
}

/**
 * Generate the referral URL for a code.
 */
export function getReferralUrl(code: string): string {
  return `https://jeffreysprompts.com/r/${encodeURIComponent(code)}`;
}

/**
 * Constants for external use.
 */
export const REFERRAL_CONSTANTS = {
  REFERRER_REWARD_MONTHS,
  MAX_REWARD_MONTHS_PER_YEAR,
  REFEREE_EXTENDED_TRIAL_DAYS,
  REFEREE_DISCOUNT_PERCENT,
} as const;
