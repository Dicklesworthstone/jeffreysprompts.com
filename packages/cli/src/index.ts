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

export const cli = cac("jfp");

cli
  .command("list", "List all prompts")
  .option("--category <category>", "Filter by category")
  .option("--tag <tag>", "Filter by tag")
  .option("--json", "Output JSON")
  .action(listCommand);

cli
  .command("search <query>", "Fuzzy search prompts")
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
  .option("--context <path>", "Append file context")
  .option("--stdin", "Read context from stdin")
  .option("--max-context <bytes>", "Max context bytes")
  .option("--json", "Output JSON")
  .action(renderCommand);

cli
  .command("copy <id>", "Copy prompt to clipboard")
  .action(copyCommand);

cli.help();
cli.version(version);

// Default command (no args)
cli.command("").action(() => {
  cli.outputHelp();
});