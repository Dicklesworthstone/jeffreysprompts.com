import chalk from "chalk";

const SUPPORTED_SHELLS = ["bash", "zsh", "fish"] as const;
type SupportedShell = (typeof SUPPORTED_SHELLS)[number];

interface CompletionOptions {
  shell?: string;
}

interface CompletionContext {
  generateCompletion?: (arg?: unknown) => unknown;
  completion?: (arg?: unknown) => unknown;
}

const COMMANDS = [
  "list",
  "search",
  "show",
  "install",
  "uninstall",
  "export",
  "render",
  "copy",
  "installed",
  "update",
  "suggest",
  "bundles",
  "bundle",
  "status",
  "refresh",
  "i",
  "interactive",
  "categories",
  "tags",
  "open",
  "doctor",
  "about",
  "help",
  "completion",
  "serve",
  "update-cli",
] as const;

const COMMAND_OPTIONS: Record<string, string[]> = {
  list: ["--category", "--tag", "--json"],
  search: ["--limit", "--json"],
  show: ["--json", "--raw"],
  install: ["--project", "--all", "--bundle", "--force", "--json"],
  uninstall: ["--project", "--confirm", "--json"],
  export: ["--format", "--all", "--stdout", "--json"],
  render: ["--fill", "--context", "--stdin", "--max-context", "--json"],
  copy: ["--fill", "--json"],
  installed: ["--personal", "--project", "--json"],
  update: ["--personal", "--project", "--dry-run", "--diff", "--force", "--json"],
  suggest: ["--json", "--limit", "--semantic"],
  bundles: ["--json"],
  bundle: ["--json"],
  status: ["--json"],
  refresh: ["--json"],
  i: [],
  interactive: [],
  categories: ["--json"],
  tags: ["--json"],
  open: [],
  doctor: ["--json"],
  about: ["--json"],
  help: ["--json"],
  completion: ["--shell"],
  serve: ["--config"],
  "update-cli": ["--check", "--force", "--json"],
};

const GLOBAL_OPTIONS = ["--help", "--version"];

const OPTION_VALUES: Record<string, string[]> = {
  "--shell": [...SUPPORTED_SHELLS],
  "--format": ["skill", "md"],
};

function normalizeShell(value?: string): SupportedShell | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  return SUPPORTED_SHELLS.includes(lower as SupportedShell)
    ? (lower as SupportedShell)
    : null;
}

function detectShell(): SupportedShell | null {
  const env = process.env.SHELL || "";
  if (env.includes("zsh")) return "zsh";
  if (env.includes("bash")) return "bash";
  if (env.includes("fish")) return "fish";
  return null;
}

function tryCacCompletion(shell: SupportedShell, context?: CompletionContext): string | null {
  if (!context) return null;
  const generator = context.generateCompletion || context.completion;
  if (typeof generator !== "function") return null;

  try {
    const result = generator({ shell });
    if (typeof result === "string" && result.trim()) {
      return result;
    }
  } catch {
    return null;
  }

  return null;
}

function getCommandOptions(command: string): string[] {
  return COMMAND_OPTIONS[command] ?? [];
}

function buildBashCompletion(): string {
  const commandList = COMMANDS.join(" ");
  const bashOptionsCase = Object.entries(COMMAND_OPTIONS)
    .map(([cmd, opts]) => `    ${cmd}) opts="${opts.join(" ")}" ;;`)
    .join("\n");

  const globalOpts = GLOBAL_OPTIONS.join(" ");
  const shellValues = OPTION_VALUES["--shell"].join(" ");
  const formatValues = OPTION_VALUES["--format"].join(" ");

  return `# bash completion for jfp\n` +
`_jfp_completions() {\n` +
`  local cur prev cmd opts\n` +
`  COMPREPLY=()\n` +
`  cur=\"\${COMP_WORDS[COMP_CWORD]}\"\n` +
`  prev=\"\${COMP_WORDS[COMP_CWORD-1]}\"\n\n` +
`  case \"$prev\" in\n` +
`    --shell)\n` +
`      COMPREPLY=( $(compgen -W \"${shellValues}\" -- \"$cur\") )\n` +
`      return 0\n` +
`      ;;\n` +
`    --format)\n` +
`      COMPREPLY=( $(compgen -W \"${formatValues}\" -- \"$cur\") )\n` +
`      return 0\n` +
`      ;;\n` +
`  esac\n\n` +
`  for word in \"\${COMP_WORDS[@]:1}\"; do\n` +
`    if [[ \"$word\" != -* ]]; then\n` +
`      cmd=\"$word\"\n` +
`      break\n` +
`    fi\n` +
`  done\n\n` +
`  if [[ -z \"$cmd\" ]]; then\n` +
`    if [[ \"$cur\" == -* ]]; then\n` +
`      COMPREPLY=( $(compgen -W \"${globalOpts}\" -- \"$cur\") )\n` +
`      return 0\n` +
`    fi\n` +
`    COMPREPLY=( $(compgen -W \"${commandList}\" -- \"$cur\") )\n` +
`    return 0\n` +
`  fi\n\n` +
`  opts=\"\"\n` +
`  case \"$cmd\" in\n` +
`${bashOptionsCase}\n` +
`  esac\n\n` +
`  if [[ \"$cur\" == -* ]]; then\n` +
`    COMPREPLY=( $(compgen -W \"$opts ${globalOpts}\" -- \"$cur\") )\n` +
`  fi\n` +
`}\n\n` +
`complete -F _jfp_completions jfp\n`;
}

