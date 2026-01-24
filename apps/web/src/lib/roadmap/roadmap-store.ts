/**
 * Roadmap & Feature Voting Store
 *
 * In-memory store for feature requests, voting, and roadmap management.
 * Uses globalThis for persistence across HMR in development.
 */

// =============================================================================
// Types
// =============================================================================

export type FeatureStatus =
  | "under_review"
  | "planned"
  | "in_progress"
  | "shipped"
  | "declined";

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  useCase?: string;
  status: FeatureStatus;
  statusNote?: string;
  submittedBy?: string;
  submittedByName?: string;
  voteCount: number;
  commentCount: number;
  plannedQuarter?: string;
  shippedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureVote {
  featureId: string;
  userId: string;
  createdAt: string;
}

export interface FeatureComment {
  id: string;
  featureId: string;
  userId: string;
  userName: string;
  content: string;
  isOfficial: boolean;
  createdAt: string;
}

// Status display configuration
export const STATUS_CONFIG: Record<
  FeatureStatus,
  { label: string; color: string; description: string }
> = {
  under_review: {
    label: "Under Review",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    description: "New submission being evaluated",
  },
  planned: {
    label: "Planned",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    description: "Approved and scheduled for development",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    description: "Currently being developed",
  },
  shipped: {
    label: "Shipped",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    description: "Live in production",
  },
  declined: {
    label: "Declined",
    color: "bg-muted text-muted-foreground border-muted",
    description: "Won't be implemented",
  },
};

// =============================================================================
// Store Interface
// =============================================================================

interface RoadmapStore {
  features: Map<string, FeatureRequest>;
  votes: Map<string, FeatureVote>;
  comments: Map<string, FeatureComment>;
}

// =============================================================================
// Global State (survives HMR)
// =============================================================================

declare global {
  var __jfp_roadmap_store__: RoadmapStore | undefined;
}

function getStore(): RoadmapStore {
  if (!globalThis.__jfp_roadmap_store__) {
    globalThis.__jfp_roadmap_store__ = {
      features: new Map(),
      votes: new Map(),
      comments: new Map(),
    };
    initializeSeedData();
  }
  return globalThis.__jfp_roadmap_store__;
}

// =============================================================================
// Seed Data
// =============================================================================

