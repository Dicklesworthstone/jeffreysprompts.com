/**
 * Unit tests for appeal-store
 * @module lib/moderation/appeal-store.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  canAppealAction,
  createAppeal,
  getAppeal,
  getAppealByActionId,
  listAppeals,
  updateAppealStatus,
  getAppealStats,
  getUserAppeals,
  getAppealStatusLabel,
  APPEAL_STATUSES,
  APPEAL_SUBMISSION_WINDOW_DAYS,
  APPEAL_REVIEW_DEADLINE_DAYS,
} from "./appeal-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_moderation_appeal_store__"];
}

function seedAppeal(overrides?: Record<string, unknown>) {
  return createAppeal({
    actionId: `action-${crypto.randomUUID().slice(0, 8)}`,
    userId: `user-${crypto.randomUUID().slice(0, 8)}`,
    explanation: "I believe this was a mistake.",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("appeal-store", () => {
  beforeEach(() => {
    clearStore();
  });

  // -----------------------------------------------------------------------
  // Constants & labels
  // -----------------------------------------------------------------------

  describe("getAppealStatusLabel", () => {
    it("returns label for known statuses", () => {
      expect(getAppealStatusLabel("pending")).toBe("Pending Review");
      expect(getAppealStatusLabel("under_review")).toBe("Under Review");
      expect(getAppealStatusLabel("approved")).toBe("Approved");
      expect(getAppealStatusLabel("denied")).toBe("Denied");
    });
  });

  describe("APPEAL_STATUSES", () => {
    it("has all four statuses", () => {
      expect(APPEAL_STATUSES).toHaveLength(4);
    });
  });

  describe("constants", () => {
    it("exports expected window values", () => {
      expect(APPEAL_SUBMISSION_WINDOW_DAYS).toBe(7);
      expect(APPEAL_REVIEW_DEADLINE_DAYS).toBe(14);
    });
  });

  // -----------------------------------------------------------------------
  // canAppealAction
  // -----------------------------------------------------------------------

  describe("canAppealAction", () => {
    it("returns true for recent action with no prior appeal", () => {
      const result = canAppealAction("action-1", new Date().toISOString());
      expect(result.canAppeal).toBe(true);
    });

    it("returns false when appeal already exists", () => {
      seedAppeal({ actionId: "action-1" });
      const result = canAppealAction("action-1", new Date().toISOString());
      expect(result.canAppeal).toBe(false);
      expect(result.reason).toContain("already been submitted");
    });

    it("returns false when outside submission window", () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const result = canAppealAction("action-old", oldDate);
      expect(result.canAppeal).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("returns false for invalid action date", () => {
      const result = canAppealAction("action-bad", "invalid-date");
      expect(result.canAppeal).toBe(false);
      expect(result.reason).toContain("Invalid");
    });
  });

  // -----------------------------------------------------------------------
  // createAppeal
  // -----------------------------------------------------------------------

  describe("createAppeal", () => {
    it("creates an appeal with correct fields", () => {
      const result = createAppeal({
        actionId: "action-1",
        userId: "user-1",
        userEmail: "user@example.com",
        userName: "User One",
        explanation: "This was a misunderstanding.",
      });

      expect("error" in result).toBe(false);
      if (!("error" in result)) {
        expect(result.id).toBeTruthy();
        expect(result.accessToken).toMatch(/^[a-f0-9]{64}$/);
        expect(result.actionId).toBe("action-1");
        expect(result.userId).toBe("user-1");
        expect(result.userEmail).toBe("user@example.com");
        expect(result.userName).toBe("User One");
        expect(result.explanation).toBe("This was a misunderstanding.");
        expect(result.status).toBe("pending");
        expect(result.submittedAt).toBeTruthy();
        expect(result.reviewedAt).toBeNull();
        expect(result.reviewedBy).toBeNull();
        expect(result.adminResponse).toBeNull();
        expect(result.deadlineAt).toBeTruthy();
      }
    });

    it("sets review deadline correctly", () => {
      const result = seedAppeal();
      if ("error" in result) throw new Error("unexpected");

      const submitted = new Date(result.submittedAt).getTime();
      const deadline = new Date(result.deadlineAt).getTime();
      const expectedMs = APPEAL_REVIEW_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
      expect(deadline - submitted).toBeCloseTo(expectedMs, -3);
    });

    it("defaults optional fields to null", () => {
      const result = seedAppeal();
      if ("error" in result) throw new Error("unexpected");
      expect(result.userEmail).toBeNull();
      expect(result.userName).toBeNull();
    });

    it("prevents duplicate appeal for same action", () => {
      seedAppeal({ actionId: "action-1" });
      const result = createAppeal({
        actionId: "action-1",
        userId: "user-2",
        explanation: "Another try.",
      });

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("already been submitted");
      }
    });
  });

  // -----------------------------------------------------------------------
  // getAppeal / getAppealByActionId
  // -----------------------------------------------------------------------

  describe("getAppeal", () => {
    it("returns appeal by ID", () => {
      const appeal = seedAppeal();
      if ("error" in appeal) throw new Error("unexpected");
      expect(getAppeal(appeal.id)?.id).toBe(appeal.id);
    });

    it("returns null for unknown ID", () => {
      expect(getAppeal("nope")).toBeNull();
    });
  });

  describe("getAppealByActionId", () => {
    it("returns appeal by action ID", () => {
      seedAppeal({ actionId: "action-1" });
      const found = getAppealByActionId("action-1");
      expect(found?.actionId).toBe("action-1");
    });

    it("returns null for unknown action ID", () => {
      expect(getAppealByActionId("nope")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // listAppeals
  // -----------------------------------------------------------------------

  describe("listAppeals", () => {
    it("returns all appeals", () => {
      seedAppeal();
      seedAppeal();
      expect(listAppeals()).toHaveLength(2);
    });

    it("filters by status", () => {
      const appeal = seedAppeal();
      seedAppeal();
      if ("error" in appeal) throw new Error("unexpected");
      updateAppealStatus({ appealId: appeal.id, status: "approved" });

      expect(listAppeals({ status: "pending" })).toHaveLength(1);
      expect(listAppeals({ status: "approved" })).toHaveLength(1);
    });

    it("returns all when status is 'all'", () => {
      seedAppeal();
      const a2 = seedAppeal();
      if ("error" in a2) throw new Error("unexpected");
      updateAppealStatus({ appealId: a2.id, status: "denied" });

      expect(listAppeals({ status: "all" })).toHaveLength(2);
    });

    it("filters by userId", () => {
      seedAppeal({ userId: "u1" });
      seedAppeal({ userId: "u2" });
      expect(listAppeals({ userId: "u1" })).toHaveLength(1);
    });

    it("respects pagination", () => {
      for (let i = 0; i < 5; i++) seedAppeal();
      const page1 = listAppeals({ limit: 2, page: 1 });
      const page2 = listAppeals({ limit: 2, page: 2 });
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  // -----------------------------------------------------------------------
  // updateAppealStatus
  // -----------------------------------------------------------------------

  describe("updateAppealStatus", () => {
    it("updates status to approved", () => {
      const appeal = seedAppeal();
      if ("error" in appeal) throw new Error("unexpected");
      const updated = updateAppealStatus({
        appealId: appeal.id,
        status: "approved",
        reviewedBy: "admin-1",
        adminResponse: "Approved after review.",
      });

      expect(updated?.status).toBe("approved");
      expect(updated?.reviewedBy).toBe("admin-1");
      expect(updated?.reviewedAt).toBeTruthy();
      expect(updated?.adminResponse).toBe("Approved after review.");
    });

    it("updates status to denied", () => {
      const appeal = seedAppeal();
      if ("error" in appeal) throw new Error("unexpected");
      const updated = updateAppealStatus({
        appealId: appeal.id,
        status: "denied",
        adminResponse: "Violation confirmed.",
      });

      expect(updated?.status).toBe("denied");
    });

    it("transitions to under_review", () => {
      const appeal = seedAppeal();
      if ("error" in appeal) throw new Error("unexpected");
      const updated = updateAppealStatus({
        appealId: appeal.id,
        status: "under_review",
        reviewedBy: "admin-1",
      });

      expect(updated?.status).toBe("under_review");
    });

    it("returns null for unknown appeal", () => {
      expect(updateAppealStatus({ appealId: "nope", status: "approved" })).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getAppealStats
  // -----------------------------------------------------------------------

  describe("getAppealStats", () => {
    it("returns zeroed stats when empty", () => {
      const stats = getAppealStats();
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.underReview).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.denied).toBe(0);
      expect(stats.overdueCount).toBe(0);
    });

    it("counts appeals by status", () => {
      seedAppeal(); // pending
      const a2 = seedAppeal();
      if ("error" in a2) throw new Error("unexpected");
      updateAppealStatus({ appealId: a2.id, status: "approved" });
      const a3 = seedAppeal();
      if ("error" in a3) throw new Error("unexpected");
      updateAppealStatus({ appealId: a3.id, status: "denied" });
      const a4 = seedAppeal();
      if ("error" in a4) throw new Error("unexpected");
      updateAppealStatus({ appealId: a4.id, status: "under_review" });

      const stats = getAppealStats();
      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.denied).toBe(1);
      expect(stats.underReview).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // getUserAppeals
  // -----------------------------------------------------------------------

  describe("getUserAppeals", () => {
    it("returns all appeals for a user", () => {
      seedAppeal({ userId: "u1", actionId: "a1" });
      seedAppeal({ userId: "u1", actionId: "a2" });
      seedAppeal({ userId: "u2", actionId: "a3" });

      const appeals = getUserAppeals("u1");
      expect(appeals).toHaveLength(2);
      expect(appeals.every((a) => a.userId === "u1")).toBe(true);
    });

    it("returns empty for user with no appeals", () => {
      expect(getUserAppeals("nobody")).toEqual([]);
    });
  });
});
