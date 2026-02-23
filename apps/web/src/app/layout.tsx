import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { JsonLd, websiteJsonLd, softwareAppJsonLd } from "@/components/JsonLd";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://jeffreysprompts.com"),
  title: {
    default: "Jeffrey's Prompts - Curated Prompts for Agentic Coding",
    template: "%s | Jeffrey's Prompts",
  },
  description:
    "A curated collection of battle-tested prompts for AI coding agents. Browse, copy, and install as Claude Code skills.",
  keywords: [
    "prompts",
    "AI",
    "coding",
    "Claude Code",
    "agentic",
    "developer tools",
    "LLM prompts",
    "AI prompts",
    "system prompts",
  ],
  authors: [{ name: "Jeffrey Emanuel", url: "https://twitter.com/doodlestein" }],
  creator: "Jeffrey Emanuel",
  publisher: "Jeffrey Emanuel",
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jeffrey's Prompts",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Jeffrey's Prompts",
    description: "Curated prompts for agentic coding - browse, copy, and install as Claude Code skills",
    url: "https://jeffreysprompts.com",
    siteName: "Jeffrey's Prompts",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jeffrey's Prompts",
    description: "Curated prompts for agentic coding",
    creator: "@doodlestein",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={softwareAppJsonLd} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
