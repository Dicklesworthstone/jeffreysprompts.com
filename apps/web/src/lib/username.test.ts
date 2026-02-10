/**
 * Tests for username.ts — validation and normalization
 */
import { describe, it, expect } from "vitest";
import {
  USERNAME_REGEX,
  RESERVED_USERNAMES,
  isValidUsername,
  validateUsername,
  normalizeUsername,
} from "./username";

describe("username", () => {
  describe("USERNAME_REGEX", () => {
    it("accepts valid usernames", () => {
      expect(USERNAME_REGEX.test("abc")).toBe(true);
      expect(USERNAME_REGEX.test("user123")).toBe(true);
      expect(USERNAME_REGEX.test("my_name")).toBe(true);
      expect(USERNAME_REGEX.test("abcdefghijklmnopqrst")).toBe(true); // 20 chars
    });

    it("rejects usernames starting with number", () => {
      expect(USERNAME_REGEX.test("1abc")).toBe(false);
    });

    it("rejects usernames shorter than 3 chars", () => {
      expect(USERNAME_REGEX.test("ab")).toBe(false);
    });

    it("rejects usernames longer than 20 chars", () => {
      expect(USERNAME_REGEX.test("abcdefghijklmnopqrstu")).toBe(false); // 21 chars
    });

    it("rejects uppercase letters", () => {
      expect(USERNAME_REGEX.test("Abc")).toBe(false);
    });

    it("rejects hyphens and special chars", () => {
      expect(USERNAME_REGEX.test("my-name")).toBe(false);
      expect(USERNAME_REGEX.test("my.name")).toBe(false);
      expect(USERNAME_REGEX.test("my@name")).toBe(false);
    });
  });

  describe("RESERVED_USERNAMES", () => {
    it("includes common system routes", () => {
      expect(RESERVED_USERNAMES).toContain("admin");
      expect(RESERVED_USERNAMES).toContain("api");
      expect(RESERVED_USERNAMES).toContain("login");
    });

    it("includes common reserved words", () => {
      expect(RESERVED_USERNAMES).toContain("root");
      expect(RESERVED_USERNAMES).toContain("null");
      expect(RESERVED_USERNAMES).toContain("test");
    });
  });

  describe("isValidUsername", () => {
    it("accepts valid usernames", () => {
      expect(isValidUsername("jeffrey")).toBe(true);
      expect(isValidUsername("user_42")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidUsername("")).toBe(false);
    });

    it("rejects reserved usernames", () => {
      expect(isValidUsername("admin")).toBe(false);
      expect(isValidUsername("api")).toBe(false);
      expect(isValidUsername("root")).toBe(false);
    });

    it("rejects invalid format", () => {
      expect(isValidUsername("AB")).toBe(false);
      expect(isValidUsername("123abc")).toBe(false);
    });
  });

  describe("validateUsername", () => {
    it("returns valid for good usernames", () => {
      expect(validateUsername("jeffrey")).toEqual({ valid: true });
    });

    it("returns error for empty username", () => {
      const result = validateUsername("");
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("required");
    });

    it("returns error for too short", () => {
      const result = validateUsername("ab");
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("3 characters");
    });

    it("returns error for too long", () => {
      const result = validateUsername("a".repeat(21));
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("20 characters");
    });

    it("returns error for starting with number", () => {
      const result = validateUsername("1abc");
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("start with a letter");
    });

    it("returns error for invalid characters", () => {
      const result = validateUsername("my-name");
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("lowercase");
    });

    it("returns error for reserved username", () => {
      const result = validateUsername("admin");
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("reserved");
    });
  });

  describe("normalizeUsername", () => {
    it("lowercases", () => {
      expect(normalizeUsername("Jeffrey")).toBe("jeffrey");
    });

    it("trims whitespace", () => {
      expect(normalizeUsername("  jeffrey  ")).toBe("jeffrey");
    });

    it("lowercases and trims together", () => {
      expect(normalizeUsername("  Jeffrey  ")).toBe("jeffrey");
    });
  });
});
