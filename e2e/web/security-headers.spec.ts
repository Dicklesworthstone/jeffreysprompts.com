import { test, expect } from "../lib/playwright-logger";

/**
 * Security Headers & CSP Integration Tests
 *
 * Verifies that all security headers are properly configured:
 * - HSTS (Strict-Transport-Security)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 * - Content-Security-Policy
 */

// Expected security header values
const expectedHeaders = {
  "x-dns-prefetch-control": "on",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-frame-options": "SAMEORIGIN",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

// CSP directives that should be present
const requiredCspDirectives = [
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "frame-src",
  "object-src",
  "base-uri",
  "form-action",
  "frame-ancestors",
];

test.describe("Security Headers - Public Pages", () => {
  test("homepage returns all security headers", async ({ logger, request }) => {
    const response = await logger.step("fetch homepage", async () => {
      return await request.get("/");
    });

    await logger.step("verify HTTP status", async () => {
      expect(response.status()).toBe(200);
    });

    const headers = response.headers();

    await logger.step("verify X-DNS-Prefetch-Control", async () => {
      expect(headers["x-dns-prefetch-control"]).toBe(expectedHeaders["x-dns-prefetch-control"]);
    }, { data: { value: headers["x-dns-prefetch-control"] } });

    await logger.step("verify Strict-Transport-Security (HSTS)", async () => {
      expect(headers["strict-transport-security"]).toBe(expectedHeaders["strict-transport-security"]);
    }, { data: { value: headers["strict-transport-security"] } });

    await logger.step("verify X-Frame-Options", async () => {
      expect(headers["x-frame-options"]).toBe(expectedHeaders["x-frame-options"]);
    }, { data: { value: headers["x-frame-options"] } });

    await logger.step("verify X-Content-Type-Options", async () => {
      expect(headers["x-content-type-options"]).toBe(expectedHeaders["x-content-type-options"]);
    }, { data: { value: headers["x-content-type-options"] } });

    await logger.step("verify Referrer-Policy", async () => {
      expect(headers["referrer-policy"]).toBe(expectedHeaders["referrer-policy"]);
    }, { data: { value: headers["referrer-policy"] } });

    await logger.step("verify Permissions-Policy", async () => {
      expect(headers["permissions-policy"]).toBe(expectedHeaders["permissions-policy"]);
    }, { data: { value: headers["permissions-policy"] } });
  });

  test("homepage has valid Content-Security-Policy", async ({ logger, request }) => {
    const response = await logger.step("fetch homepage", async () => {
      return await request.get("/");
    });

    const csp = response.headers()["content-security-policy"];

    await logger.step("verify CSP header exists", async () => {
      expect(csp).toBeDefined();
      expect(csp.length).toBeGreaterThan(0);
    }, { data: { cspLength: csp?.length } });

    await logger.step("verify CSP has required directives", async () => {
      for (const directive of requiredCspDirectives) {
        expect(csp).toContain(directive);
      }
    }, { data: { csp } });

    await logger.step("verify frame-ancestors directive", async () => {
      expect(csp).toContain("frame-ancestors 'self'");
    });

    await logger.step("verify upgrade-insecure-requests", async () => {
      expect(csp).toContain("upgrade-insecure-requests");
    });

    await logger.step("verify block-all-mixed-content", async () => {
      expect(csp).toContain("block-all-mixed-content");
    });

    await logger.step("verify object-src is restricted", async () => {
      expect(csp).toContain("object-src 'none'");
    });
  });

  test("prompt detail page has security headers", async ({ logger, request }) => {
    const response = await logger.step("fetch prompt page", async () => {
      return await request.get("/prompts/idea-wizard");
    });

    await logger.step("verify HTTP status", async () => {
      expect(response.status()).toBe(200);
    });

    const headers = response.headers();

    await logger.step("verify HSTS header", async () => {
      expect(headers["strict-transport-security"]).toBe(expectedHeaders["strict-transport-security"]);
    });

    await logger.step("verify CSP header", async () => {
      expect(headers["content-security-policy"]).toBeDefined();
    });
  });

  test("bundles page has security headers", async ({ logger, request }) => {
    const response = await logger.step("fetch bundles page", async () => {
      return await request.get("/bundles");
    });

    await logger.step("verify HTTP status", async () => {
      expect(response.status()).toBe(200);
    });

    const headers = response.headers();

    await logger.step("verify security headers present", async () => {
      expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["content-security-policy"]).toBeDefined();
    });
  });
});

