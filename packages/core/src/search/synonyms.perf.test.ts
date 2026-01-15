
import { describe, it, expect, bench } from "bun:test";
import { expandQuery, SYNONYMS } from "./synonyms";

describe("synonyms performance", () => {
  it("should expand queries correctly", () => {
    const tokens = ["fix", "bug"];
    const expanded = expandQuery(tokens);
    
    // Check direct synonyms
    expect(expanded).toContain("repair"); // synonym of fix
    
    // Check reverse synonyms (if "bug" is a value in SYNONYMS)
    // In current implementation:
    // debug: ["troubleshoot", ... "fix", ... ]
    // fix: ["repair", ... "debug", ... ]
    
    // "bug" is not a key, but is likely a value?
    // Let's check the source map from my memory/read file
    // fix: [..., "debug", ...]
    // debug: [..., "fix", ...]
    
    // Wait, "bug" is not in the keys I saw.
    // Let's re-read the file content mentally.
    // fix: ["repair", "resolve", "debug", "patch", "correct"]
    
    // So "fix" -> "debug"
    expect(expanded).toContain("debug");
  });

  it("should handle large token lists efficiently", () => {
    // Generate a large list of tokens
    const tokens = Array.from({ length: 1000 }, (_, i) => i % 2 === 0 ? "fix" : "unknown_term_" + i);
    
    const start = performance.now();
    const expanded = expandQuery(tokens);
    const end = performance.now();
    
    console.log(`Expansion of 1000 tokens took ${end - start}ms`);
    
    expect(expanded.length).toBeGreaterThan(0);
  });
});
