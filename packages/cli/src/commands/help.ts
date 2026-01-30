import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { version } from "../../package.json";

interface HelpOptions {
  json?: boolean;
}

/**
 * Comprehensive help command with organized documentation
 */
export async function helpCommand(options: HelpOptions) {
  if (shouldOutputJson(options)) {
    console.log(JSON.stringify(getHelpData(), null, 2));
    return;
  }

  const helpText = generateHelpText();

  // Check if we should use a pager
  const usePager =
    process.stdout.isTTY &&
    helpText.split("\n").length > (process.stdout.rows || 24);

  if (usePager) {
    await outputWithPager(helpText);
  } else {
    console.log(helpText);
  }
}

/**
 * Structured help data for JSON output
 */
function getHelpData() {
  return {
    name: "jfp",
    version,
    description: "JeffreysPrompts CLI - A curated collection of AI prompts",
    documentation: "https://jeffreysprompts.com/docs",
    premium_notice:
      "Pro unlocks personal prompts and private vault features (list/search --mine/--saved/--all, save, sync, notes, collections). The CLI is free to build and use with public prompts: https://pro.jeffreysprompts.com/pricing",
    commands: {
      listing_searching: [
        { name: "list", description: "List all prompts (Pro: --mine/--saved)", options: ["--category", "--tag", "--mine", "--saved", "--json"] },
        { name: "search <query>", description: "Search prompts (Pro: --mine/--saved/--all)", options: ["--limit", "--mine", "--saved", "--all", "--local", "--json"] },
        { name: "suggest <task>", description: "Suggest prompts for a task", options: ["--limit", "--semantic", "--json"] },
      ],
      viewing: [
        { name: "show <id>", description: "Show prompt details", options: ["--json", "--raw"] },
        { name: "categories", description: "List all categories with counts", options: ["--json"] },
        { name: "tags", description: "List all tags with counts", options: ["--json"] },
      ],
      copying_exporting: [
        { name: "copy <id>", description: "Copy prompt to clipboard", options: ["--fill", "--json"] },
        { name: "render <id>", description: "Render prompt with variables", options: ["--fill", "--context", "--stdin", "--json"] },
        { name: "export [...ids]", description: "Export as markdown", options: ["--format", "--all", "--stdout", "--json"] },
      ],
      bundles: [
        { name: "bundles", description: "List available bundles", options: ["--json"] },
        { name: "bundle <id>", description: "Show bundle details", options: ["--json"] },
      ],
      registry: [
        { name: "status", description: "Show cache status", options: ["--json"] },
        { name: "refresh", description: "Force cache refresh", options: ["--json"] },
      ],
      premium: [
        { name: "login", description: "Sign in to JeffreysPrompts Premium", options: ["--json"] },
        { name: "logout", description: "Sign out from JeffreysPrompts Premium", options: ["--revoke", "--json"] },
        { name: "whoami", description: "Show current logged-in user", options: ["--json"] },
        { name: "save <prompt-id>", description: "Save prompt to premium account", options: ["--json"] },
        { name: "sync", description: "Sync premium library for offline access", options: ["--force", "--status", "--json"] },
        { name: "notes <prompt-id>", description: "Manage personal notes on prompts", options: ["--add", "--delete", "--json"] },
        { name: "collections", description: "Manage prompt collections", options: ["--add", "--export", "--format", "--stdout", "--json"] },
        { name: "packs", description: "List/install premium packs", options: ["--installed", "--tool", "--json"] },
      ],
      utilities: [
        { name: "open <id>", description: "Open prompt in browser", options: [] },
        { name: "doctor", description: "Check environment for issues", options: ["--json"] },
        { name: "about", description: "About this tool", options: ["--json"] },
        { name: "completion", description: "Generate shell completion script", options: ["--shell"] },
        { name: "update-cli", description: "Update CLI to latest version", options: ["--check", "--force", "--json"] },
        { name: "i / interactive", description: "Interactive fzf-style picker", options: [] },
      ],
    },
    examples: [
      { command: "jfp list --category ideation", description: "List all ideation prompts" },
      { command: "jfp search 'readme documentation'", description: "Search for documentation prompts" },
      { command: "jfp show idea-wizard --raw", description: "Show raw prompt content" },
      { command: "jfp export idea-wizard --format md", description: "Export a prompt as markdown" },
      { command: "jfp completion --shell zsh", description: "Generate zsh completion script" },
      { command: "jfp render my-prompt --VAR=value", description: "Render prompt with variable substitution" },
      { command: "jfp list --json | jq -r '.prompts[].id'", description: "Get all prompt IDs with jq" },
      { command: "jfp suggest 'write a readme' --json", description: "Get prompt suggestions in JSON" },
    ],
  };
}

/**
 * Generate formatted help text for terminal output
 */
