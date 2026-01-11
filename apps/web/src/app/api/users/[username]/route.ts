import { NextResponse, type NextRequest } from "next/server";

// Username validation constants
const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
const RESERVED_USERNAMES = [
  "admin", "api", "help", "support", "about", "settings", "profile",
  "user", "users", "login", "logout", "signup", "register", "auth",
  "prompts", "bundles", "workflows", "pricing", "terms", "privacy",
];

function isValidUsername(username: string): boolean {
  if (!USERNAME_REGEX.test(username)) return false;
  if (RESERVED_USERNAMES.includes(username)) return false;
  return true;
}

// Mock user data - in production, this would come from database
const MOCK_USERS: Record<string, UserProfile> = {
  jeffreyemanuel: {
    id: "usr_1",
    username: "jeffreyemanuel",
    displayName: "Jeffrey Emanuel",
    avatar: null,
    bio: "Creator of JeffreysPrompts. Building tools for AI-native workflows.",
    location: "San Francisco, CA",
    website: "https://jeffreysprompts.com",
    twitter: "doodlestein",
    github: "jeffreyemanuel",
    joinDate: "2024-01-01T00:00:00Z",
    isPublic: true,
    badges: ["creator", "early_adopter"],
    stats: {
      prompts: 42,
      packs: 3,
      skills: 8,
      savesReceived: 1234,
    },
  },
  demo_user: {
    id: "usr_2",
    username: "demo_user",
    displayName: "Demo User",
    avatar: null,
    bio: "Just exploring the platform!",
    location: null,
    website: null,
    twitter: null,
    github: null,
    joinDate: "2024-06-15T00:00:00Z",
    isPublic: true,
    badges: [],
    stats: {
      prompts: 5,
      packs: 0,
      skills: 2,
      savesReceived: 23,
    },
  },
};

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
  github: string | null;
  joinDate: string;
  isPublic: boolean;
  badges: string[];
  stats: {
    prompts: number;
    packs: number;
    skills: number;
    savesReceived: number;
  };
}

interface PublicUserProfile {
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
  github: string | null;
  joinDate: string;
  badges: string[];
  stats: {
    prompts: number;
    packs: number;
    skills: number;
    savesReceived: number;
  };
}

/**
 * GET /api/users/[username]
 *
 * Returns public profile data for a user.
 * Returns 404 if user not found or profile is private.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;

  // Validate username format
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "invalid_username", message: "Invalid username format" },
      { status: 400 }
    );
  }

  // In production, fetch from database
  const user = MOCK_USERS[username];

  if (!user) {
    return NextResponse.json(
      { error: "not_found", message: "User not found" },
      { status: 404 }
    );
  }

  // Check if profile is public
  if (!user.isPublic) {
    return NextResponse.json(
      { error: "private_profile", message: "This profile is private" },
      { status: 404 }
    );
  }

  // Return public profile data (exclude sensitive fields like id)
  const publicProfile: PublicUserProfile = {
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    bio: user.bio,
    location: user.location,
    website: user.website,
    twitter: user.twitter,
    github: user.github,
    joinDate: user.joinDate,
    badges: user.badges,
    stats: user.stats,
  };

  return NextResponse.json(publicProfile, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
