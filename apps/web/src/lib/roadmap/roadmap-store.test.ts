/**
 * Unit tests for roadmap-store
 * @module lib/roadmap/roadmap-store.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getFeatures,
  getFeature,
  getRoadmapByStatus,
  hasUserVoted,
  getFeatureComments,
  submitFeature,
  voteForFeature,
  unvoteFeature,
  addComment,
  updateFeatureStatus,
  getRoadmapStats,
  STATUS_CONFIG,
} from "./roadmap-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_roadmap_store__"];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("roadmap-store", () => {
  beforeEach(() => {
    clearStore();
  });

  // -----------------------------------------------------------------------
  // Seed data
  // -----------------------------------------------------------------------

  describe("seed data", () => {
    it("initializes with seed feature requests", () => {
      const features = getFeatures();
      expect(features.length).toBeGreaterThan(0);
    });

    it("seed includes features across multiple statuses", () => {
      const roadmap = getRoadmapByStatus();
      expect(roadmap.shipped.length).toBeGreaterThan(0);
      expect(roadmap.planned.length).toBeGreaterThan(0);
      expect(roadmap.in_progress.length).toBeGreaterThan(0);
    });

    it("seed includes comments", () => {
      const comments = getFeatureComments("feat-002");
      expect(comments.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // getFeatures
  // -----------------------------------------------------------------------

  describe("getFeatures", () => {
    it("returns all features sorted by votes by default", () => {
      const features = getFeatures();
      for (let i = 1; i < features.length; i++) {
        expect(features[i - 1].voteCount).toBeGreaterThanOrEqual(features[i].voteCount);
      }
    });

    it("filters by single status", () => {
      const planned = getFeatures({ status: "planned" });
      expect(planned.every((f) => f.status === "planned")).toBe(true);
    });

    it("filters by multiple statuses", () => {
      const active = getFeatures({ status: ["planned", "in_progress"] });
      expect(active.every((f) => f.status === "planned" || f.status === "in_progress")).toBe(true);
    });

    it("sorts by newest", () => {
      const newest = getFeatures({ sortBy: "newest" });
      for (let i = 1; i < newest.length; i++) {
        expect(new Date(newest[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(newest[i].createdAt).getTime()
        );
      }
    });

    it("sorts by oldest", () => {
      const oldest = getFeatures({ sortBy: "oldest" });
      for (let i = 1; i < oldest.length; i++) {
        expect(new Date(oldest[i - 1].createdAt).getTime()).toBeLessThanOrEqual(
          new Date(oldest[i].createdAt).getTime()
        );
      }
    });

    it("respects limit", () => {
      const limited = getFeatures({ limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // getFeature
  // -----------------------------------------------------------------------

  describe("getFeature", () => {
    it("returns feature by ID", () => {
      const feature = getFeature("feat-001");
      expect(feature).not.toBeNull();
      expect(feature?.title).toBe("Dark Mode Support");
    });

    it("returns null for unknown ID", () => {
      expect(getFeature("nope")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getRoadmapByStatus
  // -----------------------------------------------------------------------

  describe("getRoadmapByStatus", () => {
    it("groups features by status", () => {
      const roadmap = getRoadmapByStatus();
      expect(roadmap.under_review).toBeDefined();
      expect(roadmap.planned).toBeDefined();
      expect(roadmap.in_progress).toBeDefined();
      expect(roadmap.shipped).toBeDefined();
      expect(roadmap.declined).toBeDefined();
    });

    it("sorts each group by votes descending", () => {
      const roadmap = getRoadmapByStatus();
      for (const status of Object.keys(roadmap) as Array<keyof typeof roadmap>) {
        const group = roadmap[status];
        for (let i = 1; i < group.length; i++) {
          expect(group[i - 1].voteCount).toBeGreaterThanOrEqual(group[i].voteCount);
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // submitFeature
  // -----------------------------------------------------------------------

  describe("submitFeature", () => {
    it("creates a new feature request", () => {
      const feature = submitFeature({
        title: "New Feature",
        description: "Please add this.",
      });

      expect(feature.id).toBeTruthy();
      expect(feature.title).toBe("New Feature");
      expect(feature.description).toBe("Please add this.");
      expect(feature.status).toBe("under_review");
      expect(feature.voteCount).toBe(0);
      expect(feature.commentCount).toBe(0);
    });

    it("auto-votes for submitter", () => {
      const feature = submitFeature({
        title: "My Feature",
        description: "Description.",
        submittedBy: "user-1",
      });

      expect(hasUserVoted(feature.id, "user-1")).toBe(true);
    });

    it("does not auto-vote when no submittedBy", () => {
      const feature = submitFeature({
        title: "Anonymous Feature",
        description: "No user.",
      });
      expect(feature.voteCount).toBe(0);
    });

    it("stores optional fields", () => {
      const feature = submitFeature({
        title: "Full Feature",
        description: "Full description.",
        useCase: "Testing",
        submittedBy: "u1",
        submittedByName: "User One",
      });
      expect(feature.useCase).toBe("Testing");
      expect(feature.submittedBy).toBe("u1");
      expect(feature.submittedByName).toBe("User One");
    });

    it("is retrievable after creation", () => {
      const feature = submitFeature({ title: "Retrieve Me", description: "Test" });
      expect(getFeature(feature.id)).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Voting
  // -----------------------------------------------------------------------

  describe("voteForFeature", () => {
    it("increments vote count", () => {
      const feature = submitFeature({ title: "Vote Test", description: "Test" });
      const initialVotes = feature.voteCount;

      const result = voteForFeature(feature.id, "voter-1");
      expect(result.success).toBe(true);
      expect(result.voteCount).toBe(initialVotes + 1);
    });

    it("prevents duplicate voting", () => {
      const feature = submitFeature({ title: "Dup Vote", description: "Test" });
      voteForFeature(feature.id, "voter-1");
      const result = voteForFeature(feature.id, "voter-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Already voted");
    });

    it("prevents duplicate voting after a cookie reset when the client fingerprint matches", () => {
      const feature = submitFeature({ title: "Fingerprint Vote", description: "Test" });
      voteForFeature(feature.id, "voter-1", { clientFingerprint: "client-1" });
      const result = voteForFeature(feature.id, "voter-2", { clientFingerprint: "client-1" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Already voted");
    });

    it("returns error for nonexistent feature", () => {
      const result = voteForFeature("nope", "voter-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("unvoteFeature", () => {
    it("decrements vote count", () => {
      const feature = submitFeature({ title: "Unvote Test", description: "Test" });
      voteForFeature(feature.id, "voter-1");
      const storedFeature = getFeature(feature.id);
      expect(storedFeature).not.toBeNull();
      if (!storedFeature) {
        throw new Error("Expected feature to exist after voting");
      }
      const afterVote = storedFeature.voteCount;

      const result = unvoteFeature(feature.id, "voter-1");
      expect(result.success).toBe(true);
      expect(result.voteCount).toBe(afterVote - 1);
    });

    it("returns error when no vote to remove", () => {
      const feature = submitFeature({ title: "No Vote", description: "Test" });
      const result = unvoteFeature(feature.id, "nobody");
      expect(result.success).toBe(false);
      expect(result.error).toContain("No vote");
    });

    it("does not let a different anonymous user remove a vote just because the fingerprint matches", () => {
      const feature = submitFeature({ title: "Fingerprint Unvote", description: "Test" });
      voteForFeature(feature.id, "voter-1", { clientFingerprint: "client-1" });
      const result = unvoteFeature(feature.id, "new-user-id", {
        clientFingerprint: "client-1",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("No vote");
      expect(hasUserVoted(feature.id, "voter-1")).toBe(true);
      expect(getFeature(feature.id)?.voteCount).toBe(1);
    });

    it("does not go below 0", () => {
      const feature = submitFeature({ title: "Zero", description: "Test", submittedBy: "u1" });
      unvoteFeature(feature.id, "u1");
      const storedFeature = getFeature(feature.id);
      expect(storedFeature).not.toBeNull();
      if (!storedFeature) {
        throw new Error("Expected feature to exist after unvoting");
      }
      expect(storedFeature.voteCount).toBeGreaterThanOrEqual(0);
    });

    it("returns error for nonexistent feature", () => {
      expect(unvoteFeature("nope", "u1").success).toBe(false);
    });
  });

  describe("hasUserVoted", () => {
    it("returns false when user has not voted", () => {
      const feature = submitFeature({ title: "Check", description: "Test" });
      expect(hasUserVoted(feature.id, "non-voter")).toBe(false);
    });

    it("returns true after voting", () => {
      const feature = submitFeature({ title: "Check", description: "Test" });
      voteForFeature(feature.id, "voter-1");
      expect(hasUserVoted(feature.id, "voter-1")).toBe(true);
    });

    it("returns false after unvoting", () => {
      const feature = submitFeature({ title: "Check", description: "Test" });
      voteForFeature(feature.id, "voter-1");
      unvoteFeature(feature.id, "voter-1");
      expect(hasUserVoted(feature.id, "voter-1")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Comments
  // -----------------------------------------------------------------------

  describe("addComment", () => {
    it("adds a comment to a feature", () => {
      const feature = submitFeature({ title: "Comment Test", description: "Test" });
      const comment = addComment({
        featureId: feature.id,
        userId: "u1",
        userName: "User One",
        content: "This would be great!",
      });

      expect(comment).not.toBeNull();
      expect(comment?.content).toBe("This would be great!");
      expect(comment?.isOfficial).toBe(false);
    });

    it("increments comment count", () => {
      const feature = submitFeature({ title: "Count Test", description: "Test" });
      addComment({ featureId: feature.id, userId: "u1", userName: "U", content: "Comment" });
      expect(getFeature(feature.id)?.commentCount).toBe(1);
    });

    it("supports official comments", () => {
      const feature = submitFeature({ title: "Official", description: "Test" });
      const comment = addComment({
        featureId: feature.id,
        userId: "admin",
        userName: "Admin",
        content: "We are working on this!",
        isOfficial: true,
      });
      expect(comment?.isOfficial).toBe(true);
    });

    it("returns null for nonexistent feature", () => {
      expect(addComment({
        featureId: "nope",
        userId: "u1",
        userName: "U",
        content: "Test",
      })).toBeNull();
    });
  });

  describe("getFeatureComments", () => {
    it("returns comments for a feature", () => {
      const feature = submitFeature({ title: "Comments", description: "Test" });
      addComment({ featureId: feature.id, userId: "u1", userName: "U1", content: "First" });

      const comments = getFeatureComments(feature.id);
      expect(comments.length).toBeGreaterThanOrEqual(1);
      expect(comments.some((c) => c.content === "First")).toBe(true);
    });

    it("sorts comments chronologically", () => {
      // Use seed data which has pre-set timestamps
      const comments = getFeatureComments("feat-002");
      expect(comments.length).toBeGreaterThan(0);
      for (let i = 1; i < comments.length; i++) {
        expect(new Date(comments[i - 1].createdAt).getTime()).toBeLessThanOrEqual(
          new Date(comments[i].createdAt).getTime()
        );
      }
    });

    it("returns empty array for feature with no comments", () => {
      const feature = submitFeature({ title: "No Comments", description: "Test" });
      expect(getFeatureComments(feature.id)).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // updateFeatureStatus
  // -----------------------------------------------------------------------

  describe("updateFeatureStatus", () => {
    it("updates feature status", () => {
      const feature = submitFeature({ title: "Status Test", description: "Test" });
      const updated = updateFeatureStatus(feature.id, "planned");
      expect(updated?.status).toBe("planned");
    });

    it("sets statusNote when provided", () => {
      const feature = submitFeature({ title: "Note Test", description: "Test" });
      const updated = updateFeatureStatus(feature.id, "declined", {
        statusNote: "Not feasible at this time.",
      });
      expect(updated?.statusNote).toBe("Not feasible at this time.");
    });

    it("sets plannedQuarter when provided", () => {
      const feature = submitFeature({ title: "Quarter Test", description: "Test" });
      const updated = updateFeatureStatus(feature.id, "planned", {
        plannedQuarter: "Q3 2026",
      });
      expect(updated?.plannedQuarter).toBe("Q3 2026");
    });

    it("sets shippedAt when status is shipped", () => {
      const feature = submitFeature({ title: "Ship Test", description: "Test" });
      const updated = updateFeatureStatus(feature.id, "shipped");
      expect(updated?.shippedAt).toBeTruthy();
    });

    it("does not set shippedAt for non-shipped status", () => {
      const feature = submitFeature({ title: "Not Shipped", description: "Test" });
      const updated = updateFeatureStatus(feature.id, "planned");
      expect(updated?.shippedAt).toBeUndefined();
    });

    it("returns null for unknown feature", () => {
      expect(updateFeatureStatus("nope", "planned")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getRoadmapStats
  // -----------------------------------------------------------------------

  describe("getRoadmapStats", () => {
    it("returns correct totals from seed data", () => {
      const stats = getRoadmapStats();
      expect(stats.totalFeatures).toBeGreaterThan(0);
      expect(stats.totalVotes).toBeGreaterThan(0);
      expect(stats.shipped + stats.planned + stats.inProgress + stats.underReview + stats.declined).toBe(
        stats.totalFeatures
      );
    });

    it("updates after adding features", () => {
      const before = getRoadmapStats();
      submitFeature({ title: "Extra", description: "Test" });
      const after = getRoadmapStats();
      expect(after.totalFeatures).toBe(before.totalFeatures + 1);
      expect(after.underReview).toBe(before.underReview + 1);
    });
  });

  // -----------------------------------------------------------------------
  // STATUS_CONFIG export
  // -----------------------------------------------------------------------

  describe("STATUS_CONFIG", () => {
    it("has config for all statuses", () => {
      expect(STATUS_CONFIG.under_review).toBeDefined();
      expect(STATUS_CONFIG.planned).toBeDefined();
      expect(STATUS_CONFIG.in_progress).toBeDefined();
      expect(STATUS_CONFIG.shipped).toBeDefined();
      expect(STATUS_CONFIG.declined).toBeDefined();
    });

    it("each config has label and color", () => {
      for (const config of Object.values(STATUS_CONFIG)) {
        expect(config.label).toBeTruthy();
        expect(config.color).toBeTruthy();
        expect(config.description).toBeTruthy();
      }
    });
  });
});
