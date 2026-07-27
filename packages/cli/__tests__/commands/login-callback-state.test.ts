/**
 * Tests for the loopback callback state verification in the local login flow.
 *
 * The premium backend echoes the CLI's 32-hex `state` nonce back to
 * http://127.0.0.1:<port>/callback. A callback without the matching nonce is
 * not the login this process started and must be rejected without killing the
 * pending login.
 */

import { describe, test, expect } from "bun:test";
import { startCallbackServer } from "../../src/commands/login";

const STATE = "0123456789abcdef0123456789abcdef";

function callbackUrl(port: number, params: Record<string, string>): string {
  const url = new URL(`http://127.0.0.1:${port}/callback`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

const SUCCESS_PARAMS = {
  state: STATE,
  token: "test-access-token",
  email: "user@example.com",
  tier: "premium",
  user_id: "user-123",
  refresh_token: "test-refresh-token",
  expires_at: "2099-01-01T00:00:00.000Z",
};

describe("startCallbackServer state verification", () => {
  test("rejects a callback with a wrong state and stays alive for the real one", async () => {
    const { port, tokenPromise, close } = await startCallbackServer(10_000, STATE);

    try {
      const spoofed = await fetch(
        callbackUrl(port, { ...SUCCESS_PARAMS, state: "f".repeat(32) })
      );
      expect(spoofed.status).toBe(400);
      expect(await spoofed.text()).toContain("Invalid callback state");

      // The pending login must survive the spoofed callback.
      const legit = await fetch(callbackUrl(port, SUCCESS_PARAMS));
      expect(legit.status).toBe(200);

      const credentials = await tokenPromise;
      expect(credentials.access_token).toBe("test-access-token");
      expect(credentials.email).toBe("user@example.com");
      expect(credentials.tier).toBe("premium");
      expect(credentials.user_id).toBe("user-123");
    } finally {
      close();
    }
  });

  test("rejects a callback with no state at all", async () => {
    const { port, tokenPromise, close } = await startCallbackServer(10_000, STATE);

    try {
      const { state: _state, ...withoutState } = SUCCESS_PARAMS;
      const response = await fetch(callbackUrl(port, withoutState));
      expect(response.status).toBe(400);

      const legit = await fetch(callbackUrl(port, SUCCESS_PARAMS));
      expect(legit.status).toBe(200);
      await tokenPromise;
    } finally {
      close();
    }
  });

  test("accepts a matching state and resolves credentials", async () => {
    const { port, tokenPromise, close } = await startCallbackServer(10_000, STATE);

    try {
      const response = await fetch(callbackUrl(port, SUCCESS_PARAMS));
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Login Successful");

      const credentials = await tokenPromise;
      expect(credentials.refresh_token).toBe("test-refresh-token");
      expect(credentials.expires_at).toBe("2099-01-01T00:00:00.000Z");
    } finally {
      close();
    }
  });

  test("surfaces error_description from an error callback with valid state", async () => {
    const { port, tokenPromise, close } = await startCallbackServer(10_000, STATE);

    try {
      // Attach the handler before triggering the callback so the synchronous
      // rejection inside the request handler is never unhandled.
      let rejectionMessage = "";
      const settled = tokenPromise.catch((err: Error) => {
        rejectionMessage = err.message;
      });

      const response = await fetch(
        callbackUrl(port, {
          state: STATE,
          error: "access_denied",
          error_description: "User cancelled authentication",
        })
      );
      expect(response.status).toBe(200);

      await settled;
      expect(rejectionMessage).toBe("User cancelled authentication");
    } finally {
      close();
    }
  });
});
