import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import {
  applyReferralCode,
  getOrCreateReferralCode,
} from "@/lib/referral/referral-store";
import { USER_ID_COOKIE_NAME } from "@/lib/user-id";

type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function clearReferralStore() {
  const globalStore = globalThis as unknown as Record<string, unknown>;
  globalStore.__jfp_referral_store__ = undefined;
}

function makeRequest(url: string, cookieValue?: string): NextRequest {
  const headers = new Headers();
  if (cookieValue) {
    headers.set("Cookie", `${USER_ID_COOKIE_NAME}=${cookieValue}`);
  }
  const init: NextRequestInit = { method: "GET", headers };
  const request = new NextRequest(url, init);
  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    const parts = cookieHeader.split(";").map((part) => part.trim());
    for (const part of parts) {
      if (!part) continue;
      const splitAt = part.indexOf("=");
      if (splitAt <= 0) continue;
      request.cookies.set(part.slice(0, splitAt), part.slice(splitAt + 1));
    }
  }
  return request;
}

function extractCookieValue(setCookie: string): string {
  const firstSegment = setCookie.split(";")[0]?.trim() ?? "";
  const prefix = `${USER_ID_COOKIE_NAME}=`;
  if (!firstSegment.startsWith(prefix)) {
    throw new Error("Missing user-id cookie in Set-Cookie header");
  }
  return firstSegment.slice(prefix.length);
}

function extractUserIdFromSignedCookie(cookieValue: string): string {
  const splitAt = cookieValue.lastIndexOf(".");
  if (splitAt <= 0) {
    throw new Error("Invalid signed user-id cookie format");
  }
  return cookieValue.slice(0, splitAt);
}

async function bootstrapAnonymousUser(): Promise<{
  userId: string;
  cookieValue: string;
}> {
  const response = await GET(
    makeRequest("http://localhost/api/referral/apply?code=NOPE1234")
  );
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Expected route to set anonymous user cookie");
  }
  const cookieValue = extractCookieValue(setCookie);
  return {
    userId: extractUserIdFromSignedCookie(cookieValue),
    cookieValue,
  };
}

describe("/api/referral/apply GET", () => {
  beforeEach(() => {
    clearReferralStore();
  });

  it("returns 400 when code is missing", async () => {
    const request = makeRequest("http://localhost/api/referral/apply");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Referral code is required.");
  });

  it("returns valid=false for unknown code", async () => {
    const request = makeRequest("http://localhost/api/referral/apply?code=NOPE1234");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.valid).toBe(false);
    expect(payload.data.message).toBe("Invalid referral code.");
  });

  it("returns valid=true for usable code", async () => {
    const referralCode = getOrCreateReferralCode("referrer-user");
    const request = makeRequest(
      `http://localhost/api/referral/apply?code=${referralCode.code}`
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.valid).toBe(true);
    expect(payload.data.rewards.extendedTrialDays).toBeGreaterThan(0);
    expect(payload.data.rewards.discountPercent).toBeGreaterThan(0);
    expect(response.headers.get("set-cookie")).toContain(`${USER_ID_COOKIE_NAME}=`);
  });

  it("returns valid=false for self-referral", async () => {
    const { userId, cookieValue } = await bootstrapAnonymousUser();
    const referralCode = getOrCreateReferralCode(userId);
    const request = makeRequest(
      `http://localhost/api/referral/apply?code=${referralCode.code}`,
      cookieValue
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.valid).toBe(false);
    expect(payload.data.message).toBe("You cannot use your own referral code.");
  });

  it("returns valid=false when user already used a referral code", async () => {
    const { userId, cookieValue } = await bootstrapAnonymousUser();
    const referralCode = getOrCreateReferralCode("referrer-user");
    applyReferralCode({ code: referralCode.code, refereeId: userId });
    const request = makeRequest(
      `http://localhost/api/referral/apply?code=${referralCode.code}`,
      cookieValue
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.valid).toBe(false);
    expect(payload.data.message).toBe("You have already used a referral code.");
  });
});
