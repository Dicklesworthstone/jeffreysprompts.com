import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import {
  applyReferralCode,
  getOrCreateReferralCode,
} from "@/lib/referral/referral-store";
import { USER_ID_COOKIE_NAME } from "@/lib/user-id";

const REFERRAL_CLAIM_COOKIE_NAME = "jfp_referral_claim";

type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function clearReferralStore() {
  const globalStore = globalThis as unknown as Record<string, unknown>;
  globalStore.__jfp_referral_store__ = undefined;
}

function applyCookieHeaderToRequest(request: NextRequest, cookieHeader: string | null) {
  if (!cookieHeader) {
    return;
  }

  for (const rawPart of cookieHeader.split(";")) {
    const part = rawPart.trim();
    if (part.length === 0) {
      continue;
    }

    const splitAt = part.indexOf("=");
    if (splitAt <= 0) {
      continue;
    }

    request.cookies.set(part.slice(0, splitAt), part.slice(splitAt + 1));
  }
}

function buildCookieHeader(
  cookies: Record<string, string | null | undefined>
): string | undefined {
  const parts = Object.entries(cookies)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
    .map(([name, value]) => `${name}=${value}`);

  return parts.length > 0 ? parts.join("; ") : undefined;
}

function makeRequest(url: string, cookieHeader?: string): NextRequest {
  const headers = new Headers();
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }
  const init: NextRequestInit = { method: "GET", headers };
  const request = new NextRequest(url, init);
  applyCookieHeaderToRequest(request, headers.get("cookie"));
  return request;
}

function makePostRequest(body: unknown, cookieHeader?: string): NextRequest {
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const request = new NextRequest("http://localhost/api/referral/apply", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  applyCookieHeaderToRequest(request, headers.get("cookie"));
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
      buildCookieHeader({ [USER_ID_COOKIE_NAME]: cookieValue })
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
      buildCookieHeader({ [USER_ID_COOKIE_NAME]: cookieValue })
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.valid).toBe(false);
    expect(payload.data.message).toBe("You have already used a referral code.");
  });
});

describe("/api/referral/apply POST", () => {
  beforeEach(() => {
    clearReferralStore();
  });

  it("applies a valid referral code and sets the anonymous user cookie", async () => {
    const referralCode = getOrCreateReferralCode("referrer-user");
    const response = await POST(makePostRequest({ code: referralCode.code }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.applied).toBe(true);
    expect(response.headers.get("set-cookie")).toContain(`${USER_ID_COOKIE_NAME}=`);
  });

  it("applies a valid referral code even after the in-memory store is cleared", async () => {
    const referralCode = getOrCreateReferralCode("referrer-user");
    clearReferralStore();

    const response = await POST(makePostRequest({ code: referralCode.code }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.applied).toBe(true);
  });

  it("returns 400 for an invalid referral code", async () => {
    const response = await POST(makePostRequest({ code: "missing123" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Invalid referral code.");
  });

  it("returns 400 when the anonymous user already used a referral code", async () => {
    const { userId, cookieValue } = await bootstrapAnonymousUser();
    const firstCode = getOrCreateReferralCode("referrer-a");
    const secondCode = getOrCreateReferralCode("referrer-b");

    applyReferralCode({ code: firstCode.code, refereeId: userId });

    const response = await POST(
      makePostRequest(
        { code: secondCode.code },
        buildCookieHeader({ [USER_ID_COOKIE_NAME]: cookieValue })
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("You have already used a referral code.");
  });

  it("rejects a second referral after store reset when the claim cookie is present", async () => {
    const firstCode = getOrCreateReferralCode("referrer-a");
    const firstResponse = await POST(makePostRequest({ code: firstCode.code }));

    expect(firstResponse.status).toBe(200);

    const userCookie = firstResponse.cookies.get(USER_ID_COOKIE_NAME)?.value;
    const claimCookie = firstResponse.cookies.get(REFERRAL_CLAIM_COOKIE_NAME)?.value;

    expect(userCookie).toBeTruthy();
    expect(claimCookie).toBeTruthy();

    clearReferralStore();

    const secondCode = getOrCreateReferralCode("referrer-b");
    const secondResponse = await POST(
      makePostRequest(
        { code: secondCode.code },
        buildCookieHeader({
          [USER_ID_COOKIE_NAME]: userCookie,
          [REFERRAL_CLAIM_COOKIE_NAME]: claimCookie,
        })
      )
    );
    const payload = await secondResponse.json();

    expect(secondResponse.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("You have already used a referral code.");
  });
});
