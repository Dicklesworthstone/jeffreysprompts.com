import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "framer-motion": path.resolve(__dirname, "./src/__mocks__/framer-motion.tsx"),
    },
    server: {
      deps: {
        inline: ["zod"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/__mocks__/**",
        "src/types/**",
      ],
      thresholds: {
        lines: 13,
        branches: 11,
        functions: 14,
        statements: 13,
      },
    },
  },
});
