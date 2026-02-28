import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "User Profile";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Mock user data - same as page.tsx (in production, both would use shared API)
const MOCK_USERS: Record<string, { displayName: string; bio: string | null; stats: { prompts: number; packs: number; skills: number } }> = {
  jeffreyemanuel: {
    displayName: "Jeffrey Emanuel",
    bio: "Creator of JeffreysPrompts. Building tools for AI-native workflows.",
    stats: { prompts: 42, packs: 3, skills: 8 },
  },
  demo_user: {
    displayName: "Demo User",
    bio: "Just exploring the platform!",
    stats: { prompts: 5, packs: 0, skills: 2 },
  },
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 3)).trimEnd() + "...";
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export default function UserOpenGraphImage({
  params,
}: {
  params: { username: string };
}) {
  const user = MOCK_USERS[params.username];
  const displayName = user?.displayName ?? "User Not Found";
  const bio = user?.bio ? truncate(user.bio, 160) : "View prompts and collections on JeffreysPrompts.";
  const initials = getInitials(displayName);
  const stats = user?.stats ?? { prompts: 0, packs: 0, skills: 0 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#c7d2fe",
          }}
        >
          {"Jeffrey's Prompts"}
        </div>

        {/* Profile Content */}
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {/* Avatar */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 700,
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "#e2e8f0",
                maxWidth: 700,
                lineHeight: 1.4,
              }}
            >
              {bio}
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            fontSize: 20,
            color: "#94a3b8",
          }}
        >
          <span style={{ display: "flex" }}>
            <span style={{ display: "flex", fontWeight: 600, color: "#e2e8f0" }}>{stats.prompts}</span> prompts
          </span>
          <span style={{ display: "flex" }}>
            <span style={{ display: "flex", fontWeight: 600, color: "#e2e8f0" }}>{stats.packs}</span> packs
          </span>
          <span style={{ display: "flex" }}>
            <span style={{ display: "flex", fontWeight: 600, color: "#e2e8f0" }}>{stats.skills}</span> skills
          </span>
          <span style={{ display: "flex", marginLeft: "auto" }}>jeffreysprompts.com</span>
        </div>
      </div>
    ),
    size
  );
}
