import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Jeffrey's Prompts - Curated Prompts for Agentic Coding";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
        }}
      >
        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "9999px",
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            marginBottom: "24px",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#818cf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M18 18l.5 1.5L20 20l-1.5.5L18 22l-.5-1.5L16 20l1.5-.5L18 18z" />
            <path d="M5 18l.5 1.5L7 20l-1.5.5L5 22l-.5-1.5L3 20l1.5-.5L5 18z" />
          </svg>
          <span
            style={{
              display: "flex",
              fontSize: "16px",
              fontWeight: 500,
              color: "#a5b4fc",
            }}
          >
            Curated Prompts for AI Coding
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              display: "flex",
              fontSize: "72px",
              fontWeight: 700,
              background: "linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {"Jeffrey's Prompts"}
          </h1>
        </div>

        {/* Subtitle */}
        <p
          style={{
            display: "flex",
            fontSize: "28px",
            color: "#a1a1aa",
            marginTop: "24px",
            maxWidth: "800px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Battle-tested prompts for Claude, GPT, and AI coding assistants.
          Browse, copy, and install as skills.
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "48px",
            color: "#71717a",
            fontSize: "20px",
          }}
        >
          <span style={{ display: "flex" }}>jeffreysprompts.com</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
