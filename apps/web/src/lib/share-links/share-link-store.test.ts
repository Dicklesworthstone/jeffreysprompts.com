import { describe, it, expect, beforeEach } from "vitest";
import {
  createShareLink,
  getShareLinkByCode,
  listShareLinks,
  revokeShareLink,
  recordShareLinkView,
  hashPassword,
  verifyPassword,
  updateShareLinkSettings,
} from "./share-link-store";

function clearStore() {
  const globalStore = globalThis as unknown as Record<string, unknown>;
  delete globalStore["__jfp_share_link_store__"];
}

describe("share-link-store", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("createShareLink", () => {
    it("creates a share link with a unique code", () => {
      const link = createShareLink({
        contentType: "prompt",
        contentId: "test-prompt-1",
      });

      expect(link.id).toBeDefined();
      expect(link.linkCode).toBeDefined();
      expect(link.linkCode.length).toBe(12);
      expect(link.isActive).toBe(true);
      expect(link.viewCount).toBe(0);
    });

    it("stores password hash when password is provided", () => {
      const link = createShareLink({
        contentType: "prompt",
        contentId: "test-prompt-1",
        password: "secret123",
      });

      expect(link.passwordHash).not.toBeNull();
      expect(link.passwordHash).toContain(":"); // salt:hash format
    });

    it("sets no password hash when password is omitted", () => {
      const link = createShareLink({
        contentType: "prompt",
        contentId: "test-prompt-1",
      });

      expect(link.passwordHash).toBeNull();
    });

    it("generates different codes for each link", () => {
      const link1 = createShareLink({ contentType: "prompt", contentId: "p1" });
      const link2 = createShareLink({ contentType: "prompt", contentId: "p2" });

      expect(link1.linkCode).not.toBe(link2.linkCode);
    });
  });

  describe("getShareLinkByCode", () => {
    it("retrieves a link by its code", () => {
      const created = createShareLink({
        contentType: "bundle",
        contentId: "bundle-1",
      });

      const found = getShareLinkByCode(created.linkCode);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("returns null for unknown codes", () => {
      expect(getShareLinkByCode("nonexistent")).toBeNull();
    });
  });

  describe("listShareLinks", () => {
    it("returns all active links", () => {
      createShareLink({ contentType: "prompt", contentId: "p1" });
      createShareLink({ contentType: "prompt", contentId: "p2" });

      const links = listShareLinks();
      expect(links).toHaveLength(2);
    });

    it("filters by userId", () => {
      createShareLink({ contentType: "prompt", contentId: "p1", userId: "user-1" });
      createShareLink({ contentType: "prompt", contentId: "p2", userId: "user-2" });

      const links = listShareLinks({ userId: "user-1" });
      expect(links).toHaveLength(1);
      expect(links[0].contentId).toBe("p1");
    });

    it("excludes inactive links by default", () => {
      const link = createShareLink({ contentType: "prompt", contentId: "p1" });
      revokeShareLink(link.linkCode);

      expect(listShareLinks()).toHaveLength(0);
      expect(listShareLinks({ includeInactive: true })).toHaveLength(1);
    });
  });

  describe("revokeShareLink", () => {
    it("deactivates a link", () => {
      const link = createShareLink({ contentType: "prompt", contentId: "p1" });
      const revoked = revokeShareLink(link.linkCode);

      expect(revoked?.isActive).toBe(false);
    });

    it("returns null for unknown code", () => {
      expect(revokeShareLink("nonexistent")).toBeNull();
    });
  });

  describe("recordShareLinkView", () => {
    it("increments view count", () => {
      const link = createShareLink({ contentType: "prompt", contentId: "p1" });
      recordShareLinkView({ linkId: link.id });
      recordShareLinkView({ linkId: link.id });

      const updated = getShareLinkByCode(link.linkCode);
      expect(updated?.viewCount).toBe(2);
    });

    it("returns null for unknown link ID", () => {
      const view = recordShareLinkView({ linkId: "nonexistent" });
      expect(view).toBeNull();
    });
  });

  describe("hashPassword + verifyPassword", () => {
    it("verifies correct password", () => {
      const hash = hashPassword("my-secret");
      expect(verifyPassword("my-secret", hash)).toBe(true);
    });

    it("rejects incorrect password", () => {
      const hash = hashPassword("my-secret");
      expect(verifyPassword("wrong-password", hash)).toBe(false);
    });

    it("generates unique salts per hash", () => {
      const hash1 = hashPassword("same-password");
      const hash2 = hashPassword("same-password");
      expect(hash1).not.toBe(hash2); // Different salts
    });

    it("returns true when no password hash is set", () => {
      expect(verifyPassword("anything", null)).toBe(true);
      expect(verifyPassword("anything", undefined)).toBe(true);
    });
  });

  describe("updateShareLinkSettings", () => {
    it("updates password", () => {
      const link = createShareLink({ contentType: "prompt", contentId: "p1" });
      const updated = updateShareLinkSettings({
        code: link.linkCode,
        password: "new-pass",
      });

      expect(updated?.passwordHash).not.toBeNull();
      expect(verifyPassword("new-pass", updated?.passwordHash ?? null)).toBe(true);
    });

    it("removes password when set to null", () => {
      const link = createShareLink({
        contentType: "prompt",
        contentId: "p1",
        password: "old-pass",
      });

      const updated = updateShareLinkSettings({
        code: link.linkCode,
        password: null,
      });

      expect(updated?.passwordHash).toBeNull();
    });

    it("returns null for unknown code", () => {
      expect(updateShareLinkSettings({ code: "nonexistent" })).toBeNull();
    });
  });
});
