import chalk from "chalk";
import boxen from "boxen";
import Table from "cli-table3";
import { apiClient, isAuthError, isNotFoundError, requiresPremium, type ApiResponse } from "../lib/api-client";
import { getCurrentUser, isLoggedIn } from "../lib/credentials";
import { cachePremiumPack, getCachedPackEntry, readPacksManifest, uncachePremiumPack } from "../lib/offline";
import { shouldOutputJson } from "../lib/utils";

interface PackCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
}

interface PremiumPackSummary {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  version?: string | null;
  installCount?: number | null;
  promptCount: number;
  isInstalled: boolean;
  installedAt?: string | null;
  publishedAt?: string | null;
  category?: PackCategory | null;
}

interface PremiumPackDetail extends PremiumPackSummary {
  changelog?: string | null;
  prompts: Array<{
    id: string;
    title: string;
    description?: string | null;
    content?: string | null;
    version?: string | null;
    accessLevel?: string | null;
    position?: number;
  }>;
}

interface PacksListResponse {
  packs: PremiumPackSummary[];
  installedOnly: boolean;
}

interface PackDetailResponse {
  pack: PremiumPackDetail;
}

interface PackInstallResponse {
  installed: boolean;
  alreadyInstalled?: boolean;
  packId: string;
  installedAt?: string | null;
}

interface PackUninstallResponse {
  uninstalled: boolean;
  removed: boolean;
  packId: string;
}

export interface PacksOptions {
  json?: boolean;
  installed?: boolean;
  tool?: string;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

async function requirePremiumAccess(options: PacksOptions): Promise<void> {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "You must be logged in to manage premium packs", {
        hint: "Run 'jfp login' to sign in",
      });
    } else {
      console.log(chalk.yellow("You must be logged in to manage premium packs"));
      console.log(chalk.dim("Run 'jfp login' to sign in"));
    }
    process.exit(1);
  }

  const user = await getCurrentUser();
  if (user && user.tier !== "premium") {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", "Premium packs require a Pro subscription", {
        tier: user.tier,
      });
    } else {
      console.log(chalk.yellow("Premium packs require a Pro subscription"));
      console.log(chalk.dim("Upgrade at https://pro.jeffreysprompts.com/pricing"));
    }
    process.exit(1);
  }
}

function handleApiError(
  response: ApiResponse<unknown>,
  options: PacksOptions,
  fallbackMessage: string
): void {
  if (isAuthError(response)) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "Session expired. Please run 'jfp login' again.");
    } else {
      console.log(chalk.yellow("Session expired. Please run 'jfp login' again."));
    }
    process.exit(1);
  }

  if (requiresPremium(response)) {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", "Premium packs require a Pro subscription");
    } else {
      console.log(chalk.yellow("Premium packs require a Pro subscription"));
      console.log(chalk.dim("Upgrade at https://pro.jeffreysprompts.com/pricing"));
    }
    process.exit(1);
  }

  if (isNotFoundError(response)) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_found", "Pack not found");
    } else {
      console.log(chalk.red("Pack not found"));
    }
    process.exit(1);
  }

  if (shouldOutputJson(options)) {
    writeJsonError("api_error", response.error || fallbackMessage);
  } else {
    console.log(chalk.red(response.error || fallbackMessage));
  }
  process.exit(1);
}

async function listPremiumPacks(options: PacksOptions): Promise<void> {
  await requirePremiumAccess(options);

  const params = new URLSearchParams();
  if (options.installed) {
    params.set("installed", "true");
  }

  const endpoint = `/cli/premium-packs${params.toString() ? `?${params}` : ""}`;
  const response = await apiClient.get<PacksListResponse>(endpoint);

  if (!response.ok) {
    handleApiError(response, options, "Failed to load premium packs");
    return;
  }

  const packs = response.data?.packs ?? [];
  const manifest = readPacksManifest();
  const cachedById = new Map(manifest?.entries.map((entry) => [entry.id, entry]));
  const enrichedPacks = packs.map((pack) => {
    const cached = cachedById.get(pack.id) ?? null;
    const cachedVersion = cached?.version ?? null;
    const cachedAt = cached?.cachedAt ?? null;
    const updateAvailable =
      pack.isInstalled &&
      Boolean(pack.version) &&
      Boolean(cachedVersion) &&
      pack.version !== cachedVersion;
    const cacheMissing = pack.isInstalled && !cached;

    return {
      ...pack,
      cachedVersion,
      cachedAt,
      updateAvailable: updateAvailable || cacheMissing,
    };
  });

  if (shouldOutputJson(options)) {
    writeJson({
      packs: enrichedPacks,
      count: enrichedPacks.length,
      installedOnly: options.installed ?? false,
      updatesAvailable: enrichedPacks.filter((pack) => pack.updateAvailable).length,
    });
    return;
  }

  if (enrichedPacks.length === 0) {
    console.log(
      chalk.yellow(options.installed ? "No installed premium packs yet." : "No premium packs found.")
    );
    return;
  }

  const table = new Table({
    head: ["ID", "Title", "Prompts", "Installed", "Version", "Update"],
    style: { head: ["cyan"] },
  });

  for (const pack of enrichedPacks) {
    table.push([
      pack.id,
      pack.title,
      chalk.yellow(String(pack.promptCount)),
      pack.isInstalled ? chalk.green("✓") : chalk.dim("—"),
      pack.version ?? "1.0.0",
      pack.updateAvailable ? chalk.yellow("available") : chalk.dim("—"),
    ]);
  }

  console.log(table.toString());
  const updatesAvailable = enrichedPacks.filter((pack) => pack.updateAvailable).length;
  console.log(chalk.dim(`\nFound ${enrichedPacks.length} premium packs.`));
  if (updatesAvailable > 0) {
    console.log(chalk.yellow(`Updates available for ${updatesAvailable} installed pack(s).`));
    console.log(chalk.dim("Run: jfp packs update <pack-id>"));
  }
}

