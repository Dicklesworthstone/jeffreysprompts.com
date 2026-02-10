/**
 * Tests for completion command — shell completion script generation
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { completionCommand } from "../../src/commands/completion";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;

  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit(${code})`);
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

describe("completionCommand", () => {
  it("generates bash completion script", () => {
    completionCommand({ shell: "bash" });
    const script = output.join("\n");
    expect(script).toContain("_jfp_completions");
    expect(script).toContain("complete -F _jfp_completions jfp");
  });

  it("generates zsh completion script", () => {
    completionCommand({ shell: "zsh" });
    const script = output.join("\n");
    expect(script).toContain("#compdef jfp");
    expect(script).toContain("compdef _jfp jfp");
  });

  it("generates fish completion script", () => {
    completionCommand({ shell: "fish" });
    const script = output.join("\n");
    expect(script).toContain("complete -c jfp");
    expect(script).toContain("__fish_use_subcommand");
  });

  it("bash script includes all commands", () => {
    completionCommand({ shell: "bash" });
    const script = output.join("\n");
    expect(script).toContain("list");
    expect(script).toContain("search");
    expect(script).toContain("show");
    expect(script).toContain("export");
    expect(script).toContain("login");
    expect(script).toContain("interactive");
  });

  it("bash script includes option completions for --shell", () => {
    completionCommand({ shell: "bash" });
    const script = output.join("\n");
    expect(script).toContain("bash zsh fish");
  });

  it("zsh script includes option specs", () => {
    completionCommand({ shell: "zsh" });
    const script = output.join("\n");
    expect(script).toContain("--json");
    expect(script).toContain("--shell");
  });

  it("fish script includes command-specific options", () => {
    completionCommand({ shell: "fish" });
    const script = output.join("\n");
    expect(script).toContain("__fish_seen_subcommand_from");
  });

  it("normalizes shell name case-insensitively", () => {
    completionCommand({ shell: "BASH" });
    const script = output.join("\n");
    expect(script).toContain("_jfp_completions");
  });

  it("exits with error for unknown shell when no SHELL env", () => {
    const origShell = process.env.SHELL;
    delete process.env.SHELL;
    try {
      completionCommand({ shell: "powershell" });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    } finally {
      if (origShell) process.env.SHELL = origShell;
    }
    expect(exitCode).toBe(1);
    expect(errors.join(" ")).toContain("Unknown shell");
  });

  it("uses CAC context when provided", () => {
    const mockOutput = "# CAC generated completion";
    completionCommand({ shell: "bash" }, {
      generateCompletion: () => mockOutput,
    });
    expect(output.join("")).toBe(mockOutput);
  });
});