test.describe("Security Headers - API Routes", () => {
  test("health endpoint returns security headers", async ({ logger, request }) => {
    const response = await logger.step("fetch health endpoint", async () => {
      return await request.get("/api/health");
    });

    await logger.step("verify HTTP status", async () => {
      expect(response.status()).toBe(200);
    });

    const headers = response.headers();

    await logger.step("verify HSTS on API route", async () => {
      expect(headers["strict-transport-security"]).toBe(expectedHeaders["strict-transport-security"]);
    });

    await logger.step("verify X-Content-Type-Options on API route", async () => {
      expect(headers["x-content-type-options"]).toBe("nosniff");
    });

    await logger.step("verify X-Frame-Options on API route", async () => {
      expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    });
  });

  test("prompts API returns security headers", async ({ logger, request }) => {
    const response = await logger.step("fetch prompts API", async () => {
      return await request.get("/api/prompts");
    });

    await logger.step("verify HTTP status", async () => {
      expect(response.status()).toBe(200);
    });

    const headers = response.headers();

    await logger.step("verify security headers on API", async () => {
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["strict-transport-security"]).toBeDefined();
    });
  });
});

test.describe("CSP Directive Validation", () => {
  test("CSP allows Stripe domains for future integration", async ({ logger, request }) => {
    const response = await logger.step("fetch homepage", async () => {
      return await request.get("/");
    });

    const csp = response.headers()["content-security-policy"];

    await logger.step("verify Stripe script-src allowed", async () => {
      expect(csp).toContain("https://js.stripe.com");
    });

    await logger.step("verify Stripe connect-src allowed", async () => {
      expect(csp).toContain("https://api.stripe.com");
    });

    await logger.step("verify Stripe frame-src allowed", async () => {
      expect(csp).toContain("https://js.stripe.com");
      expect(csp).toContain("https://hooks.stripe.com");
    });
  });

  test("CSP allows Supabase for future integration", async ({ logger, request }) => {
    const response = await logger.step("fetch homepage", async () => {
      return await request.get("/");
    });

    const csp = response.headers()["content-security-policy"];

    await logger.step("verify Supabase connect-src allowed", async () => {
      expect(csp).toContain("https://*.supabase.co");
    });
  });

  test("CSP allows Plausible analytics", async ({ logger, request }) => {
    const response = await logger.step("fetch homepage", async () => {
      return await request.get("/");
    });

    const csp = response.headers()["content-security-policy"];

    await logger.step("verify Plausible origin allowed in script-src and connect-src", async () => {
      // plausible.io (or custom origin) should be in both script-src and connect-src
      // With default config, this is https://plausible.io
      expect(csp).toContain("plausible.io");
    }, { data: { csp } });
  });

  test("CSP restricts unsafe sources appropriately", async ({ logger, request }) => {
    const response = await logger.step("fetch homepage", async () => {
      return await request.get("/");
    });

    const csp = response.headers()["content-security-policy"];

    await logger.step("verify object-src is none", async () => {
      expect(csp).toContain("object-src 'none'");
    });

    await logger.step("verify base-uri is self", async () => {
      expect(csp).toContain("base-uri 'self'");
    });

    await logger.step("verify form-action is self", async () => {
      expect(csp).toContain("form-action 'self'");
    });
  });
});

test.describe("Security Header Consistency", () => {
  const pagesToTest = [
    { path: "/", name: "Homepage" },
    { path: "/bundles", name: "Bundles" },
    { path: "/workflows", name: "Workflows" },
    { path: "/contribute", name: "Contribute" },
    { path: "/api/health", name: "Health API" },
  ];

  for (const { path, name } of pagesToTest) {
    test(`${name} (${path}) has consistent security headers`, async ({ logger, request }) => {
      const response = await logger.step(`fetch ${name}`, async () => {
        return await request.get(path);
      });

      const headers = response.headers();

      await logger.step("verify X-Frame-Options consistency", async () => {
        expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
      });

      await logger.step("verify X-Content-Type-Options consistency", async () => {
        expect(headers["x-content-type-options"]).toBe("nosniff");
      });

      await logger.step("verify Referrer-Policy consistency", async () => {
        expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      });
    });
  }
});

test.describe("No X-Powered-By Header", () => {
  test("X-Powered-By header is not present (privacy)", async ({ logger, request }) => {
    const response = await logger.step("fetch homepage", async () => {
      return await request.get("/");
    });

    const headers = response.headers();

    await logger.step("verify X-Powered-By is absent", async () => {
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  });
});
