import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  Flag,
  Link2,
  MapPin,
  Share2,
  Sparkles,
  Twitter,
  Github,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Username validation
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

// Mock user data - in production, this would come from API
const MOCK_USERS: Record<string, UserProfile> = {
  jeffreyemanuel: {
    username: "jeffreyemanuel",
    displayName: "Jeffrey Emanuel",
    avatar: null, // Will show initials
    bio: "Creator of JeffreysPrompts. Building tools for AI-native workflows.",
    location: "San Francisco, CA",
    website: "https://jeffreysprompts.com",
    twitter: "doodlestein",
    github: "jeffreyemanuel",
    joinDate: "2024-01-01",
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
    username: "demo_user",
    displayName: "Demo User",
    avatar: null,
    bio: "Just exploring the platform!",
    location: null,
    website: null,
    twitter: null,
    github: null,
    joinDate: "2024-06-15",
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

// Mock prompt data
const MOCK_PROMPTS = [
  { id: "idea-wizard", title: "The Idea Wizard", description: "Generate and evaluate improvement ideas", category: "ideation" },
  { id: "readme-reviser", title: "README Reviser", description: "Update documentation systematically", category: "documentation" },
  { id: "robot-mode-maker", title: "Robot Mode Maker", description: "Create agent-friendly CLI tools", category: "automation" },
];

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getUser(username: string): Promise<UserProfile | null> {
  // In production, fetch from API
  return MOCK_USERS[username] ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getUser(username);

  if (!user) {
    return {
      title: "User Not Found",
      description: "This user profile does not exist.",
    };
  }

  return {
    title: `${user.displayName} (@${user.username}) | JeffreysPrompts`,
    description: user.bio ?? `View ${user.displayName}'s prompts and collections on JeffreysPrompts.`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;

  // Validate username format
  if (!isValidUsername(username)) {
    notFound();
  }

  const user = await getUser(username);

  if (!user) {
    notFound();
  }

  if (!user.isPublic) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Private Profile
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              This user has set their profile to private.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="container max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <section className="mb-8">
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <UserAvatar
                  displayName={user.displayName}
                  avatar={user.avatar}
                  size="lg"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {user.displayName}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      @{user.username}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="ghost" size="sm" className="text-zinc-500">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="mt-4 text-zinc-700 dark:text-zinc-300">
                    {user.bio}
                  </p>
                )}

                {/* Badges */}
                {user.badges.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {user.badges.map((badge) => (
                      <ReputationBadge key={badge} type={badge} />
                    ))}
                  </div>
                )}

                {/* Meta Info */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Member since {formatDate(user.joinDate)}
                  </span>
                  {user.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {user.location}
                    </span>
                  )}
                </div>

                {/* Social Links */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {user.website && (
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      <Link2 className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {user.twitter && (
                    <a
                      href={`https://twitter.com/${user.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <Twitter className="h-4 w-4" />
                      @{user.twitter}
                    </a>
                  )}
                  {user.github && (
                    <a
                      href={`https://github.com/${user.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <Github className="h-4 w-4" />
                      {user.github}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatItem label="Prompts" value={user.stats.prompts} />
                <StatItem label="Packs" value={user.stats.packs} />
                <StatItem label="Skills" value={user.stats.skills} />
                <StatItem label="Saves Received" value={user.stats.savesReceived} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Content Tabs */}
      <section>
        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="prompts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-3"
            >
              Prompts ({user.stats.prompts})
            </TabsTrigger>
            <TabsTrigger
              value="packs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-3"
            >
              Packs ({user.stats.packs})
            </TabsTrigger>
            <TabsTrigger
              value="skills"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-3"
            >
              Skills ({user.stats.skills})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="mt-6">
            {user.stats.prompts > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {MOCK_PROMPTS.map((prompt) => (
                  <ContentCard
                    key={prompt.id}
                    title={prompt.title}
                    description={prompt.description}
                    category={prompt.category}
                    href={`/prompts/${prompt.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                message="No prompts yet"
                description="This user hasn't published any prompts."
              />
            )}
          </TabsContent>

          <TabsContent value="packs" className="mt-6">
            {user.stats.packs > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <ContentCard
                  title="Getting Started Pack"
                  description="Essential prompts for new users"
                  category="pack"
                  href="/bundles/getting-started"
                />
              </div>
            ) : (
              <EmptyState
                message="No packs yet"
                description="This user hasn't created any prompt packs."
              />
            )}
          </TabsContent>

          <TabsContent value="skills" className="mt-6">
            {user.stats.skills > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <ContentCard
                  title="Prompt Formatter"
                  description="Convert raw text into TypeScript registry format"
                  category="skill"
                  href="#"
                />
                <ContentCard
                  title="Skill Maker"
                  description="Generate Claude Code SKILL.md files"
                  category="skill"
                  href="#"
                />
              </div>
            ) : (
              <EmptyState
                message="No skills yet"
                description="This user hasn't published any Claude Code skills."
              />
            )}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function UserAvatar({
  displayName,
  avatar,
  size = "md",
}: {
  displayName: string;
  avatar: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-16 w-16 text-lg",
    lg: "h-24 w-24 text-2xl",
  };

  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={displayName}
        className={cn(
          "rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700",
          sizeClasses[size]
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full",
        "bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold",
        "ring-2 ring-zinc-200 dark:ring-zinc-700",
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  );
}

function ReputationBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string; icon?: typeof Sparkles }> = {
    creator: {
      label: "Creator",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
      icon: Sparkles,
    },
    early_adopter: {
      label: "Early Adopter",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
    },
    premium: {
      label: "Premium",
      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
    },
    verified: {
      label: "Verified",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    },
  };

  const badge = config[type];
  if (!badge) return null;

  const Icon = badge.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", badge.color)}>
      {Icon && <Icon className="h-3 w-3" />}
      {badge.label}
    </Badge>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function ContentCard({
  title,
  description,
  category,
  href,
}: {
  title: string;
  description: string;
  category: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {description}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize shrink-0">
              {category}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  message,
  description,
}: {
  message: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="font-medium text-zinc-900 dark:text-white">{message}</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
