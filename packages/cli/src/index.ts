import cac from "cac";
import { version } from "../package.json";
import { listCommand } from "./commands/list";
import { searchCommand } from "./commands/search";
import { showCommand } from "./commands/show";
import { installCommand } from "./commands/install";
import { uninstallCommand } from "./commands/uninstall";
import { exportCommand } from "./commands/export";
import { renderCommand } from "./commands/render";
import { copyCommand } from "./commands/copy";
import { installedCommand } from "./commands/installed";
import { updateCommand } from "./commands/update";
import { suggestCommand } from "./commands/suggest";
import { interactiveCommand } from "./commands/interactive";
import { bundlesCommand, bundleShowCommand } from "./commands/bundles";
import { statusCommand, refreshCommand } from "./commands/registry";
import { completionCommand } from "./commands/completion";
import {
  categoriesCommand,
  tagsCommand,
  openCommand,
  doctorCommand,
  aboutCommand,
} from "./commands/utilities";
import { helpCommand } from "./commands/help";
import { serveCommand } from "./commands/serve";
import { updateCliCommand } from "./commands/update-cli";
import { loginCommand } from "./commands/login";
import { logoutCommand, whoamiCommand } from "./commands/auth";
import { notesCommand } from "./commands/notes";
import { saveCommand } from "./commands/save";
import { syncCommand } from "./commands/sync";
import { collectionsCommand, collectionShowCommand } from "./commands/collections";

export const cli = cac("jfp");

cli
  .command("list", "List all prompts")
  .option("--category <category>", "Filter by category")
  .option("--tag <tag>", "Filter by tag")
  .option("--mine", "List only your personal prompts")
  .option("--saved", "List only your saved prompts")
  .option("--json", "Output JSON")
  .action(listCommand);

cli
  .command("search <query>", "Fuzzy search prompts")
  .option("--limit <n>", "Max results (default: 10)")
  .option("--mine", "Search only your personal prompts")
  .option("--saved", "Search only your saved prompts")
  .option("--all", "Search everything (public + personal)")
  .option("--local", "Search only local registry")
  .option("--json", "Output JSON")
  .action(searchCommand);

cli
  .command("show <id>", "Show a prompt")
  .option("--json", "Output JSON")
  .option("--raw", "Output raw content")
  .action(showCommand);

cli
  .command("install [...ids]", "Install prompts as Claude Code skills")
  .option("--project", "Install to current project (.claude/skills)")
  .option("--all", "Install all prompts")
  .option("--bundle <id>", "Install a bundle as a combined skill")
  .option("--force", "Overwrite skills even if user modified them")
  .option("--json", "Output JSON")
  .action(installCommand);

cli
  .command("uninstall [...ids]", "Remove installed Claude Code skills")
  .option("--project", "Remove from current project (.claude/skills)")
  .option("--confirm", "Confirm removal (required in non-interactive mode)")
  .option("--json", "Output JSON")
  .action(uninstallCommand);

cli
  .command("export [...ids]", "Export prompts to files")
  .option("--format <format>", "Format: skill or md (default: skill)")
  .option("--all", "Export all prompts")
  .option("--stdout", "Print to stdout")
  .option("--json", "Output JSON")
  .action(exportCommand);

cli
  .command("render <id>", "Render prompt with variables")
  .option("--fill", "Prompt interactively for missing variables")
  .option("--context <path>", "Append file context")
  .option("--stdin", "Read context from stdin")
  .option("--max-context <bytes>", "Max context bytes (default: 200KB)")
  .option("--json", "Output JSON")
  .action(renderCommand);

cli
  .command("copy <id>", "Copy prompt to clipboard")
  .option("--fill", "Prompt interactively for missing variables")
  .option("--json", "Output JSON")
  .action(copyCommand);

cli
  .command("installed", "List installed Claude Code skills")
  .option("--personal", "Only show personal skills (~/.config/claude/skills)")
  .option("--project", "Only show project skills (.claude/skills)")
  .option("--json", "Output JSON")
  .action(installedCommand);