function generateHelpText(): string {
  const sections: string[] = [];

  // Header
  sections.push(chalk.bold.cyan(`
JeffreysPrompts CLI v${version}
`) + chalk.dim("A curated collection of prompts for AI assistants\n"));

  // Usage
  sections.push(chalk.bold.white("USAGE"));
  sections.push(`  ${chalk.cyan("jfp")} <command> [options]\n`);

  // Commands section
  sections.push(chalk.bold.white("COMMANDS\n"));

  // Listing & Searching
  sections.push(chalk.yellow("  Listing & Searching"));
  sections.push(formatCommand("list", "List all prompts"));
  sections.push(formatCommand("search <query>", "Search prompts by query"));
  sections.push(formatCommand("suggest <task>", "Suggest prompts for a task"));
  sections.push(chalk.dim("    Pro-only flags: list --mine/--saved, search --mine/--saved/--all"));
  sections.push("");

  // Viewing
  sections.push(chalk.yellow("  Viewing"));
  sections.push(formatCommand("show <id>", "Show prompt details"));
  sections.push(formatCommand("categories", "List all categories with counts"));
  sections.push(formatCommand("tags", "List all tags with counts"));
  sections.push("");

  // Copying & Exporting
  sections.push(chalk.yellow("  Copying & Exporting"));
  sections.push(formatCommand("copy <id>", "Copy prompt to clipboard"));
  sections.push(formatCommand("render <id>", "Render prompt with variables"));
  sections.push(formatCommand("export [...ids]", "Export as markdown"));
  sections.push("");

  // Bundles
  sections.push(chalk.yellow("  Bundles"));
  sections.push(formatCommand("bundles", "List available bundles"));
  sections.push(formatCommand("bundle <id>", "Show bundle details"));
  sections.push("");

  // Registry
  sections.push(chalk.yellow("  Registry"));
  sections.push(formatCommand("status", "Show cache status"));
  sections.push(formatCommand("refresh", "Force cache refresh"));
  sections.push("");

  // Premium
  sections.push(chalk.yellow("  Premium"));
  sections.push(
    chalk.dim(
      "    Pro unlocks private vault features (list/search personal prompts, save, sync, notes, collections)."
    )
  );
  sections.push(chalk.dim("    Upgrade at https://pro.jeffreysprompts.com/pricing"));
  sections.push(formatCommand("login", "Sign in to JeffreysPrompts Premium"));
  sections.push(formatCommand("logout", "Sign out from JeffreysPrompts Premium"));
  sections.push(formatCommand("whoami", "Show current logged-in user"));
  sections.push(formatCommand("save <id>", "Save prompt to premium account"));
  sections.push(formatCommand("sync", "Sync premium library for offline access"));
  sections.push(formatCommand("notes <id>", "Manage personal notes on prompts"));
  sections.push(formatCommand("collections", "Manage prompt collections"));
  sections.push(formatCommand("packs", "List/install premium packs"));
  sections.push("");

  // Utilities
  sections.push(chalk.yellow("  Utilities"));
  sections.push(formatCommand("open <id>", "Open prompt in browser"));
  sections.push(formatCommand("doctor", "Check environment for issues"));
  sections.push(formatCommand("about", "About this tool"));
  sections.push(formatCommand("completion", "Generate shell completion script"));
  sections.push(formatCommand("update-cli", "Update CLI to latest version"));
  sections.push(formatCommand("i, interactive", "Interactive fzf-style picker"));
  sections.push("");

  // Examples
  sections.push(chalk.bold.white("EXAMPLES\n"));
  sections.push(formatExample("jfp list --category ideation --json", "List ideation prompts as JSON"));
  sections.push(formatExample("jfp search 'readme' --limit 5", "Search with limit"));
  sections.push(formatExample("jfp export idea-wizard --format md", "Export a prompt as markdown"));
  sections.push(formatExample("jfp completion --shell zsh", "Generate zsh completion script"));
  sections.push(formatExample("jfp render my-prompt --VAR=value", "Render with variables"));
  sections.push(formatExample("jfp copy idea-wizard --fill", "Copy with interactive variable fill"));
  sections.push(formatExample("jfp list --json | jq -r '.prompts[].id'", "Pipe JSON to jq"));
  sections.push(formatExample("jfp packs --installed", "List installed premium packs"));
  sections.push("");

  // Global options
  sections.push(chalk.bold.white("GLOBAL OPTIONS\n"));
  sections.push(`  ${chalk.cyan("--json")}      Output as JSON (auto-enabled when not a TTY)`);
  sections.push(`  ${chalk.cyan("--help")}      Show command help`);
  sections.push(`  ${chalk.cyan("--version")}   Show version`);
  sections.push("");

  // Documentation
  sections.push(chalk.bold.white("DOCUMENTATION\n"));
  sections.push(`  ${chalk.underline("https://jeffreysprompts.com/docs")}`);
  sections.push(`  ${chalk.underline("https://github.com/Dicklesworthstone/jeffreysprompts.com")}`);
  sections.push("");

  // Agent tips
  sections.push(chalk.bold.white("AGENT INTEGRATION\n"));
  sections.push(chalk.dim("  jfp is designed for AI agent use. Key features:"));
  sections.push(chalk.dim("  • All commands support --json for structured output"));
  sections.push(chalk.dim("  • Auto-JSON when stdout is not a TTY (piping)"));
  sections.push(chalk.dim("  • Consistent error payloads: { error: \"type\" }"));
  sections.push(chalk.dim("  • Use 'jfp suggest <task>' to find relevant prompts"));
  sections.push("");

  return sections.join("\n");
}

/**
 * Format a command for display
 */
function formatCommand(name: string, description: string): string {
  const paddedName = name.padEnd(24);
  return `    ${chalk.cyan(paddedName)} ${chalk.dim(description)}`;
}

/**
 * Format an example for display
 */
function formatExample(command: string, description: string): string {
  return `  ${chalk.green("$")} ${chalk.white(command)}\n    ${chalk.dim(description)}\n`;
}

/**
 * Output text using a pager (less) if available
 */
async function outputWithPager(text: string): Promise<void> {
  try {
    // Try to spawn less with ANSI color support
    const proc = Bun.spawn(["less", "-R"], {
      stdin: "pipe",
      stdout: "inherit",
      stderr: "inherit",
    });

    if (proc.stdin && typeof proc.stdin !== "number") {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      await proc.stdin.write(data);
      await proc.stdin.end();
    }

    // Wait for pager to complete (user quits with 'q')
    await proc.exited;
  } catch {
    // Fallback to direct output if less is not available
    console.log(text);
  }
}
