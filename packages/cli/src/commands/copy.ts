import { spawn } from "child_process";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { renderPrompt } from "@jeffreysprompts/core/template/render";
import chalk from "chalk";

interface CopyOptions {
  fill?: boolean; // Not fully implemented yet, treating as optional
}

function parseVariables(args: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const arg of args) {
    const match = arg.match(/^--([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

export async function copyCommand(id: string, options: CopyOptions) {
  const prompt = getPrompt(id);
  if (!prompt) {
    console.error(chalk.red(`Prompt not found: ${id}`));
    process.exit(1);
  }

  const variables = parseVariables(process.argv);
  const rendered = renderPrompt(prompt, variables);

  const platform = process.platform;
  let cmd: string;
  let args: string[] = [];

  if (platform === "darwin") {
    cmd = "pbcopy";
  } else if (platform === "win32") {
    cmd = "clip";
  } else {
    // Linux check
    try {
        const hasWlCopy = await new Promise(r => {
             const check = spawn("which", ["wl-copy"]);
             check.on("close", (code) => r(code === 0));
        });
        
        if (hasWlCopy) {
            cmd = "wl-copy";
        } else {
            cmd = "xclip";
            args = ["-selection", "clipboard"];
        }
    } catch {
        cmd = "xclip";
        args = ["-selection", "clipboard"];
    }
  }

  const proc = spawn(cmd, args, { stdio: ["pipe", "inherit", "inherit"] });
  proc.stdin?.write(rendered);
  proc.stdin?.end();

  await new Promise<void>((resolve) => {
    proc.on("close", (code) => {
      if (code === 0) {
        console.log(chalk.green(`✓ Copied "${prompt.title}" to clipboard`));
      } else {
        console.error(chalk.yellow("Clipboard copy failed. Outputting to stdout:"));
        console.log(rendered);
      }
      resolve();
    });
    proc.on("error", () => {
       console.error(chalk.yellow("Clipboard tool not found. Outputting to stdout:"));
       console.log(rendered);
       resolve();
    });
  });
}
