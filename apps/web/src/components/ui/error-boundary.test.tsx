/**
 * Unit tests for ErrorBoundary component
 * Tests error catching, fallback rendering, and reset behavior.
 */

import React from "react";
import { render, screen, fireEvent} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorBoundary, withErrorBoundary } from "./error-boundary";

// A component that throws
function ThrowingComponent({ error }: { error?: Error }) {
  if (error) throw error;
  return <div>Working</div>;
}

// Suppress console.error during error boundary tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Child content")).toBeDefined();
  });

  it("renders default fallback when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error("test error")} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent error={new Error("test")} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error UI")).toBeDefined();
  });

  it("renders nothing when fallback is null", () => {
    const { container } = render(
      <ErrorBoundary fallback={null}>
        <ThrowingComponent error={new Error("test")} />
      </ErrorBoundary>
    );
    expect(container.innerHTML).toBe("");
  });

  it("calls onError callback when error is caught", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent error={new Error("callback test")} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("callback test");
  });

  it("shows Try Again button in default fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error("test")} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Try Again")).toBeDefined();
  });

  it("resets error state on retry click", () => {
    let shouldThrow = true;
    function ConditionalThrow() {
      if (shouldThrow) throw new Error("boom");
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));
    expect(screen.getByText("Recovered")).toBeDefined();
  });

  it("calls onReset callback when retry is clicked", () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent error={new Error("test")} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText("Try Again"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("renders minimal variant", () => {
    render(
      <ErrorBoundary variant="minimal">
        <ThrowingComponent error={new Error("test")} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Retry")).toBeDefined();
  });

  it("renders inline variant with error message", () => {
    render(
      <ErrorBoundary variant="inline">
        <ThrowingComponent error={new Error("Inline error msg")} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Inline error msg")).toBeDefined();
  });
});

describe("withErrorBoundary", () => {
  it("wraps component with error boundary", () => {
    function MyComponent() {
      return <div>My component</div>;
    }
    const Wrapped = withErrorBoundary(MyComponent);
    render(<Wrapped />);
    expect(screen.getByText("My component")).toBeDefined();
  });

  it("catches errors from wrapped component", () => {
    function BrokenComponent(): React.ReactNode {
      throw new Error("broken");
    }
    const Wrapped = withErrorBoundary(BrokenComponent);
    render(<Wrapped />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("sets displayName on wrapped component", () => {
    function Named() {
      return null;
    }
    const Wrapped = withErrorBoundary(Named);
    expect(Wrapped.displayName).toBe("withErrorBoundary(Named)");
  });

  it("passes errorBoundary props through", () => {
    const onError = vi.fn();
    function Broken(): React.ReactNode {
      throw new Error("test");
    }
    const Wrapped = withErrorBoundary(Broken, { onError });
    render(<Wrapped />);
    expect(onError).toHaveBeenCalled();
  });
});
