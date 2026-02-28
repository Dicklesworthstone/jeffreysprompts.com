import { ImageResponse } from "next/og";
import { getPrompt } from "@jeffreysprompts/core/prompts";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 600,
};
export const contentType = "image/png";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 3)).trimEnd() + "...";
}

export default async function PromptTwitterImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prompt = getPrompt(id);
  const title = prompt?.title ?? "Prompt Not Found";
  const description = prompt?.description
    ? truncate(prompt.description, 180)
    : "Browse and install curated prompts for agentic coding.";
  const category = prompt?.category ?? "prompts";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#f8fafc",
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#e2e8f0",
              maxWidth: 920,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 20,
            color: "#94a3b8",
          }}
        >
          <span style={{ display: "flex", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {category}
          </span>
          <span style={{ display: "flex" }}>·</span>
          <span style={{ display: "flex" }}>jeffreysprompts.com</span>
        </div>
      </div>
    ),
    size
  );
}
