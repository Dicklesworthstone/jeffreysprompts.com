import { describe, it, expect } from "bun:test";
import {
  scorePrompt,
  scoreAll,
  buildScorerIndex,
  searchScorerIndex,
  FIELD_WEIGHTS,
} from "../../src/search/scorer";
import type { Prompt } from "../../src/prompts/types";

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: overrides.id ?? "test-prompt",
    title: overrides.title ?? "Test Prompt",
    description: overrides.description ?? "A test prompt",
    category: overrides.category ?? "ideation",
    tags: overrides.tags ?? ["testing"],
    author: "test",
    version: "1.0.0",
    created: "2025-01-01",
    content: overrides.content ?? "Some prompt content here.",
  };
}

// ---------------------------------------------------------------------------
// Exact matching
// ---------------------------------------------------------------------------

describe("exact matching", () => {
  it("exact title word → full title weight", () => {
    const r = scorePrompt(makePrompt({ title: "Robot Mode Maker" }), "robot");
    expect(r).not.toBeNull();
    expect(r!.score).toBe(FIELD_WEIGHTS.title);
    expect(r!.matchedFields).toContain("title");
  });

  it("exact tag token → full tag weight", () => {
    const r = scorePrompt(
      makePrompt({ tags: ["brainstorming", "creative"] }),
      "brainstorming",
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBe(FIELD_WEIGHTS.tags);
    expect(r!.matchedFields).toContain("tags");
  });

  it("exact id token → full id weight", () => {
    const r = scorePrompt(makePrompt({ id: "idea-wizard" }), "idea");
    expect(r).not.toBeNull();
    expect(r!.score).toBe(FIELD_WEIGHTS.id);
  });
});

// ---------------------------------------------------------------------------
// Prefix matching (proportional)
// ---------------------------------------------------------------------------

describe("prefix matching", () => {
  it("prefix-matches title word proportionally", () => {
    const r = scorePrompt(
      makePrompt({ title: "The Robot-Mode Maker" }),
      "rob",
    );
    expect(r).not.toBeNull();
    // 10 * (0.3 + 0.65 * 3/5) = 10 * 0.69 = 6.9
    expect(r!.score).toBeCloseTo(6.9, 1);
    expect(r!.matchedFields).toContain("title");
  });

  it("longer prefix scores higher than shorter prefix", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const short = scorePrompt(p, "ro")!;
    const long = scorePrompt(p, "robo")!;
    expect(long.score).toBeGreaterThan(short.score);
  });

  it("near-complete prefix ≈ exact score", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const prefix = scorePrompt(p, "robo")!;
    const exact = scorePrompt(p, "robot")!;
    expect(prefix.score).toBeGreaterThan(exact.score * 0.8);
  });

  it("short tokens (<=3 chars) prefix-eligible at any position", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const multi = scorePrompt(p, "rob mode")!;
    const single = scorePrompt(p, "rob")!;
    expect(multi.score).toBeGreaterThan(single.score);
  });
});

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

describe("fuzzy matching", () => {
  it("tolerates 1 edit for tokens >= 4 chars", () => {
    const r = scorePrompt(
      makePrompt({ title: "Robot Mode Maker" }),
      "robor",
    );
    expect(r).not.toBeNull();
    expect(r!.matchedFields).toContain("title");
  });

  it("tolerates 2 edits for tokens >= 7 chars", () => {
    const r = scorePrompt(
      makePrompt({ tags: ["brainstorming"] }),
      "brainstrming",
    );
    expect(r).not.toBeNull();
    expect(r!.matchedFields).toContain("tags");
  });

  it("does NOT fuzzy-match tokens < 4 chars", () => {
    const r = scorePrompt(
      makePrompt({
        id: "xyz-only",
        title: "XYZ Only",
        tags: [],
        description: "nothing",
        content: "nothing",
      }),
      "xya",
    );
    expect(r).toBeNull();
  });

  it("fuzzy < prefix < exact in score", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const exact = scorePrompt(p, "robot")!.score;
    const prefix = scorePrompt(p, "robo")!.score;
    const fuzzy = scorePrompt(p, "robor")!.score;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(fuzzy);
  });
});

// ---------------------------------------------------------------------------
// Substring matching
// ---------------------------------------------------------------------------