function initializeSeedData(): void {
  const store = globalThis.__jfp_roadmap_store__!;

  const seedFeatures: FeatureRequest[] = [
    {
      id: "feat-001",
      title: "Dark Mode Support",
      description:
        "Add a dark mode theme option for better viewing in low-light conditions.",
      useCase:
        "Many developers work late at night and prefer dark interfaces to reduce eye strain.",
      status: "shipped",
      voteCount: 847,
      commentCount: 23,
      shippedAt: "2026-01-10T00:00:00Z",
      createdAt: "2025-11-15T00:00:00Z",
      updatedAt: "2026-01-10T00:00:00Z",
    },
    {
      id: "feat-002",
      title: "Prompt Version History",
      description:
        "Track changes to prompts over time and allow reverting to previous versions.",
      useCase:
        "When iterating on prompts, it's helpful to see what changed and roll back if needed.",
      status: "in_progress",
      plannedQuarter: "Q1 2026",
      voteCount: 523,
      commentCount: 15,
      createdAt: "2025-12-01T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
    },
    {
      id: "feat-003",
      title: "Prompt Collections / Folders",
      description:
        "Allow users to organize their saved prompts into custom collections or folders.",
      useCase:
        "Power users have many prompts and need better organization than a flat list.",
      status: "planned",
      plannedQuarter: "Q2 2026",
      voteCount: 412,
      commentCount: 8,
      createdAt: "2025-12-10T00:00:00Z",
      updatedAt: "2026-01-05T00:00:00Z",
    },
    {
      id: "feat-004",
      title: "Collaborative Prompt Editing",
      description:
        "Allow multiple users to collaborate on prompt development in real-time.",
      useCase:
        "Teams working on complex prompts could benefit from collaborative editing.",
      status: "under_review",
      voteCount: 234,
      commentCount: 12,
      createdAt: "2026-01-05T00:00:00Z",
      updatedAt: "2026-01-05T00:00:00Z",
    },
    {
      id: "feat-005",
      title: "Prompt Templates",
      description:
        "Pre-built templates for common use cases that users can customize.",
      useCase:
        "New users often don't know where to start - templates would help onboarding.",
      status: "planned",
      plannedQuarter: "Q1 2026",
      voteCount: 389,
      commentCount: 7,
      createdAt: "2025-11-20T00:00:00Z",
      updatedAt: "2026-01-08T00:00:00Z",
    },
    {
      id: "feat-006",
      title: "API Access for Prompts",
      description:
        "Programmatic API to fetch and manage prompts for automation workflows.",
      useCase:
        "Developers want to integrate prompts into their CI/CD pipelines and tooling.",
      status: "planned",
      plannedQuarter: "Q2 2026",
      voteCount: 567,
      commentCount: 19,
      createdAt: "2025-11-25T00:00:00Z",
      updatedAt: "2026-01-12T00:00:00Z",
    },
    {
      id: "feat-007",
      title: "Prompt Analytics Dashboard",
      description:
        "View usage statistics, copy counts, and performance metrics for your prompts.",
      useCase:
        "Prompt authors want to understand how their prompts are being used.",
      status: "under_review",
      voteCount: 156,
      commentCount: 4,
      createdAt: "2026-01-10T00:00:00Z",
      updatedAt: "2026-01-10T00:00:00Z",
    },
    {
      id: "feat-008",
      title: "Mobile App",
      description:
        "Native iOS and Android apps for browsing and using prompts on mobile.",
      status: "declined",
      statusNote:
        "The web app is fully responsive and works great on mobile. We're focusing on web-first features.",
      voteCount: 189,
      commentCount: 31,
      createdAt: "2025-12-15T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    },
    {
      id: "feat-009",
      title: "Multi-language Support",
      description:
        "Support for non-English UI and prompt content in multiple languages.",
      useCase:
        "Global audience - many users are not native English speakers.",
      status: "in_progress",
      plannedQuarter: "Q1 2026",
      voteCount: 678,
      commentCount: 14,
      createdAt: "2025-11-10T00:00:00Z",
      updatedAt: "2026-01-20T00:00:00Z",
    },
    {
      id: "feat-010",
      title: "Prompt Import/Export",
      description:
        "Bulk import and export prompts in standard formats (JSON, YAML, Markdown).",
      useCase:
        "Users want to backup their prompts or migrate from other tools.",
      status: "planned",
      plannedQuarter: "Q1 2026",
      voteCount: 298,
      commentCount: 6,
      createdAt: "2025-12-20T00:00:00Z",
      updatedAt: "2026-01-06T00:00:00Z",
    },
  ];

  for (const feature of seedFeatures) {
    store.features.set(feature.id, feature);
  }

  // Add some seed comments
  const seedComments: FeatureComment[] = [
    {
      id: "comment-001",
      featureId: "feat-002",
      userId: "admin-001",
      userName: "Jeffrey Emanuel",
      content:
        "This is currently in active development! We're implementing git-style versioning for prompts.",
      isOfficial: true,
      createdAt: "2026-01-15T12:00:00Z",
    },
    {
      id: "comment-002",
      featureId: "feat-004",
      userId: "user-123",
      userName: "Sarah K.",
      content:
        "This would be amazing for our team! We often iterate on prompts together.",
      isOfficial: false,
      createdAt: "2026-01-06T09:30:00Z",
    },
  ];

  for (const comment of seedComments) {
    store.comments.set(comment.id, comment);
  }
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Get all feature requests with optional filtering
 */
export function getFeatures(options?: {
  status?: FeatureStatus | FeatureStatus[];
  sortBy?: "votes" | "newest" | "oldest";
  limit?: number;
}): FeatureRequest[] {
  const store = getStore();
  let features = Array.from(store.features.values());

  // Filter by status
  if (options?.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    features = features.filter((f) => statuses.includes(f.status));
  }

  // Sort
  switch (options?.sortBy) {
    case "votes":
      features.sort((a, b) => b.voteCount - a.voteCount);
      break;
    case "newest":
      features.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case "oldest":
      features.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      break;
    default:
      // Default: sort by votes
      features.sort((a, b) => b.voteCount - a.voteCount);
  }

  // Limit
  if (options?.limit) {
    features = features.slice(0, options.limit);
  }

  return features;
}

/**
 * Get a single feature by ID
 */
export function getFeature(id: string): FeatureRequest | null {
  const store = getStore();
  return store.features.get(id) ?? null;
}

/**
 * Get features grouped by status for roadmap display
 */
export function getRoadmapByStatus(): Record<FeatureStatus, FeatureRequest[]> {
  const features = getFeatures();

  const grouped: Record<FeatureStatus, FeatureRequest[]> = {
    under_review: [],
    planned: [],
    in_progress: [],
    shipped: [],
    declined: [],
  };

  for (const feature of features) {
    grouped[feature.status].push(feature);
  }

  // Sort each group by votes
  for (const status of Object.keys(grouped) as FeatureStatus[]) {
    grouped[status].sort((a, b) => b.voteCount - a.voteCount);
  }

  return grouped;
}

/**
 * Check if a user has voted for a feature
 */
export function hasUserVoted(featureId: string, userId: string): boolean {
  const store = getStore();
  const voteKey = `${featureId}:${userId}`;
  return store.votes.has(voteKey);
}

/**
 * Get comments for a feature
 */
export function getFeatureComments(featureId: string): FeatureComment[] {
  const store = getStore();
  return Array.from(store.comments.values())
    .filter((c) => c.featureId === featureId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Submit a new feature request
 */
export function submitFeature(data: {
  title: string;
  description: string;
  useCase?: string;
  submittedBy?: string;
  submittedByName?: string;
}): FeatureRequest {
  const store = getStore();

  const id = `feat-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const feature: FeatureRequest = {
    id,
    title: data.title,
    description: data.description,
    useCase: data.useCase,
    status: "under_review",
    submittedBy: data.submittedBy,
    submittedByName: data.submittedByName,
    voteCount: 1, // Auto-vote for your own submission
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  store.features.set(id, feature);

  // Auto-vote for your own submission
  if (data.submittedBy) {
    const voteKey = `${id}:${data.submittedBy}`;
    store.votes.set(voteKey, {
      featureId: id,
      userId: data.submittedBy,
      createdAt: now,
    });
  }

  return feature;
}

/**
 * Vote for a feature
 */
export function voteForFeature(
  featureId: string,
  userId: string
): { success: boolean; error?: string; voteCount?: number } {
  const store = getStore();
  const feature = store.features.get(featureId);

  if (!feature) {
    return { success: false, error: "Feature not found" };
  }

  const voteKey = `${featureId}:${userId}`;

  if (store.votes.has(voteKey)) {
    return { success: false, error: "Already voted" };
  }

  store.votes.set(voteKey, {
    featureId,
    userId,
    createdAt: new Date().toISOString(),
  });

  feature.voteCount += 1;
  feature.updatedAt = new Date().toISOString();

  return { success: true, voteCount: feature.voteCount };
}

/**
 * Remove vote from a feature
 */
export function unvoteFeature(
  featureId: string,
  userId: string
): { success: boolean; voteCount?: number } {
  const store = getStore();
  const feature = store.features.get(featureId);

  if (!feature) {
    return { success: false };
  }

  const voteKey = `${featureId}:${userId}`;

  if (!store.votes.has(voteKey)) {
    return { success: false };
  }

  store.votes.delete(voteKey);
  feature.voteCount = Math.max(0, feature.voteCount - 1);
  feature.updatedAt = new Date().toISOString();

  return { success: true, voteCount: feature.voteCount };
}

/**
 * Add a comment to a feature
 */
export function addComment(data: {
  featureId: string;
  userId: string;
  userName: string;
  content: string;
  isOfficial?: boolean;
}): FeatureComment | null {
  const store = getStore();
  const feature = store.features.get(data.featureId);

  if (!feature) {
    return null;
  }

  const id = `comment-${Date.now().toString(36)}`;

  const comment: FeatureComment = {
    id,
    featureId: data.featureId,
    userId: data.userId,
    userName: data.userName,
    content: data.content,
    isOfficial: data.isOfficial ?? false,
    createdAt: new Date().toISOString(),
  };

  store.comments.set(id, comment);
  feature.commentCount += 1;
  feature.updatedAt = new Date().toISOString();

  return comment;
}

// =============================================================================
// Admin Operations
// =============================================================================

/**
 * Update feature status (admin only)
 */
export function updateFeatureStatus(
  featureId: string,
  status: FeatureStatus,
  options?: {
    statusNote?: string;
    plannedQuarter?: string;
  }
): FeatureRequest | null {
  const store = getStore();
  const feature = store.features.get(featureId);

  if (!feature) {
    return null;
  }

  feature.status = status;
  feature.updatedAt = new Date().toISOString();

  if (options?.statusNote !== undefined) {
    feature.statusNote = options.statusNote;
  }

  if (options?.plannedQuarter !== undefined) {
    feature.plannedQuarter = options.plannedQuarter;
  }

  if (status === "shipped") {
    feature.shippedAt = new Date().toISOString();
  }

  return feature;
}

// =============================================================================
// Statistics
// =============================================================================

export interface RoadmapStats {
  totalFeatures: number;
  underReview: number;
  planned: number;
  inProgress: number;
  shipped: number;
  declined: number;
  totalVotes: number;
}

export function getRoadmapStats(): RoadmapStats {
  const store = getStore();
  const features = Array.from(store.features.values());

  return {
    totalFeatures: features.length,
    underReview: features.filter((f) => f.status === "under_review").length,
    planned: features.filter((f) => f.status === "planned").length,
    inProgress: features.filter((f) => f.status === "in_progress").length,
    shipped: features.filter((f) => f.status === "shipped").length,
    declined: features.filter((f) => f.status === "declined").length,
    totalVotes: features.reduce((sum, f) => sum + f.voteCount, 0),
  };
}
