/**
 * Unit tests for cn utility
 * @module lib/utils.test
 */

import { describe, test, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  test("merges classes correctly", () => {
    const result = cn("text-sm", "font-bold");
    expect(result).toBe("text-sm font-bold");
  });

  test("handles conditional classes", () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn(
      "base-class",
      isActive && "active-class",
      isDisabled && "disabled-class"
    );

    expect(result).toBe("base-class active-class");
    expect(result).not.toContain("disabled-class");
  });

  test("deduplicates Tailwind classes - keeps last conflicting class", () => {
    const result = cn("text-red-500", "text-blue-500");
    // twMerge should keep only the last conflicting class
    expect(result).toBe("text-blue-500");
  });

  test("handles undefined and null", () => {
    const result = cn("valid", undefined, null, "also-valid");
    expect(result).toBe("valid also-valid");
  });

  test("handles arrays", () => {
    const result = cn(["text-sm", "font-bold"], "extra");
    expect(result).toBe("text-sm font-bold extra");
  });

  test("handles empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  test("handles false values", () => {
    const result = cn("base", false, "after");
    expect(result).toBe("base after");
  });

  test("handles padding conflict resolution", () => {
    // twMerge should resolve conflicting padding classes
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  test("handles margin conflict resolution", () => {
    const result = cn("m-4", "mt-2");
    // m-4 sets all margins, mt-2 overrides just top
    expect(result).toBe("m-4 mt-2");
  });

  test("handles complex class combinations", () => {
    const result = cn(
      "flex items-center",
      "bg-white dark:bg-black",
      "px-4 py-2",
      "rounded-lg"
    );
    expect(result).toBe("flex items-center bg-white dark:bg-black px-4 py-2 rounded-lg");
  });

  test("preserves non-conflicting classes", () => {
    const result = cn("text-lg font-bold", "text-red-500");
    expect(result).toBe("text-lg font-bold text-red-500");
  });
});
