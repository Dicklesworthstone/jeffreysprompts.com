import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

// Mock framer-motion globally
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          const Component = React.forwardRef(({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }, ref) => {
            return React.createElement(prop, { ...props, ref }, children);
          });
          Component.displayName = `motion.${prop}`;
          return Component;
        },
      }
    ),
  };
});

