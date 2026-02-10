/**
 * Tests for support/tickets.ts — pure data and type guard utilities
 */
import { describe, it, expect } from "vitest";
import {
  SUPPORT_EMAIL,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_CATEGORY_SET,
  SUPPORT_PRIORITY_SET,
  SUPPORT_STATUS_SET,
  isSupportCategory,
  isSupportPriority,
  isSupportStatus,
  getSupportCategoryLabel,
  getSupportPriorityLabel,
  getSupportStatusLabel,
} from "./tickets";

describe("support/tickets", () => {
  describe("constants", () => {
    it("has valid support email", () => {
      expect(SUPPORT_EMAIL).toMatch(/@/);
    });

    it("has 7 support categories", () => {
      expect(SUPPORT_CATEGORIES).toHaveLength(7);
      const values = SUPPORT_CATEGORIES.map((c) => c.value);
      expect(values).toContain("billing");
      expect(values).toContain("technical");
      expect(values).toContain("other");
    });

    it("has 4 priority levels", () => {
      expect(SUPPORT_PRIORITIES).toHaveLength(4);
      const values = SUPPORT_PRIORITIES.map((p) => p.value);
      expect(values).toEqual(["low", "normal", "high", "urgent"]);
    });

    it("has 4 statuses", () => {
      expect(SUPPORT_STATUSES).toHaveLength(4);
      const values = SUPPORT_STATUSES.map((s) => s.value);
      expect(values).toEqual(["open", "pending", "resolved", "closed"]);
    });

    it("category/priority/status sets match arrays", () => {
      expect(SUPPORT_CATEGORY_SET.size).toBe(SUPPORT_CATEGORIES.length);
      expect(SUPPORT_PRIORITY_SET.size).toBe(SUPPORT_PRIORITIES.length);
      expect(SUPPORT_STATUS_SET.size).toBe(SUPPORT_STATUSES.length);
    });

    it("all categories have label and description", () => {
      for (const cat of SUPPORT_CATEGORIES) {
        expect(cat.label).toBeTruthy();
        expect(cat.description).toBeTruthy();
      }
    });
  });

  describe("type guards", () => {
    it("isSupportCategory accepts valid values", () => {
      expect(isSupportCategory("billing")).toBe(true);
      expect(isSupportCategory("bug")).toBe(true);
      expect(isSupportCategory("other")).toBe(true);
    });

    it("isSupportCategory rejects invalid values", () => {
      expect(isSupportCategory("invalid")).toBe(false);
      expect(isSupportCategory("")).toBe(false);
    });

    it("isSupportPriority accepts valid values", () => {
      expect(isSupportPriority("low")).toBe(true);
      expect(isSupportPriority("urgent")).toBe(true);
    });

    it("isSupportPriority rejects invalid values", () => {
      expect(isSupportPriority("critical")).toBe(false);
      expect(isSupportPriority("")).toBe(false);
    });

    it("isSupportStatus accepts valid values", () => {
      expect(isSupportStatus("open")).toBe(true);
      expect(isSupportStatus("closed")).toBe(true);
    });

    it("isSupportStatus rejects invalid values", () => {
      expect(isSupportStatus("archived")).toBe(false);
      expect(isSupportStatus("")).toBe(false);
    });
  });

  describe("label getters", () => {
    it("getSupportCategoryLabel returns correct labels", () => {
      expect(getSupportCategoryLabel("billing")).toBe("Billing & Payments");
      expect(getSupportCategoryLabel("technical")).toBe("Technical Issue");
      expect(getSupportCategoryLabel("other")).toBe("Other");
    });

    it("getSupportPriorityLabel returns correct labels", () => {
      expect(getSupportPriorityLabel("low")).toBe("Low");
      expect(getSupportPriorityLabel("urgent")).toBe("Urgent");
    });

    it("getSupportStatusLabel returns correct labels", () => {
      expect(getSupportStatusLabel("open")).toBe("Open");
      expect(getSupportStatusLabel("resolved")).toBe("Resolved");
    });
  });
});
