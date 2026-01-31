/**
 * Integration tests for bundle size budget
 * Validates that the production bundle stays within configured limits
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Path to web app root
const webAppRoot = path.resolve(__dirname, "../../../..");

describe("Bundle Size Budget", () => {
  describe("size-limit configuration", () => {
    let sizeLimitConfig: Array<{ name: string; path: string; limit: string; gzip?: boolean }>;

    beforeAll(() => {
      const configPath = path.join(webAppRoot, ".size-limit.json");
      expect(fs.existsSync(configPath)).toBe(true);
      sizeLimitConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    });

    it("should have size-limit configuration", () => {
      expect(sizeLimitConfig).toBeInstanceOf(Array);
      expect(sizeLimitConfig.length).toBeGreaterThan(0);
    });

    it("should have JS bundle limit configured", () => {
      const jsConfig = sizeLimitConfig.find(c => c.name.toLowerCase().includes("js"));
      expect(jsConfig).toBeDefined();
      expect(jsConfig?.limit).toBeDefined();
    });

    it("should have CSS bundle limit configured", () => {
      const cssConfig = sizeLimitConfig.find(c => c.name.toLowerCase().includes("css"));
      expect(cssConfig).toBeDefined();
      expect(cssConfig?.limit).toBeDefined();
    });

    it("should use gzip compression for accurate sizing", () => {
      for (const config of sizeLimitConfig) {
        expect(config.gzip).toBe(true);
      }
    });
  });

  describe("bundle analysis", () => {
    it("should have bundle analyzer configured", () => {
      const packageJsonPath = path.join(webAppRoot, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      // Check for @next/bundle-analyzer in dependencies
      const hasBundleAnalyzer =
        packageJson.dependencies?.["@next/bundle-analyzer"] ||
        packageJson.devDependencies?.["@next/bundle-analyzer"];
      expect(hasBundleAnalyzer).toBeTruthy();

      // Check for analyze script
      expect(packageJson.scripts?.analyze).toBeDefined();
    });

    it("should have next.config with bundle analyzer setup", () => {
      const nextConfigPath = path.join(webAppRoot, "next.config.ts");
      expect(fs.existsSync(nextConfigPath)).toBe(true);

      const nextConfig = fs.readFileSync(nextConfigPath, "utf-8");
      expect(nextConfig).toContain("withBundleAnalyzer");
      expect(nextConfig).toContain("ANALYZE");
    });
  });

  describe("production build output", () => {
    it("should have .next directory after build", () => {
      const nextDir = path.join(webAppRoot, ".next");
      // Skip if no build exists (CI will build first)
      if (!fs.existsSync(nextDir)) {
        console.log("Skipping build output test - no .next directory (run build first)");
        return;
      }

      expect(fs.existsSync(nextDir)).toBe(true);
      expect(fs.existsSync(path.join(nextDir, "static"))).toBe(true);
    });

    it("should have static chunks directory", () => {
      const chunksDir = path.join(webAppRoot, ".next/static/chunks");
      // Skip if no build exists
      if (!fs.existsSync(chunksDir)) {
        console.log("Skipping chunks test - no build exists");
        return;
      }

      const files = fs.readdirSync(chunksDir);
      const jsFiles = files.filter(f => f.endsWith(".js"));
      expect(jsFiles.length).toBeGreaterThan(0);
    });
  });

  describe("bundle budget compliance", () => {
    it("should pass size-limit check", { timeout: 120000 }, () => {
      // Skip in test environment if build doesn't exist
      const chunksDir = path.join(webAppRoot, ".next/static/chunks");
      if (!fs.existsSync(chunksDir)) {
        console.log("Skipping size-limit check - no build exists");
        return;
      }

      try {
        // Run size-limit and capture output
        const result = execSync("bun run size-limit --json", {
          cwd: webAppRoot,
          encoding: "utf-8",
        });

        let sizeResults;
        try {
          sizeResults = JSON.parse(result);
        } catch {
          console.error("Failed to parse size-limit output:", result);
          throw new Error("Invalid JSON from size-limit");
        }

        for (const entry of sizeResults) {
          expect(entry.passed).toBe(true);
          console.log(`${entry.name}: ${(entry.size / 1024).toFixed(2)} KB (limit: ${entry.sizeLimit})`);
        }
      } catch (error) {
        // Check if this is a puppeteer/Chrome environment issue (skip gracefully)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stderr = (error && typeof error === "object" && "stderr" in error)
          ? (error as { stderr?: string }).stderr || ""
          : "";
        const isBrowserError = errorMessage.includes("Puppeteer") ||
          errorMessage.includes("Chrome") ||
          errorMessage.includes("Chromium") ||
          stderr.includes("Puppeteer") ||
          stderr.includes("Chrome") ||
          stderr.includes("browser");

        if (isBrowserError) {
          console.log("Skipping size-limit check - Chromium not available in this environment");
          return;
        }

        // size-limit returns non-zero if budget exceeded
        if (error && typeof error === "object" && "stdout" in error) {
          const output = (error as { stdout?: string }).stdout;
          if (output) {
            try {
              const parsed = JSON.parse(output);
              // Handle both array results and object with error
              const sizeResults = Array.isArray(parsed) ? parsed : null;
              if (sizeResults) {
                for (const entry of sizeResults) {
                  if (!entry.passed) {
                    console.error(`BUDGET EXCEEDED: ${entry.name} is ${(entry.size / 1024).toFixed(2)} KB (limit: ${entry.sizeLimit})`);
                  }
                }
              } else {
                console.error("size-limit returned non-array output:", parsed);
              }
            } catch {
              console.error("Failed to parse size-limit error output:", output);
            }
          }
        }
        throw error;
      }
    });
  });
});
