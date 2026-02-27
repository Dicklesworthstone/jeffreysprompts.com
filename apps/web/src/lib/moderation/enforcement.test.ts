/**
 * Unit tests for enforcement module
 * @module lib/moderation/enforcement.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  enforceUserAccess,
  getSuspensionInfo,
  formatSuspensionEndDate,
  isBlockingAction,
  getActionDescription,
} from "./enforcement";
import { createModerationAction } from "./action-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStores() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_moderation_action_store__"];
  delete g["__jfp_moderation_appeal_store__"];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enforcement", () => {
  beforeEach(() => {
    clearStores();
  });

  // -----------------------------------------------------------------------
  // enforceUserAccess
  // -----------------------------------------------------------------------

  describe("enforceUserAccess", () => {
    it("allows access for clean user", () => {
      const result = enforceUserAccess("clean-user");
      expect(result.allowed).toBe(true);
      expect(result.status.status).toBe("active");
    });

    it("allows access with message for warned user", () => {
      createModerationAction({
        userId: "warned",
        actionType: "warning",
        reason: "spam",
        performedBy: "admin",
      });

      const result = enforceUserAccess("warned");
      expect(result.allowed).toBe(true);
      expect(result.message).toContain("warning");
    });

    it("blocks access for suspended user", () => {
      createModerationAction({
        userId: "suspended",
        actionType: "suspension",
        reason: "harassment",
        performedBy: "admin",
        durationDays: 7,
      });

      const result = enforceUserAccess("suspended");
      expect(result.allowed).toBe(false);
      expect(result.redirectTo).toBe("/suspended");
      expect(result.message).toContain("suspension");
    });

    it("blocks access for banned user", () => {
      createModerationAction({
        userId: "banned",
        actionType: "ban",
        reason: "hate_speech",
        performedBy: "admin",
      });

      const result = enforceUserAccess("banned");
      expect(result.allowed).toBe(false);
      expect(result.redirectTo).toBe("/suspended");
      expect(result.message).toContain("permanently banned");
    });

    it("includes reason in suspension message", () => {
      createModerationAction({
        userId: "sus",
        actionType: "suspension",
        reason: "spam",
        performedBy: "admin",
        durationDays: 3,
      });

      const result = enforceUserAccess("sus");
      expect(result.message).toContain("Spam");
    });
  });

  // -----------------------------------------------------------------------
  // getSuspensionInfo
  // -----------------------------------------------------------------------

  describe("getSuspensionInfo", () => {
    it("returns null for clean user", () => {
      expect(getSuspensionInfo("clean")).toBeNull();
    });

    it("returns info for suspended user", () => {
      createModerationAction({
        userId: "sus",
        actionType: "suspension",
        reason: "harassment",
        performedBy: "admin",
        durationDays: 7,
      });

      const info = getSuspensionInfo("sus");
      expect(info).not.toBeNull();
      expect(info?.isSuspended).toBe(true);
      expect(info?.isBanned).toBe(false);
      expect(info?.isPermanent).toBe(false);
      expect(info?.endsAt).toBeTruthy();
      expect(info?.timeRemaining).toBeTruthy();
    });

    it("returns info for banned user", () => {
      createModerationAction({
        userId: "banned",
        actionType: "ban",
        reason: "hate_speech",
        performedBy: "admin",
      });

      const info = getSuspensionInfo("banned");
      expect(info?.isBanned).toBe(true);
      expect(info?.isPermanent).toBe(true);
      expect(info?.endsAt).toBeNull();
    });

    it("marks indefinite suspension as permanent", () => {
      createModerationAction({
        userId: "indef",
        actionType: "indefinite_suspension",
        reason: "repeated_violations",
        performedBy: "admin",
      });

      const info = getSuspensionInfo("indef");
      expect(info?.isSuspended).toBe(true);
      expect(info?.isPermanent).toBe(true);
    });

    it("returns null for warned users (warnings are not suspensions)", () => {
      createModerationAction({
        userId: "warned",
        actionType: "warning",
        reason: "spam",
        performedBy: "admin",
      });

      const info = getSuspensionInfo("warned");
      expect(info).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // formatSuspensionEndDate
  // -----------------------------------------------------------------------

  describe("formatSuspensionEndDate", () => {
    it("returns 'Indefinite' for null", () => {
      expect(formatSuspensionEndDate(null)).toBe("Indefinite");
    });

    it("returns 'Indefinite' for undefined", () => {
      expect(formatSuspensionEndDate(undefined)).toBe("Indefinite");
    });

    it("returns 'Unknown' for invalid date", () => {
      expect(formatSuspensionEndDate("not-a-date")).toBe("Unknown");
    });

    it("formats valid date", () => {
      const result = formatSuspensionEndDate("2026-03-15T10:30:00Z");
      // Just verify it's a non-empty string with some date content
      expect(result.length).toBeGreaterThan(5);
      expect(result).not.toBe("Indefinite");
      expect(result).not.toBe("Unknown");
    });
  });

  // -----------------------------------------------------------------------
  // isBlockingAction
  // -----------------------------------------------------------------------

  describe("isBlockingAction", () => {
    it("returns true for blocking action types", () => {
      expect(isBlockingAction("suspension")).toBe(true);
      expect(isBlockingAction("indefinite_suspension")).toBe(true);
      expect(isBlockingAction("ban")).toBe(true);
    });

    it("returns false for non-blocking action types", () => {
      expect(isBlockingAction("warning")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getActionDescription
  // -----------------------------------------------------------------------

  describe("getActionDescription", () => {
    it("returns description for warning", () => {
      expect(getActionDescription("warning")).toContain("warning");
    });

    it("returns description for suspension with end date", () => {
      const desc = getActionDescription("suspension", "2026-12-01T00:00:00Z");
      expect(desc).toContain("temporarily suspended");
    });

    it("returns description for suspension without end date", () => {
      const desc = getActionDescription("suspension");
      expect(desc).toContain("temporarily suspended");
    });

    it("returns description for indefinite suspension", () => {
      expect(getActionDescription("indefinite_suspension")).toContain("indefinitely");
    });

    it("returns description for ban", () => {
      expect(getActionDescription("ban")).toContain("permanently banned");
    });
  });
});
