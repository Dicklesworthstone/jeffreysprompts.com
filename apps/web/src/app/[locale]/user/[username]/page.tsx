import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
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
import { localizeHref } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { isValidUsername } from "@/lib/username";
import {
  getPublicProfile,
  type PublicUserProfile,
  type BadgeType,
  BADGE_CONFIG,
} from "@/lib/profile/profile-store";

// Mock prompt data
const MOCK_PROMPTS = [
  { id: "idea-wizard", title: "The Idea Wizard", description: "Generate and evaluate improvement ideas", category: "ideation" },
  { id: "readme-reviser", title: "README Reviser", description: "Update documentation systematically", category: "documentation" },
  { id: "robot-mode-maker", title: "Robot Mode Maker", description: "Create agent-friendly CLI tools", category: "automation" },
];

interface PageProps {
  params: Promise<{ locale: string; username: string }>;
}

async function getUser(username: string): Promise<PublicUserProfile | null> {
  // Get profile from store
  return getPublicProfile(username);
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

  const description = user.bio ?? `View ${user.displayName}'s prompts and collections on JeffreysPrompts.`;
  const title = `${user.displayName} (@${user.username}) | JeffreysPrompts`;

  return {
    title,
    description,
    openGraph: {
      title: user.displayName,
      description,
      type: "profile",
      url: `https://jeffreysprompts.com/user/${user.username}`,
      siteName: "JeffreysPrompts",
    },
    twitter: {
      card: "summary_large_image",
      title: user.displayName,
      description,
      creator: user.twitter ? `@${user.twitter}` : "@doodlestein",
    },
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { locale, username } = await params;

  // Validate username format
  if (!isValidUsername(username)) {
    notFound();
  }

  const user = await getUser(username);

  if (!user) {
    // getPublicProfile returns null for both non-existent and private profiles
    notFound();
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
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {user.displayName}
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      @{user.username}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="ghost" size="sm" className="text-neutral-500">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="mt-4 text-neutral-700 dark:text-neutral-300">
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
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
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
                      className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
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
                      className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                    >
                      <Github className="h-4 w-4" />
                      {user.github}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatItem label="Prompts" value={user.stats.prompts} />
                <StatItem label="Packs" value={user.stats.packs} />
                <StatItem label="Skills" value={user.stats.skills} />
                {user.reputationScore !== null ? (
                  <StatItem label="Reputation" value={user.reputationScore} />
                ) : (
                  <StatItem label="Saves Received" value={user.stats.savesReceived} />
                )}
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
                    href={localizeHref(locale, `/prompts/${prompt.id}`)}
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
                  href={localizeHref(locale, "/bundles/getting-started")}
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
  // Extract initials from display name, with fallback for empty/whitespace names
  const initials = displayName
    .trim()
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const sizeDimensions = {
    sm: 40,
    md: 64,
    lg: 96,
  };

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={displayName}
        width={sizeDimensions[size]}
        height={sizeDimensions[size]}
        className={cn(
          "rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700",
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
        "ring-2 ring-neutral-200 dark:ring-neutral-700",
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  );
}

function ReputationBadge({ type }: { type: BadgeType }) {
  const config = BADGE_CONFIG[type];
  if (!config) return null;

  // Special icon for creator badge
  const showIcon = type === "creator" || type === "featured_author";

  return (
    <Badge variant="outline" className={cn("gap-1 border", config.color)}>
      {showIcon && <Sparkles className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
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
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
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
        <p className="font-medium text-neutral-900 dark:text-white">{message}</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
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
