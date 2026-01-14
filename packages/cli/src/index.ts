import cac from "cac";
import { version } from "../package.json";

// Handle --no-color flag early (before chalk is imported)
// Check both the standard NO_COLOR env and JFP_NO_COLOR
if (
  process.argv.includes("--no-color") ||
  process.env.NO_COLOR ||
  process.env.JFP_NO_COLOR
) {
  process.env.NO_COLOR = "1";
}

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
import { randomCommand } from "./commands/random";
import { helpCommand } from "./commands/help";
import { serveCommand } from "./commands/serve";
import { updateCliCommand } from "./commands/update-cli";
import { loginCommand } from "./commands/login";
import { logoutCommand, whoamiCommand } from "./commands/auth";
import { notesCommand } from "./commands/notes";
import { saveCommand } from "./commands/save";
import { syncCommand } from "./commands/sync";
import {
  configListCommand,
  configGetCommand,
  configSetCommand,
  configResetCommand,
  configPathCommand,
} from "./commands/config";
import {
  collectionsCommand,
  collectionShowCommand,
  collectionCreateCommand,
  collectionAddCommand,
  exportCollectionCommand,
} from "./commands/collections";
import {
  skillsListCommand,
  skillsInstallCommand,
  skillsExportCommand,
  skillsCreateCommand,
} from "./commands/skills";

export const cli = cac("jfp");

// Global options (applied to all commands)
cli.option("--no-color", "Disable colored output");

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
  .option("--output-dir <dir>", "Directory to write exported files (default: current directory)")
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
  .command("collections [action] [name] [promptId]", "Manage user collections (premium)")
  .option("--add <prompt-id>", "Add prompt to collection (legacy)")
  .option("--export", "Export collection prompts to files")
  .option("--format <format>", "Format: skill or md (default: skill)")
  .option("--stdout", "Print exported content to stdout")
  .option("--description <text>", "Description for new collection")
  .option("--json", "Output JSON")
  .action((
    action: string | undefined,
    name: string | undefined,
    promptId: string | undefined,
    options: { add?: string; export?: boolean; format?: "skill" | "md"; stdout?: boolean; description?: string; json?: boolean }
  ) => {
    const outputError = (code: string, message: string) => {
      if (options.json) {
        console.log(JSON.stringify({ error: true, code, message }));
      } else {
        console.error(message);
      }
      process.exit(1);
    };

    if (!action) {
      return collectionsCommand(options);
    }

    switch (action) {
      case "create":
        if (!name) {
          outputError("missing_argument", "Usage: jfp collections create <name>");
          return;
        }
        return collectionCreateCommand(name, options);
      case "add":
        if (!name || !promptId) {
          outputError("missing_argument", "Usage: jfp collections add <collection> <prompt-id>");
          return;
        }
        return collectionAddCommand(name, promptId, options);
      case "export":
        if (!name) {
          outputError("missing_argument", "Usage: jfp collections export <collection>");
          return;
        }
        return exportCollectionCommand(name, options);
      default:
        if (options.add) {
          return collectionAddCommand(action, options.add, options);
        }
        if (options.export) {
          return exportCollectionCommand(action, options);
        }
        return collectionShowCommand(action, options);
    }
  });

cli
  .command("skills [action] [id]", "Skills marketplace (premium)")
  .option("--tool <tool>", "Filter by tool (e.g., claude-code, cursor)")
  .option("--category <category>", "Filter by category")
  .option("--mine", "Show only your skills")
  .option("--search <query>", "Search skills by name or description")
  .option("--limit <n>", "Max results (default: 20)")
  .option("--force", "Force install even if already installed")
  .option("--stdout", "Output to stdout instead of file")
  .option("--output <path>", "Output file or directory path")
  .option("--name <name>", "Name for new skill (with create)")
  .option("--description <text>", "Description for new skill (with create)")
  .option("--json", "Output JSON")
  .action((
    action: string | undefined,
    id: string | undefined,
    options: {
      tool?: string;
      category?: string;
      mine?: boolean;
      search?: string;
      limit?: number;
      force?: boolean;
      stdout?: boolean;
      output?: string;
      name?: string;
      description?: string;
      json?: boolean;
    }
  ) => {
    const outputError = (code: string, message: string) => {
      if (options.json) {
        console.log(JSON.stringify({ error: true, code, message }));
      } else {
        console.error(message);
      }
      process.exit(1);
    };

    // Default action is list
    if (!action || action === "list") {
      return skillsListCommand({
        tool: options.tool,
        category: options.category,
        mine: options.mine,
        search: options.search,
        limit: options.limit,
        json: options.json,
      });
    }

    switch (action) {
      case "install":
        if (!id) {
          outputError("missing_argument", "Usage: jfp skills install <id>");
          return;
        }
        return skillsInstallCommand(id, { json: options.json, force: options.force });
      case "export":
        if (!id) {
          outputError("missing_argument", "Usage: jfp skills export <id>");
          return;
        }
        return skillsExportCommand(id, {
          json: options.json,
          stdout: options.stdout,
          output: options.output,
        });
      case "create":
        return skillsCreateCommand({
          name: options.name ?? id,
          description: options.description,
          tool: options.tool,
          output: options.output,
          json: options.json,
        });
      default:
        outputError(
          "unknown_action",
          `Unknown skills action: ${action}. Available: list, install, export, create`
        );
    }
  });

cli
  .command("i", "Interactive mode - fzf-style prompt picker")
  .alias("interactive")
  .action(interactiveCommand);

cli
  .command("random", "Get a random prompt for discovery")
  .option("--category <category>", "Filter by category")
  .option("--tag <tag>", "Filter by tag")
  .option("--copy", "Copy to clipboard")
  .option("--json", "Output JSON")
  .action(randomCommand);

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
  .command("config [action] [key] [value]", "Manage CLI configuration")
  .option("--json", "Output JSON")
  .action((action: string | undefined, key: string | undefined, value: string | undefined, options: { json?: boolean }) => {
    const outputError = (code: string, message: string) => {
      if (options.json) {
        console.log(JSON.stringify({ error: true, code, message }));
      } else {
        console.error(message);
      }
      process.exit(1);
    };

    switch (action) {
      case "list":
      case undefined:
        return configListCommand(options);
      case "get":
        if (!key) {
          outputError("missing_argument", "Usage: jfp config get <key>");
          return;
        }
        return configGetCommand(key, options);
      case "set":
        if (!key || value === undefined) {
          outputError("missing_argument", "Usage: jfp config set <key> <value>");
          return;
        }
        return configSetCommand(key, value, options);
      case "reset":
        return configResetCommand(options);
      case "path":
        return configPathCommand(options);
      default:
        outputError("unknown_action", `Unknown config action: ${action}. Available: list, get, set, reset, path`);
    }
  });

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