cli
  .command("update", "Update all installed skills to latest versions")
  .option("--personal", "Only update personal skills (~/.config/claude/skills)")
  .option("--project", "Only update project skills (.claude/skills)")
  .option("--dry-run", "Show what would be updated without making changes")
  .option("--diff", "Show diff of changes (with --dry-run)")
  .option("--force", "Overwrite even if user modified skills")
  .option("--json", "Output JSON")
  .action(updateCommand);

cli
  .command("suggest <task>", "Suggest prompts for a task")
  .option("--json", "Output JSON")
  .option("--limit <n>", "Max suggestions (default: 3)")
  .option("--semantic", "Enable semantic reranking (downloads MiniLM on first use)")
  .action(suggestCommand);

cli
  .command("bundles", "List all prompt bundles")
  .option("--json", "Output JSON")
  .action(bundlesCommand);

cli
  .command("bundle <id>", "Show bundle details")
  .option("--json", "Output JSON")
  .action(bundleShowCommand);

cli
  .command("status", "Show registry cache status and settings")
  .option("--json", "Output JSON")
  .action(statusCommand);

cli
  .command("refresh", "Refresh registry cache from remote")
  .option("--json", "Output JSON")
  .action(refreshCommand);

cli
  .command("login", "Sign in to JeffreysPrompts Premium")
  .option("--remote", "Use device code flow (for headless/SSH)")
  .option("--timeout <ms>", "Timeout in milliseconds (default: 120000)")
  .option("--json", "Output JSON")
  .action(loginCommand);

cli
  .command("logout", "Sign out from JeffreysPrompts Premium")
  .option("--revoke", "Also revoke token on server")
  .option("--json", "Output JSON")
  .action(logoutCommand);

cli
  .command("whoami", "Show current logged-in user")
  .option("--json", "Output JSON")
  .action(whoamiCommand);

cli
  .command("save <prompt-id>", "Save prompt to your premium account")
  .option("--json", "Output JSON")
  .action(saveCommand);

cli
  .command("sync", "Sync your premium library for offline access")
  .option("--force", "Force full re-sync (ignore cache)")
  .option("--status", "Show sync status")
  .option("--json", "Output JSON")
  .action(syncCommand);

cli
  .command("notes <prompt-id>", "Manage personal notes on prompts")
  .option("--add <text>", "Add a note")
  .option("--delete <note-id>", "Delete a note by ID")
  .option("--json", "Output JSON")
  .action(notesCommand);

cli
  .command("collections [name]", "List or show user collections (premium)")
  .option("--add <prompt-id>", "Add prompt to collection")
  .option("--json", "Output JSON")
  .action((name: string | undefined, options: { add?: string; json?: boolean }) => {
    if (name) {
      return collectionShowCommand(name, options);
    }
    return collectionsCommand(options);
  });

cli
  .command("i", "Interactive mode - fzf-style prompt picker")
  .alias("interactive")
  .action(interactiveCommand);

cli
  .command("categories", "List all categories with counts")
  .option("--json", "Output JSON")
  .action(categoriesCommand);

cli
  .command("tags", "List all tags with counts")
  .option("--json", "Output JSON")
  .action(tagsCommand);

cli
  .command("open <id>", "Open prompt in browser")
  .action(openCommand);

cli
  .command("doctor", "Check environment for issues")
  .option("--json", "Output JSON")
  .action(doctorCommand);

cli
  .command("about", "About JeffreysPrompts CLI")
  .option("--json", "Output JSON")
  .action(aboutCommand);

cli
  .command("completion", "Generate shell completion script")
  .option("--shell <shell>", "Shell: bash, zsh, or fish")
  .action((options) => completionCommand(options, cli));

cli
  .command("serve", "Start MCP server for agent-native access")
  .option("--config", "Show Claude Desktop config snippet")
  .action(serveCommand);

cli
  .command("update-cli", "Update jfp CLI to latest version")
  .option("--check", "Check for updates without installing")
  .option("--force", "Force reinstall even if up to date")
  .option("--json", "Output JSON")
  .action(updateCliCommand);

cli
  .command("help", "Show comprehensive documentation")
  .option("--json", "Output JSON")
  .action(helpCommand);

cli.help();
cli.version(version);

// Default command (no args)
cli.command("").action(() => {
  cli.outputHelp();
});
