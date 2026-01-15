import { describe, it, expect } from "bun:test";
import { tokenize, tokenizeRaw, ngrams, STOPWORDS } from "../../src/search/tokenize";

describe("tokenize", () => {
  it("should convert to lowercase", () => {
    const result = tokenize("Hello World");
    expect(result.every((t) => t === t.toLowerCase())).toBe(true);
  });

  it("should remove punctuation", () => {
    const result = tokenize("Hello, World! How are you?");
    expect(result.join(" ")).not.toContain(",");
    expect(result.join(" ")).not.toContain("!");
    expect(result.join(" ")).not.toContain("?");
  });

  it("should split hyphens", () => {
    const result = tokenize("code-review is important");
    expect(result).toContain("code");
    expect(result).toContain("review");
  });

  it("should remove stopwords", () => {
    const result = tokenize("the quick brown fox");
    expect(result).not.toContain("the");
    expect(result).toContain("quick");
    expect(result).toContain("brown");
    expect(result).toContain("fox");
  });

  it("should filter out single-character tokens", () => {
    const result = tokenize("a b c code");
    expect(result).not.toContain("a");
    expect(result).not.toContain("b");
    expect(result).not.toContain("c");
    expect(result).toContain("code");
  });

  it("should handle empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });

  it("should split on whitespace", () => {
    const result = tokenize("hello   world\ttab\nnewline");
    expect(result).toContain("hello");
    expect(result).toContain("world");
    expect(result).toContain("tab");
    expect(result).toContain("newline");
  });

  it("should preserve programming language symbols", () => {
    const result = tokenize("c++ c# .net node.js 1+1");
    expect(result).toContain("c++");
    expect(result).toContain("c#");
    expect(result).toContain("1+1");
    // .net -> net (dot removed)
    // node.js -> node js (dot removed)
  });
});

describe("tokenizeRaw", () => {
  it("should not remove stopwords", () => {
    const result = tokenizeRaw("the quick brown fox");
    expect(result).toContain("the");
    expect(result).toContain("quick");
  });

  it("should convert to lowercase", () => {
    const result = tokenizeRaw("Hello World");
    expect(result).toContain("hello");
    expect(result).toContain("world");
  });

  it("should preserve empty strings behavior", () => {
    const result = tokenizeRaw("");
    expect(result.filter((t) => t.length > 0)).toEqual([]);
  });
});

describe("ngrams", () => {
  it("should generate 2-grams by default", () => {
    const result = ngrams(["hello"]);
    expect(result).toContain("he");
    expect(result).toContain("el");
    expect(result).toContain("ll");
    expect(result).toContain("lo");
  });

  it("should handle tokens shorter than n", () => {
    const result = ngrams(["ab"], 3);
    // Token shorter than n should be included as-is
    expect(result).toContain("ab");
  });

  it("should generate custom n-grams", () => {
    const result = ngrams(["hello"], 3);
    expect(result).toContain("hel");
    expect(result).toContain("ell");
    expect(result).toContain("llo");
  });

  it("should handle multiple tokens", () => {
    const result = ngrams(["hi", "there"]);
    expect(result).toContain("hi");
    expect(result).toContain("th");
    expect(result).toContain("he");
  });

  it("should handle empty array", () => {
    const result = ngrams([]);
    expect(result).toEqual([]);
  });
});

describe("STOPWORDS", () => {
  it("should be a Set", () => {
    expect(STOPWORDS instanceof Set).toBe(true);
  });

  it("should contain common English stopwords", () => {
    expect(STOPWORDS.has("the")).toBe(true);
    expect(STOPWORDS.has("and")).toBe(true);
    expect(STOPWORDS.has("is")).toBe(true);
    expect(STOPWORDS.has("are")).toBe(true);
  });

  it("should not contain meaningful words", () => {
    expect(STOPWORDS.has("code")).toBe(false);
    expect(STOPWORDS.has("test")).toBe(false);
    expect(STOPWORDS.has("prompt")).toBe(false);
  });
});
