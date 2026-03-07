/**
 * Tests for /api/roadmap/[id]/vote (POST, DELETE)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";
import { getFeature } from "@/lib/roadmap/roadmap-store";

function clearStores() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_roadmap_store__"];
  delete g["__jfp_rate_limiter_roadmap-vote__"];
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string, method: "POST" | "DELETE", headers?: HeadersInit) {
  return new NextRequest(url, {
    method,
    headers,
  });
}

describe("/api/roadmap/[id]/vote", () => {
  beforeEach(() => {
    clearStores();
  });

  describe("POST", () => {
    it("returns 404 for non-existent feature", async () => {
      const res = await POST(
        makeRequest("http://localhost/api/roadmap/nonexistent/vote", "POST"),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });

    it("rejects a duplicate vote from the same client after the cookie is reset", async () => {
      const headers = {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "RoadmapVoteTest/1.0",
      };

      const first = await POST(
        makeRequest("http://localhost/api/roadmap/feat-002/vote", "POST", headers),
        makeContext("feat-002")
      );
      expect(first.status).toBe(200);

      const second = await POST(
        makeRequest("http://localhost/api/roadmap/feat-002/vote", "POST", headers),
        makeContext("feat-002")
      );
      const payload = await second.json();

      expect(second.status).toBe(400);
      expect(payload.message).toBe("Already voted");
    });

    it("still allows a second vote from a different client fingerprint", async () => {
      const first = await POST(
        makeRequest("http://localhost/api/roadmap/feat-002/vote", "POST", {
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "RoadmapVoteTest/1.0",
        }),
        makeContext("feat-002")
      );
      const second = await POST(
        makeRequest("http://localhost/api/roadmap/feat-002/vote", "POST", {
          "x-forwarded-for": "203.0.113.11",
          "user-agent": "RoadmapVoteTest/1.0",
        }),
        makeContext("feat-002")
      );

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
    });
  });

  describe("DELETE", () => {
    it("returns 404 for non-existent feature", async () => {
      const res = await DELETE(
        makeRequest("http://localhost/api/roadmap/nonexistent/vote", "DELETE"),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });

    it("does not let a different anonymous user unvote just because the fingerprint matches", async () => {
      const headers = {
        "x-forwarded-for": "203.0.113.12",
        "user-agent": "RoadmapVoteTest/1.0",
      };
      const initialVoteCount = getFeature("feat-002")?.voteCount ?? 0;

      const voteResponse = await POST(
        makeRequest("http://localhost/api/roadmap/feat-002/vote", "POST", headers),
        makeContext("feat-002")
      );
      expect(voteResponse.status).toBe(200);
      expect(getFeature("feat-002")?.voteCount).toBe(initialVoteCount + 1);

      const unvoteResponse = await DELETE(
        makeRequest("http://localhost/api/roadmap/feat-002/vote", "DELETE", headers),
        makeContext("feat-002")
      );
      const payload = await unvoteResponse.json();

      expect(unvoteResponse.status).toBe(400);
      expect(payload.message).toBe("No vote to remove");
      expect(getFeature("feat-002")?.voteCount).toBe(initialVoteCount + 1);
    });
  });
});