function buildZshCompletion(): string {
  const commandList = COMMANDS.join(" ");
  const zshOptionSpec = (opt: string) => {
    if (opt === "--shell") {
      return "'--shell=[Target shell]:shell:(bash zsh fish)'";
    }
    if (opt === "--format") {
      return "'--format=[Export format]:format:(skill md)'";
    }
    return `'${opt}'`;
  };

  const zshOptionsCase = Object.entries(COMMAND_OPTIONS)
    .map(([cmd, opts]) => {
      if (opts.length === 0) {
        return `    ${cmd}) _arguments ${GLOBAL_OPTIONS.map((opt) => `'${opt}'`).join(" ")} ;;`;
      }
      const specs = opts.map(zshOptionSpec).join(" ");
      const globals = GLOBAL_OPTIONS.map((opt) => `'${opt}'`).join(" ");
      return `    ${cmd}) _arguments ${specs} ${globals} ;;`;
    })
    .join("\n");

  return `#compdef jfp\n\n` +
`_jfp() {\n` +
`  local state\n` +
`  _arguments -C \\\n` +
`    '1:command:->command' \\\n` +
`    '*::arg:->args'\n\n` +
`  case $state in\n` +
`    command)\n` +
`      _values 'command' ${commandList}\n` +
`      ;;\n` +
`    args)\n` +
`      case $words[2] in\n` +
`${zshOptionsCase}\n` +
`      esac\n` +
`      ;;\n` +
`  esac\n` +
`}\n\n` +
`compdef _jfp jfp\n`;
}

function buildFishCompletion(): string {
  const commandList = COMMANDS.join(" ");
  const lines: string[] = [];

  lines.push(`# fish completion for jfp`);
  lines.push(`complete -c jfp -n "__fish_use_subcommand" -a "${commandList}"`);

  for (const cmd of COMMANDS) {
    const opts = getCommandOptions(cmd);
    if (opts.length === 0) continue;
    for (const opt of opts) {
      if (opt === "--shell") {
        lines.push(
          `complete -c jfp -n "__fish_seen_subcommand_from ${cmd}" -l shell -a "bash zsh fish" -d "Target shell"`
        );
        continue;
      }
      if (opt === "--format") {
        lines.push(
          `complete -c jfp -n "__fish_seen_subcommand_from ${cmd}" -l format -a "skill md" -d "Export format"`
        );
        continue;
      }
      const flag = opt.replace(/^--/, "");
      lines.push(
        `complete -c jfp -n "__fish_seen_subcommand_from ${cmd}" -l ${flag}`
      );
    }
  }

  for (const opt of GLOBAL_OPTIONS) {
    const flag = opt.replace(/^--/, "");
    lines.push(`complete -c jfp -l ${flag}`);
  }

  return lines.join("\n") + "\n";
}

function buildCompletion(shell: SupportedShell): string {
  switch (shell) {
    case "bash":
      return buildBashCompletion();
    case "zsh":
      return buildZshCompletion();
    case "fish":
      return buildFishCompletion();
    default:
      return "";
  }
}

export function completionCommand(options: CompletionOptions, context?: CompletionContext) {
  const resolved = normalizeShell(options.shell) ?? detectShell();

  if (!resolved) {
    console.error(chalk.red("Error: Unknown shell."));
    console.error(
      chalk.dim("Use: jfp completion --shell bash|zsh|fish")
    );
    process.exit(1);
  }

  const generated = tryCacCompletion(resolved, context);
  if (generated) {
    console.log(generated.trimEnd());
    return;
  }

  const output = buildCompletion(resolved);
  if (!output) {
    console.error(chalk.red(`Error: Unsupported shell '${resolved}'.`));
    process.exit(1);
  }

  console.log(output.trimEnd());
}
