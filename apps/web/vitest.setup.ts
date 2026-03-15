import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";
import type React from "react";

// framer-motion is mocked via the alias in vitest.config.ts pointing to
// src/__mocks__/framer-motion.tsx. This provides stable component references
// (no Proxy) so React reconciliation works correctly across re-renders.

const defaultUnmockedFetch = vi.fn(async () => {
  throw new DOMException("Aborted by test default fetch stub", "AbortError");
});

beforeEach(() => {
  defaultUnmockedFetch.mockClear();
  globalThis.fetch = defaultUnmockedFetch as unknown as typeof fetch;
});

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));
