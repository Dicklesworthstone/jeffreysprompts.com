/**
 * Profile Store
 *
 * Manages user profiles, reputation scores, and badges.
 * Uses in-memory storage pattern consistent with other stores.
 */

export type BadgeType =
  | "new_member"
  | "contributor"
  | "popular"
  | "top_rated"
  | "featured_author"
  | "founding_member"
  | "creator"
  | "early_adopter"
  | "premium"
  | "verified";

export interface UserBadge {
  type: BadgeType;
  awardedAt: string;
  criteria: string;
}

export interface UserStats {
  prompts: number;
  packs: number;
  skills: number;
  savesReceived: number;
  ratingsReceived: number;
  averageRating: number;
  featuredCount: number;
}

export interface UserProfile {
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
  showReputation: boolean;
  badges: UserBadge[];
  stats: UserStats;
  reputationScore: number;
}

export interface PublicUserProfile {
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
  github: string | null;
  joinDate: string;
  badges: BadgeType[];
  stats: UserStats;
  reputationScore: number | null; // null if user hides reputation
}

interface ProfileStore {
  profiles: Map<string, UserProfile>;
  profilesByUsername: Map<string, string>;
}

const STORE_KEY = "__jfp_profile_store__";

// Reputation scoring weights
const REPUTATION_WEIGHTS = {
  publicPrompt: 10,
  saveReceived: 1,
  positiveRating: 2,
  featuredContent: 50,
  accountAgeDays: 0.1, // Per day, up to max
  maxAccountAgeBonus: 365, // Max bonus from account age
};

// Badge criteria
const BADGE_CRITERIA = {
  new_member: { maxDays: 30, description: "Account less than 30 days old" },
  contributor: { minPrompts: 5, description: "Published 5+ public prompts" },
  popular: { minSaves: 100, description: "100+ total saves received" },
  top_rated: { minAvgRating: 90, description: "Average rating above 90%" },
  featured_author: { minFeatured: 1, description: "Has featured content" },
  founding_member: { beforeDate: "2024-06-01", description: "Joined before June 2024" },
};

function getStore(): ProfileStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ProfileStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      profiles: new Map(),
      profilesByUsername: new Map(),
    };

    // Initialize with seed data
    initializeSeedData(globalStore[STORE_KEY]);
  }

  return globalStore[STORE_KEY];
}

function initializeSeedData(store: ProfileStore): void {
  const seedUsers: Omit<UserProfile, "reputationScore">[] = [
    {
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
      showReputation: true,
      badges: [],
      stats: {
        prompts: 42,
        packs: 3,
        skills: 8,
        savesReceived: 1234,
        ratingsReceived: 156,
        averageRating: 95,
        featuredCount: 5,
      },
    },
    {
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
      showReputation: true,
      badges: [],
      stats: {
        prompts: 5,
        packs: 0,
        skills: 2,
        savesReceived: 23,
        ratingsReceived: 8,
        averageRating: 78,
        featuredCount: 0,
      },
    },
  ];

  for (const user of seedUsers) {
    // Calculate reputation and badges
    const profile: UserProfile = {
      ...user,
      reputationScore: calculateReputationScore(user.stats, user.joinDate),
      badges: calculateBadges(user.stats, user.joinDate),
    };

    store.profiles.set(profile.id, profile);
    store.profilesByUsername.set(profile.username.toLowerCase(), profile.id);
  }
}

/**
 * Calculate reputation score based on user stats and account age.
 */
