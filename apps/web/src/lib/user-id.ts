import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const USER_ID_COOKIE_NAME = "jfp_uid";
const MAX_USER_ID_LENGTH = 200;
const USER_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

let cachedSecret: Buffer | null = null;
let warnedMissingSecret = false;

function getSecret(): Buffer {
  if (cachedSecret) return cachedSecret;

  const envSecret =
    process.env.JFP_USER_ID_SECRET || process.env.JFP_ANON_ID_SECRET;

  if (envSecret) {
    cachedSecret = Buffer.from(envSecret, "utf8");
    return cachedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing JFP_USER_ID_SECRET (or JFP_ANON_ID_SECRET) in production. Configure a stable secret to avoid anonymous user identity churn."
    );
  }

  const fallback = `dev-${process.pid}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  cachedSecret = Buffer.from(fallback, "utf8");

  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      "JFP_USER_ID_SECRET is not set. Falling back to an ephemeral secret in non-production; anonymous user IDs will reset when the process restarts."
    );
  }

  return cachedSecret;
}

function toBase64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signUserId(userId: string): string {
  return toBase64Url(createHmac("sha256", getSecret()).update(userId).digest());
}

function isValidUserId(userId: string): boolean {
  if (!userId) return false;
  if (userId.length > MAX_USER_ID_LENGTH) return false;
  return userId.trim() === userId;
}

function createUserId(): string {
  try {
    return randomUUID();
  } catch {
    return randomBytes(16).toString("hex");
  }
}

export function createUserIdCookieValue(userId: string): string {
  return `${userId}.${signUserId(userId)}`;
}

export function parseUserIdCookie(value?: string | null): string | null {
  if (!value) return null;
  const token = value.trim();
  if (!token) return null;

  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;

  const userId = token.slice(0, splitAt);
  const signature = token.slice(splitAt + 1);

  if (!isValidUserId(userId) || !signature) return null;

  const expected = signUserId(userId);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (sigBuf.length !== expectedBuf.length) return null;

  try {
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  return userId;
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get(USER_ID_COOKIE_NAME)?.value;
  if (cookie) return parseUserIdCookie(cookie);

  const header = request.headers.get("cookie");
  if (!header) return null;

  const parts = header.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${USER_ID_COOKIE_NAME}=`)) continue;
    const value = part.slice(USER_ID_COOKIE_NAME.length + 1);
    return parseUserIdCookie(value);
  }

  return null;
}

export function getOrCreateUserId(
  request: NextRequest
): {
  userId: string;
  cookie?: {
    name: string;
    value: string;
    options: {
      httpOnly: true;
      sameSite: "lax";
      secure: boolean;
      path: "/";
      maxAge: number;
    };
  };
} {
  const existing = getUserIdFromRequest(request);
  if (existing) return { userId: existing };

  const userId = createUserId();
  const value = createUserIdCookieValue(userId);

  return {
    userId,
    cookie: {
      name: USER_ID_COOKIE_NAME,
      value,
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: USER_ID_COOKIE_MAX_AGE,
      },
    },
  };
}