async function fetchPremiumPackDetail(id: string, options: PacksOptions): Promise<PremiumPackDetail> {
  await requirePremiumAccess(options);

  const response = await apiClient.get<PackDetailResponse>(`/cli/premium-packs/${id}`);
  if (!response.ok) {
    handleApiError(response, options, "Failed to load premium pack");
    // handleApiError calls process.exit(1), but TypeScript doesn't know that
    throw new Error("unreachable");
  }

  const pack = response.data?.pack;
  if (!pack) {
    handleApiError({ ok: false, status: 404 }, options, "Pack not found");
    // handleApiError calls process.exit(1), but TypeScript doesn't know that
    throw new Error("unreachable");
  }

  return pack;
}

async function showPremiumPack(id: string, options: PacksOptions): Promise<void> {
  const pack = await fetchPremiumPackDetail(id, options);

  if (shouldOutputJson(options)) {
    writeJson({ pack });
    return;
  }

  let content = `${chalk.bold.cyan(pack.title)} ${chalk.dim(`v${pack.version ?? "1.0.0"}`)}\n`;
  if (pack.description) {
    content += `${chalk.dim(pack.description)}\n`;
  }
  content += `\n${chalk.green("Prompts:")} ${pack.promptCount}`;
  content += `\n${chalk.green("Installed:")} ${pack.isInstalled ? "yes" : "no"}`;
  if (pack.installedAt) {
    content += ` (${pack.installedAt})`;
  }
  if (pack.category?.name) {
    content += `\n${chalk.green("Category:")} ${pack.category.name}`;
  }
  if (pack.installCount !== undefined && pack.installCount !== null) {
    content += `\n${chalk.green("Installs:")} ${pack.installCount}`;
  }

  content += "\n\n" + chalk.dim("Included Prompts") + "\n";
  if (pack.prompts.length === 0) {
    content += chalk.dim("  (No prompts in this pack yet)");
  } else {
    for (const prompt of pack.prompts) {
      content += `  ${chalk.cyan("•")} ${chalk.bold(prompt.title)} ${chalk.dim(`(${prompt.id})`)}\n`;
      if (prompt.description) {
        content += `    ${chalk.dim(prompt.description)}\n`;
      }
    }
  }

  console.log(
    boxen(content, {
      padding: 1,
      borderStyle: "round",
      borderColor: "cyan",
    })
  );
}

async function showPackChangelog(id: string, options: PacksOptions): Promise<void> {
  const pack = await fetchPremiumPackDetail(id, options);
  const changelog = pack.changelog?.trim();

  if (shouldOutputJson(options)) {
    writeJson({
      packId: pack.id,
      title: pack.title,
      version: pack.version ?? "1.0.0",
      changelog: changelog ?? "",
      hasChangelog: Boolean(changelog),
    });
    return;
  }

  if (!changelog) {
    console.log(chalk.yellow("No changelog available for this pack yet."));
    return;
  }

  const content = `${chalk.bold.cyan(pack.title)} ${chalk.dim(`v${pack.version ?? "1.0.0"}`)}\n\n${changelog}`;
  console.log(
    boxen(content, {
      padding: 1,
      borderStyle: "round",
      borderColor: "cyan",
    })
  );
}

type InstallMode = "install" | "subscribe" | "update";

const tryCachePack = async (id: string): Promise<{ ok: boolean; error?: string }> => {
  const response = await apiClient.get<PackDetailResponse>(`/cli/premium-packs/${id}`);
  if (!response.ok) {
    return { ok: false, error: response.error || "Failed to fetch pack for offline cache" };
  }
  const pack = response.data?.pack;
  if (!pack) {
    return { ok: false, error: "Pack detail missing from API response" };
  }
  const result = cachePremiumPack(pack);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
};

