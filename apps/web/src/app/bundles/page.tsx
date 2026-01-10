import type { Metadata } from "next";
import { bundles } from "@jeffreysprompts/core/prompts/bundles";
import { BundleCard } from "@/components/BundleCard";

export const metadata: Metadata = {
  title: "Bundles | JeffreysPrompts",
  description: "Curated collections of related prompts for common workflows",
};

export default function BundlesPage() {
  // Sort bundles: featured first, then by title
  const sortedBundles = [...bundles].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <div className="border-b dark:border-zinc-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            Prompt Bundles
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Curated collections of related prompts. Install all prompts in a bundle
            with a single command.
          </p>
        </div>
      </div>

      {/* Bundle Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBundles.map((bundle, index) => (
            <BundleCard key={bundle.id} bundle={bundle} index={index} />
          ))}
        </div>

        {sortedBundles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400">
              No bundles available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