describe("substring matching", () => {
  it("matches in raw field text", () => {
    const r = scorePrompt(
      makePrompt({
        id: "other-id",
        title: "Other Title",
        tags: ["testing"],
        description: "unrelated",
        content: "unrelated",
      }),
      "sting",
    );
    expect(r).not.toBeNull();
    expect(r!.matchedFields).toContain("tags");
  });

  it("substring < exact", () => {
    const substr = scorePrompt(
      makePrompt({ tags: ["xyztesting"] }),
      "xyztest",
    )!.score;
    const exact = scorePrompt(
      makePrompt({ tags: ["xyztest"] }),
      "xyztest",
    )!.score;
    expect(exact).toBeGreaterThan(substr);
  });
});

// ---------------------------------------------------------------------------
// Acronym matching
// ---------------------------------------------------------------------------

describe("acronym matching", () => {
  it("matches title initials", () => {
    const r = scorePrompt(
      makePrompt({ title: "Robot Mode Maker" }),
      "rmm",
    );
    expect(r).not.toBeNull();
    expect(r!.matchedFields).toContain("title");
  });

  it("requires >= 2 characters", () => {
    const r = scorePrompt(
      makePrompt({
        id: "z-thing",
        title: "Zebra",
        tags: [],
        description: "n",
        content: "n",
      }),
      "z",
    );
    // Single-char acronym should not match via acronym bonus
    // (might still match via prefix)
    // "z" goes through tokenize which keeps single chars in ALLOWLIST
    // but "z" is not in ALLOWLIST (only c,r,v,x,k), so tokenize drops it
    // rawQueryNormalized = "z", titleAcronym = "z", but len < 2 → no acronym bonus
    // No token matches either → null
    expect(r).toBeNull();
  });

  it("case-insensitive", () => {
    const r = scorePrompt(
      makePrompt({ title: "Bug Hunter" }),
      "BH",
    );
    expect(r).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Exact-ID boost
// ---------------------------------------------------------------------------

describe("exact-ID boost", () => {
  it("query matching full ID gets massive bonus", () => {
    const p = makePrompt({ id: "idea-wizard", title: "The Idea Wizard" });
    const exactId = scorePrompt(p, "idea-wizard")!;
    const partialId = scorePrompt(p, "idea")!;
    expect(exactId.score).toBeGreaterThan(partialId.score * 3);
  });

  it("works with spaces instead of hyphens", () => {
    const p = makePrompt({ id: "idea-wizard", title: "The Idea Wizard" });
    const r = scorePrompt(p, "idea wizard")!;
    expect(r.matchedFields).toContain("id");
    // Should still get the exact-ID bonus since normalized forms match
    expect(r.score).toBeGreaterThan(40);
  });
});

// ---------------------------------------------------------------------------
// Synonym expansion
// ---------------------------------------------------------------------------

describe("synonym expansion", () => {
  it("synonym tokens score at discount", () => {
    const prompts = [
      makePrompt({ id: "a", title: "Fix The Bug", tags: ["debug"] }),
    ];
    const idx = buildScorerIndex(prompts);

    // "repair" is a synonym of "fix" (via synonyms.ts)
    const withSynonyms = searchScorerIndex(idx, "repair", {
      expandSynonyms: true,
    });
    const direct = searchScorerIndex(idx, "fix");

    expect(withSynonyms.length).toBeGreaterThan(0);
    expect(direct.length).toBeGreaterThan(0);
    // Direct match should score higher than synonym match
    expect(direct[0].score).toBeGreaterThan(withSynonyms[0].score);
  });

  it("finds prompts through synonym expansion", () => {
    const prompts = [
      makePrompt({ id: "a", title: "Optimize Performance" }),
    ];
    const idx = buildScorerIndex(prompts);
    // "perf" has synonyms ["performance", "speed", "optimize", "fast"]
    // Reverse: "optimize" → "improve" (via reverse synonyms)
    // "improve" has synonyms ["enhance", "optimize", "upgrade", "better"]
    const results = searchScorerIndex(idx, "improve", {
      expandSynonyms: true,
    });
    expect(results.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Coverage bonus
// ---------------------------------------------------------------------------

describe("coverage bonus", () => {
  it("multi-word all-match > 2x single match", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const multi = scorePrompt(p, "robot maker")!;
    const single = scorePrompt(p, "robot")!;
    expect(multi.score).toBeGreaterThan(single.score * 2);
  });

  it("no bonus for single token", () => {
    const r = scorePrompt(
      makePrompt({ title: "Robot Mode Maker" }),
      "robot",
    )!;
    expect(r.score).toBe(FIELD_WEIGHTS.title);
  });

  it("no bonus when a token misses", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const partial = scorePrompt(p, "robot xyznonexistent")!;
    const single = scorePrompt(p, "robot")!;
    expect(partial.score).toBe(single.score);
  });
});

// ---------------------------------------------------------------------------
// Phrase bonus
// ---------------------------------------------------------------------------

describe("phrase bonus", () => {
  it("consecutive > scattered", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const consec = scorePrompt(p, "robot mode")!;
    const scatter = scorePrompt(p, "robot maker")!;
    expect(consec.score).toBeGreaterThan(scatter.score);
  });

  it("full phrase > partial phrase", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const full = scorePrompt(p, "robot mode maker")!;
    const partial = scorePrompt(p, "robot maker")!;
    expect(full.score).toBeGreaterThan(partial.score);
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe("deduplication", () => {
  it("duplicate tokens don't inflate score", () => {
    const p = makePrompt({ title: "Robot Mode Maker" });
    const single = scorePrompt(p, "robot")!;
    const doubled = scorePrompt(p, "robot robot")!;
    expect(doubled.score).toBe(single.score);
  });
});

// ---------------------------------------------------------------------------
// Field priority
// ---------------------------------------------------------------------------

describe("field priority", () => {
  it("title > description", () => {
    const a = scorePrompt(
      makePrompt({ title: "Robot Helper", description: "Something else" }),
      "robot",
    )!;
    const b = scorePrompt(
      makePrompt({
        title: "Something Else",
        description: "Robot helper tool",
      }),
      "robot",
    )!;
    expect(a.score).toBeGreaterThan(b.score);
  });

  it("id > tags", () => {
    const a = scorePrompt(
      makePrompt({ id: "robot-mode", tags: ["other"] }),
      "robot",
    )!;
    const b = scorePrompt(
      makePrompt({ id: "other-thing", tags: ["robot"] }),
      "robot",
    )!;
    expect(a.score).toBeGreaterThan(b.score);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("empty query → null", () => {
    expect(scorePrompt(makePrompt(), "")).toBeNull();
  });

  it("stopword-only query → null", () => {
    expect(
      scorePrompt(makePrompt({ title: "The Best Tool" }), "the"),
    ).toBeNull();
  });

  it("no match → null", () => {
    expect(
      scorePrompt(makePrompt({ title: "Robot Helper" }), "xyznonexistent"),
    ).toBeNull();
  });

  it("empty tags handled", () => {
    expect(scorePrompt(makePrompt({ tags: [] }), "test")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Index API
// ---------------------------------------------------------------------------

describe("buildScorerIndex + searchScorerIndex", () => {
  it("builds and searches", () => {
    const idx = buildScorerIndex([
      makePrompt({ id: "a", title: "Robot Mode" }),
      makePrompt({ id: "b", title: "Idea Wizard" }),
    ]);
    expect(searchScorerIndex(idx, "robot")[0].id).toBe("a");
  });

  it("reuses index across queries", () => {
    const idx = buildScorerIndex([
      makePrompt({ id: "a", title: "Robot Mode" }),
      makePrompt({ id: "b", title: "Idea Wizard" }),
    ]);
    expect(searchScorerIndex(idx, "robot")[0].id).toBe("a");
    expect(searchScorerIndex(idx, "idea")[0].id).toBe("b");
    expect(searchScorerIndex(idx, "wiz")[0].id).toBe("b");
  });

  it("empty query → empty", () => {
    const idx = buildScorerIndex([makePrompt()]);
    expect(searchScorerIndex(idx, "")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// scoreAll
// ---------------------------------------------------------------------------

describe("scoreAll", () => {
  it("sorted descending", () => {
    const results = scoreAll(
      [
        makePrompt({ id: "lo", title: "Some Tool", description: "Robot helper" }),
        makePrompt({ id: "hi", title: "Robot Mode Maker" }),
      ],
      "robot",
    );
    expect(results[0].id).toBe("hi");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("filters non-matches", () => {
    const results = scoreAll(
      [
        makePrompt({ id: "match", title: "Robot Mode" }),
        makePrompt({
          id: "no-match",
          title: "Idea Wizard",
          description: "brainstorming",
          content: "no overlap",
        }),
      ],
      "robot",
    );
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("match");
  });

  it("empty for no matches", () => {
    expect(
      scoreAll([makePrompt({ title: "Hello World" })], "xyznonexistent"),
    ).toEqual([]);
  });
});