async function installPremiumPack(
  id: string,
  options: PacksOptions,
  mode: InstallMode = "install"
): Promise<void> {
  await requirePremiumAccess(options);

  const payload = options.tool ? { tool: options.tool } : undefined;
  const response = await apiClient.post<PackInstallResponse>(
    `/cli/premium-packs/${id}/install`,
    payload
  );

  if (!response.ok) {
    handleApiError(response, options, "Failed to install premium pack");
    return;
  }

  const data = response.data;

  const cachedEntry = getCachedPackEntry(id);
  const shouldCache = !data?.alreadyInstalled || !cachedEntry || cachedEntry.installed !== true;
  const cacheResult = shouldCache ? await tryCachePack(id) : { ok: true };

  if (shouldOutputJson(options)) {
    writeJson({
      ...(data ?? { installed: true, packId: id }),
      action: mode,
      cache: cacheResult.ok ? { ok: true } : { ok: false, error: cacheResult.error },
    });
    return;
  }

  if (data?.alreadyInstalled) {
    console.log(chalk.yellow(mode === "update" ? "Pack already up to date." : "Pack already installed."));
    if (!cacheResult.ok) {
      console.log(chalk.dim(`Note: Could not cache pack for offline use: ${cacheResult.error}`));
    }
    return;
  }

  const message =
    mode === "update"
      ? "Pack updated."
      : mode === "subscribe"
        ? "Pack subscribed."
        : "Pack installed.";
  console.log(chalk.green("✓") + ` ${message}`);
  if (!cacheResult.ok) {
    console.log(chalk.dim(`Note: Could not cache pack for offline use: ${cacheResult.error}`));
  }
}

async function uninstallPremiumPack(id: string, options: PacksOptions): Promise<void> {
  await requirePremiumAccess(options);

  const response = await apiClient.delete<PackUninstallResponse>(`/cli/premium-packs/${id}/install`);
  if (!response.ok) {
    handleApiError(response, options, "Failed to uninstall premium pack");
    return;
  }

  const data = response.data;
  const uncacheResult = uncachePremiumPack(id);
  if (shouldOutputJson(options)) {
    writeJson({
      ...(data ?? { uninstalled: true, packId: id }),
      cache: uncacheResult.ok ? { ok: true } : { ok: false, error: uncacheResult.error },
    });
    return;
  }

  if (data && data.removed === false) {
    console.log(chalk.yellow("Pack was not installed."));
    return;
  }

  console.log(chalk.green("✓") + " Pack uninstalled.");
  if (!uncacheResult.ok) {
    console.log(chalk.dim(`Note: Could not remove local cache: ${uncacheResult.error}`));
  }
}

export async function premiumPacksCommand(
  action: string | undefined,
  id: string | undefined,
  options: PacksOptions
): Promise<void> {
  if (!action) {
    return listPremiumPacks(options);
  }

  const normalized = action.toLowerCase();

  if (normalized === "list") {
    return listPremiumPacks(options);
  }

  if (normalized === "install") {
    if (!id) {
      if (shouldOutputJson(options)) {
        writeJsonError("missing_argument", "Usage: jfp packs install <pack-id>");
      } else {
        console.error("Usage: jfp packs install <pack-id>");
      }
      process.exit(1);
    }
    return installPremiumPack(id, options, "install");
  }

  if (normalized === "uninstall" || normalized === "remove") {
    if (!id) {
      if (shouldOutputJson(options)) {
        writeJsonError("missing_argument", "Usage: jfp packs uninstall <pack-id>");
      } else {
        console.error("Usage: jfp packs uninstall <pack-id>");
      }
      process.exit(1);
    }
    return uninstallPremiumPack(id, options);
  }

  if (normalized === "subscribe") {
    if (!id) {
      if (shouldOutputJson(options)) {
        writeJsonError("missing_argument", "Usage: jfp packs subscribe <pack-id>");
      } else {
        console.error("Usage: jfp packs subscribe <pack-id>");
      }
      process.exit(1);
    }
    return installPremiumPack(id, options, "subscribe");
  }

  if (normalized === "unsubscribe") {
    if (!id) {
      if (shouldOutputJson(options)) {
        writeJsonError("missing_argument", "Usage: jfp packs unsubscribe <pack-id>");
      } else {
        console.error("Usage: jfp packs unsubscribe <pack-id>");
      }
      process.exit(1);
    }
    return uninstallPremiumPack(id, options);
  }

  if (normalized === "update") {
    if (!id) {
      if (shouldOutputJson(options)) {
        writeJsonError("missing_argument", "Usage: jfp packs update <pack-id>");
      } else {
        console.error("Usage: jfp packs update <pack-id>");
      }
      process.exit(1);
    }
    return installPremiumPack(id, options, "update");
  }

  if (normalized === "changelog") {
    if (!id) {
      if (shouldOutputJson(options)) {
        writeJsonError("missing_argument", "Usage: jfp packs changelog <pack-id>");
      } else {
        console.error("Usage: jfp packs changelog <pack-id>");
      }
      process.exit(1);
    }
    return showPackChangelog(id, options);
  }

  if (normalized === "show" || normalized === "info") {
    if (!id) {
      if (shouldOutputJson(options)) {
        writeJsonError("missing_argument", "Usage: jfp packs show <pack-id>");
      } else {
        console.error("Usage: jfp packs show <pack-id>");
      }
      process.exit(1);
    }
    return showPremiumPack(id, options);
  }

  if (!id) {
    return showPremiumPack(action, options);
  }

  if (shouldOutputJson(options)) {
    writeJsonError("unknown_action", `Unknown packs action: ${action}`);
  } else {
    console.error(`Unknown packs action: ${action}`);
  }
  process.exit(1);
}