export function calculateReputationScore(stats: UserStats, joinDate: string): number {
  const daysSinceJoin = Math.floor(
    (Date.now() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const score =
    stats.prompts * REPUTATION_WEIGHTS.publicPrompt +
    stats.savesReceived * REPUTATION_WEIGHTS.saveReceived +
    stats.ratingsReceived * REPUTATION_WEIGHTS.positiveRating +
    stats.featuredCount * REPUTATION_WEIGHTS.featuredContent +
    Math.min(daysSinceJoin, REPUTATION_WEIGHTS.maxAccountAgeBonus) *
      REPUTATION_WEIGHTS.accountAgeDays;

  return Math.round(score);
}

/**
 * Calculate badges a user qualifies for based on their stats and account age.
 */
export function calculateBadges(stats: UserStats, joinDate: string): UserBadge[] {
  const badges: UserBadge[] = [];
  const now = new Date();
  const joinedDate = new Date(joinDate);
  const daysSinceJoin = Math.floor(
    (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // New Member - account less than 30 days old
  if (daysSinceJoin <= BADGE_CRITERIA.new_member.maxDays) {
    badges.push({
      type: "new_member",
      awardedAt: joinDate,
      criteria: BADGE_CRITERIA.new_member.description,
    });
  }

  // Contributor - 5+ public prompts
  if (stats.prompts >= BADGE_CRITERIA.contributor.minPrompts) {
    badges.push({
      type: "contributor",
      awardedAt: now.toISOString(),
      criteria: BADGE_CRITERIA.contributor.description,
    });
  }

  // Popular - 100+ total saves
  if (stats.savesReceived >= BADGE_CRITERIA.popular.minSaves) {
    badges.push({
      type: "popular",
      awardedAt: now.toISOString(),
      criteria: BADGE_CRITERIA.popular.description,
    });
  }

  // Top Rated - average rating above 90%
  if (
    stats.ratingsReceived > 0 &&
    stats.averageRating >= BADGE_CRITERIA.top_rated.minAvgRating
  ) {
    badges.push({
      type: "top_rated",
      awardedAt: now.toISOString(),
      criteria: BADGE_CRITERIA.top_rated.description,
    });
  }

  // Featured Author - has featured content
  if (stats.featuredCount >= BADGE_CRITERIA.featured_author.minFeatured) {
    badges.push({
      type: "featured_author",
      awardedAt: now.toISOString(),
      criteria: BADGE_CRITERIA.featured_author.description,
    });
  }

  // Founding Member - joined before June 2024
  if (joinedDate < new Date(BADGE_CRITERIA.founding_member.beforeDate)) {
    badges.push({
      type: "founding_member",
      awardedAt: joinDate,
      criteria: BADGE_CRITERIA.founding_member.description,
    });
  }

  return badges;
}

/**
 * Get a user profile by ID.
 */
export function getProfileById(id: string): UserProfile | null {
  const store = getStore();
  return store.profiles.get(id) ?? null;
}

/**
 * Get a user profile by username (case-insensitive).
 */
export function getProfileByUsername(username: string): UserProfile | null {
  const store = getStore();
  const profileId = store.profilesByUsername.get(username.toLowerCase());
  if (!profileId) return null;
  return store.profiles.get(profileId) ?? null;
}

/**
 * Get a public user profile by username.
 * Returns null if user not found or profile is private.
 */
export function getPublicProfile(username: string): PublicUserProfile | null {
  const profile = getProfileByUsername(username);
  if (!profile || !profile.isPublic) return null;

  return {
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatar,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    twitter: profile.twitter,
    github: profile.github,
    joinDate: profile.joinDate,
    badges: profile.badges.map((b) => b.type),
    stats: profile.stats,
    reputationScore: profile.showReputation ? profile.reputationScore : null,
  };
}

/**
 * Create a new user profile.
 */
export function createProfile(input: {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  bio?: string | null;
}): UserProfile {
  const store = getStore();

  // Check if username is taken
  if (store.profilesByUsername.has(input.username.toLowerCase())) {
    throw new Error("Username already taken");
  }

  const now = new Date().toISOString();
  const stats: UserStats = {
    prompts: 0,
    packs: 0,
    skills: 0,
    savesReceived: 0,
    ratingsReceived: 0,
    averageRating: 0,
    featuredCount: 0,
  };

  const profile: UserProfile = {
    id: input.id,
    username: input.username,
    displayName: input.displayName,
    avatar: input.avatar ?? null,
    bio: input.bio ?? null,
    location: null,
    website: null,
    twitter: null,
    github: null,
    joinDate: now,
    isPublic: true,
    showReputation: true,
    badges: calculateBadges(stats, now),
    stats,
    reputationScore: calculateReputationScore(stats, now),
  };

  store.profiles.set(profile.id, profile);
  store.profilesByUsername.set(profile.username.toLowerCase(), profile.id);

  return profile;
}

/**
 * Update a user profile.
 */
export function updateProfile(
  id: string,
  updates: Partial<
    Pick<
      UserProfile,
      | "displayName"
      | "avatar"
      | "bio"
      | "location"
      | "website"
      | "twitter"
      | "github"
      | "isPublic"
      | "showReputation"
    >
  >
): UserProfile | null {
  const store = getStore();
  const profile = store.profiles.get(id);
  if (!profile) return null;

  Object.assign(profile, updates);
  store.profiles.set(id, profile);

  return profile;
}

/**
 * Update user stats and recalculate reputation and badges.
 */
export function updateUserStats(
  id: string,
  statsUpdate: Partial<UserStats>
): UserProfile | null {
  const store = getStore();
  const profile = store.profiles.get(id);
  if (!profile) return null;

  // Update stats
  Object.assign(profile.stats, statsUpdate);

  // Recalculate reputation and badges
  profile.reputationScore = calculateReputationScore(profile.stats, profile.joinDate);
  profile.badges = calculateBadges(profile.stats, profile.joinDate);

  store.profiles.set(id, profile);

  return profile;
}

/**
 * List all public profiles.
 */
export function listPublicProfiles(options?: {
  limit?: number;
  sortBy?: "reputation" | "prompts" | "saves" | "joinDate";
}): PublicUserProfile[] {
  const store = getStore();
  const limit = options?.limit ?? 50;
  const sortBy = options?.sortBy ?? "reputation";

  const publicProfiles = Array.from(store.profiles.values())
    .filter((p) => p.isPublic)
    .sort((a, b) => {
      switch (sortBy) {
        case "reputation":
          return b.reputationScore - a.reputationScore;
        case "prompts":
          return b.stats.prompts - a.stats.prompts;
        case "saves":
          return b.stats.savesReceived - a.stats.savesReceived;
        case "joinDate":
          return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
        default:
          return 0;
      }
    })
    .slice(0, limit);

  return publicProfiles.map((profile) => ({
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatar,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    twitter: profile.twitter,
    github: profile.github,
    joinDate: profile.joinDate,
    badges: profile.badges.map((b) => b.type),
    stats: profile.stats,
    reputationScore: profile.showReputation ? profile.reputationScore : null,
  }));
}

/**
 * Badge display configuration.
 */
export const BADGE_CONFIG: Record<
  BadgeType,
  { label: string; color: string; description: string }
> = {
  new_member: {
    label: "New Member",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
    description: "Account less than 30 days old",
  },
  contributor: {
    label: "Contributor",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    description: "Published 5+ public prompts",
  },
  popular: {
    label: "Popular",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
    description: "100+ total saves received",
  },
  top_rated: {
    label: "Top Rated",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    description: "Average rating above 90%",
  },
  featured_author: {
    label: "Featured Author",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
    description: "Has featured content",
  },
  founding_member: {
    label: "Founding Member",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
    description: "Early adopter",
  },
  creator: {
    label: "Creator",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    description: "Platform creator",
  },
  early_adopter: {
    label: "Early Adopter",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
    description: "Joined during beta",
  },
  premium: {
    label: "Premium",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
    description: "Premium subscriber",
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    description: "Identity verified",
  },
};

/**
 * Reputation weights for external use.
 */
export { REPUTATION_WEIGHTS, BADGE_CRITERIA };
