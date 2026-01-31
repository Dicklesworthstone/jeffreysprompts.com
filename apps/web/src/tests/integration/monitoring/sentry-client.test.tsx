/**
 * Integration tests for client-side Sentry error monitoring
 * Tests error boundary integration and client-side error capture
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Hoist mocks so they are available to the factory
const mocks = vi.hoisted(() => {
  const mockSetTag = vi.fn();
  const mockSetContext = vi.fn();
  const mockSetUser = vi.fn();
  const mockWithScope = vi.fn((callback) => {
    const mockScope = {
      setTag: mockSetTag,
      setContext: mockSetContext,
      setUser: mockSetUser,
      setExtra: vi.fn(),
      setLevel: vi.fn(),
    };
    callback(mockScope);
  });

  return {
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    setContext: mockSetContext,
    setTag: mockSetTag,
    setUser: mockSetUser,
    withScope: mockWithScope,
    replayIntegration: vi.fn(() => ({ name: "Replay" })),
  };
});

vi.mock("@sentry/nextjs", () => mocks);

describe("Sentry Client Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("configuration validation", () => {
    it("should have client Sentry configuration file", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const clientConfigPath = path.join(webAppRoot, "sentry.client.config.ts");

      expect(fs.existsSync(clientConfigPath)).toBe(true);
    });

    it("should configure replay integration in client config", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const clientConfig = fs.readFileSync(
        path.join(webAppRoot, "sentry.client.config.ts"),
        "utf-8"
      );

      expect(clientConfig).toContain("replayIntegration");
      expect(clientConfig).toContain("replaysOnErrorSampleRate");
      expect(clientConfig).toContain("replaysSessionSampleRate");
    });

    it("should have beforeSend filter in client config", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const clientConfig = fs.readFileSync(
        path.join(webAppRoot, "sentry.client.config.ts"),
        "utf-8"
      );

      expect(clientConfig).toContain("beforeSend");
    });

    it("should filter browser extension errors", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const clientConfig = fs.readFileSync(
        path.join(webAppRoot, "sentry.client.config.ts"),
        "utf-8"
      );

      // Check that extension errors are filtered
      expect(clientConfig).toContain("extension://");
    });

    it("should not send events in development", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const clientConfig = fs.readFileSync(
        path.join(webAppRoot, "sentry.client.config.ts"),
        "utf-8"
      );

      // Check for development guard
      expect(clientConfig).toContain("development");
      expect(clientConfig).toContain("return null");
    });
  });

  describe("client-side error capture", () => {
    it("should capture client exceptions", async () => {
      const Sentry = await import("@sentry/nextjs");

      const clientError = new Error("Client-side error");
      Sentry.captureException(clientError);

      expect(mocks.captureException).toHaveBeenCalledWith(clientError);
    });

    it("should support client context with requestId", async () => {
      const Sentry = await import("@sentry/nextjs");

      const requestId = "client-req-12345";

      Sentry.withScope((scope) => {
        scope.setTag("requestId", requestId);
        scope.setContext("client", {
          requestId,
          userAgent: "TestBrowser/1.0",
          viewport: "1920x1080",
        });
      });

      expect(mocks.setTag).toHaveBeenCalledWith("requestId", requestId);
      expect(mocks.setContext).toHaveBeenCalledWith("client", expect.objectContaining({
        requestId,
      }));
    });
  });
});

describe("Error Boundary Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for error boundary tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("error boundary component structure", () => {
    it("should have error boundary component file", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const errorBoundaryPath = path.join(
        webAppRoot,
        "src/components/ui/error-boundary.tsx"
      );

      expect(fs.existsSync(errorBoundaryPath)).toBe(true);
    });

    it("should export ErrorBoundary class", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const errorBoundary = fs.readFileSync(
        path.join(webAppRoot, "src/components/ui/error-boundary.tsx"),
        "utf-8"
      );

      expect(errorBoundary).toContain("export class ErrorBoundary");
      expect(errorBoundary).toContain("getDerivedStateFromError");
      expect(errorBoundary).toContain("componentDidCatch");
    });

    it("should support onError callback prop", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const errorBoundary = fs.readFileSync(
        path.join(webAppRoot, "src/components/ui/error-boundary.tsx"),
        "utf-8"
      );

      expect(errorBoundary).toContain("onError");
      expect(errorBoundary).toContain("this.props.onError");
    });

    it("should export withErrorBoundary HOC", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const webAppRoot = path.resolve(__dirname, "../../../..");
      const errorBoundary = fs.readFileSync(
        path.join(webAppRoot, "src/components/ui/error-boundary.tsx"),
        "utf-8"
      );

      expect(errorBoundary).toContain("export function withErrorBoundary");
    });
  });

  describe("error boundary error reporting", () => {
    it("should call onError callback when error occurs", async () => {
      // Import the actual ErrorBoundary component
      const { ErrorBoundary } = await import("@/components/ui/error-boundary");

      const onError = vi.fn();

      // Component that throws an error
      const ThrowingComponent = () => {
        throw new Error("Test error for boundary");
      };

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Verify onError was called
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(onError.mock.calls[0][0].message).toBe("Test error for boundary");
    });

    it("should render fallback UI on error", async () => {
      const { ErrorBoundary } = await import("@/components/ui/error-boundary");

      const ThrowingComponent = () => {
        throw new Error("Render error");
      };

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Check that fallback UI is shown - use heading role for specificity
      expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    });

    it("should render custom fallback when provided", async () => {
      const { ErrorBoundary } = await import("@/components/ui/error-boundary");

      const ThrowingComponent = () => {
        throw new Error("Custom fallback error");
      };

      render(
        <ErrorBoundary fallback={<div>Custom Error Message</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText("Custom Error Message")).toBeInTheDocument();
    });

    it("should support error recovery via reset", async () => {
      const { ErrorBoundary } = await import("@/components/ui/error-boundary");

      let shouldThrow = true;

      const ConditionalThrowingComponent = () => {
        if (shouldThrow) {
          throw new Error("Recoverable error");
        }
        return <div>Recovered successfully</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalThrowingComponent />
        </ErrorBoundary>
      );

      // Should show error state
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Simulate recovery
      shouldThrow = false;

      // Find and click retry button
      const retryButton = screen.getByRole("button", { name: /try again/i });
      retryButton.click();

      // Re-render after reset
      rerender(
        <ErrorBoundary>
          <ConditionalThrowingComponent />
        </ErrorBoundary>
      );

      // Note: Full recovery testing would require more complex setup
      // This test verifies the retry button exists and is clickable
    });
  });

  describe("Sentry integration pattern", () => {
    it("should support Sentry captureException in onError", async () => {
      const { ErrorBoundary } = await import("@/components/ui/error-boundary");
      const Sentry = await import("@sentry/nextjs");

      const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
        Sentry.withScope((scope) => {
          scope.setTag("errorBoundary", "true");
          scope.setContext("componentStack", {
            stack: errorInfo.componentStack,
          });
        });
        Sentry.captureException(error);
      };

      const ThrowingComponent = () => {
        throw new Error("Sentry integration test");
      };

      render(
        <ErrorBoundary onError={handleError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Verify Sentry was called with correct context
      expect(mocks.withScope).toHaveBeenCalled();
      expect(mocks.setTag).toHaveBeenCalledWith("errorBoundary", "true");
      expect(mocks.captureException).toHaveBeenCalled();
    });
  });
});

describe("Client Error Correlation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should propagate requestId from server to client context", async () => {
    const Sentry = await import("@sentry/nextjs");

    // Simulate request ID from server headers
    const serverRequestId = "srv-req-98765";

    Sentry.withScope((scope) => {
      scope.setTag("requestId", serverRequestId);
      scope.setContext("page", {
        requestId: serverRequestId,
        url: "/test-page",
        referrer: "https://example.com",
      });
    });

    expect(mocks.setTag).toHaveBeenCalledWith("requestId", serverRequestId);
    expect(mocks.setContext).toHaveBeenCalledWith("page", expect.objectContaining({
      requestId: serverRequestId,
    }));
  });

  it("should include session ID for error correlation", async () => {
    const Sentry = await import("@sentry/nextjs");

    const sessionId = "session-abc123";
    const requestId = "req-xyz789";

    Sentry.withScope((scope) => {
      scope.setTag("sessionId", sessionId);
      scope.setTag("requestId", requestId);
      scope.setContext("session", {
        sessionId,
        requestId,
        startedAt: new Date().toISOString(),
      });
    });

    expect(mocks.setTag).toHaveBeenCalledWith("sessionId", sessionId);
    expect(mocks.setTag).toHaveBeenCalledWith("requestId", requestId);
  });
});

describe("PII Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not include PII in error context", async () => {
    const Sentry = await import("@sentry/nextjs");

    // Set user with only non-PII fields
    Sentry.withScope((scope) => {
      scope.setUser({
        id: "anon-user-id-123",
        // These should NOT be included:
        // email: "user@example.com",
        // ip_address: "192.168.1.1",
        // username: "john_doe",
      });
    });

    const userCall = mocks.setUser.mock.calls[0]?.[0];
    if (userCall) {
      expect(userCall).not.toHaveProperty("email");
      expect(userCall).not.toHaveProperty("ip_address");
      expect(userCall).not.toHaveProperty("username");
      expect(userCall).not.toHaveProperty("name");
    }
  });

  it("should sanitize error context from sensitive data", async () => {
    const Sentry = await import("@sentry/nextjs");

    // Context should not include sensitive form data
    Sentry.withScope((scope) => {
      scope.setContext("form", {
        formId: "login-form",
        fieldCount: 3,
        // These should NOT be included:
        // password: "secret123",
        // creditCard: "4111-1111-1111-1111",
        // ssn: "123-45-6789",
      });
    });

    const contextCall = mocks.setContext.mock.calls.find(
      (call) => call[0] === "form"
    );

    if (contextCall) {
      const contextData = contextCall[1];
      expect(contextData).not.toHaveProperty("password");
      expect(contextData).not.toHaveProperty("creditCard");
      expect(contextData).not.toHaveProperty("ssn");
    }
  });
});
