import { describe, it, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";
import { join, resolve } from "path";

const files = new Map<string, string>();
const dirs = new Set<string>();

const normalize = (path: string) => path.replace(/\\/g, "/");

const fsMock = {
  existsSync: (path: string) => {
    const key = normalize(String(path));
    return files.has(key) || dirs.has(key);
  },
  mkdirSync: (path: string) => {
    const key = normalize(String(path));
    dirs.add(key);
  },
  writeFileSync: (path: string, content: string) => {
    const key = normalize(String(path));
    files.set(key, String(content));
    const dir = key.slice(0, Math.max(0, key.lastIndexOf("/")));
    if (dir) dirs.add(dir);
  },
  readFileSync: (path: string) => {
    const key = normalize(String(path));
    const value = files.get(key);
    if (value === undefined) {
      throw new Error("ENOENT");
    }
    return value;
  },
  rmSync: (path: string) => {
    const key = normalize(String(path));
    for (const entry of Array.from(files.keys())) {
      if (entry === key || entry.startsWith(key + "/")) {
        files.delete(entry);
      }
    }
    for (const entry of Array.from(dirs.values())) {
      if (entry === key || entry.startsWith(key + "/")) {
        dirs.delete(entry);
      }
    }
  },
  // Additional exports to prevent leaking mock issues
  unlinkSync: () => {},
  readdirSync: () => [],
  statSync: () => ({ size: 0, isFile: () => true, isDirectory: () => false }),
};

mock.module("fs", () => fsMock);
mock.module("node:fs", () => fsMock);

const osMock = {
  homedir: () => "/mock/home",
  default: { homedir: () => "/mock/home" },
};

mock.module("os", () => osMock);
mock.module("node:os", () => osMock);

const { installCommand } = await import("../../src/commands/install");
const { uninstallCommand } = await import("../../src/commands/uninstall");
const { installedCommand } = await import("../../src/commands/installed");
const { updateCommand } = await import("../../src/commands/update");

let output: string[] = [];
let errors: string[] = [];
let warnings: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalExit = process.exit;

const personalDir = normalize(join("/mock/home", ".config/claude/skills"));

function writeManifest(dir: string, entries: Array<Record<string, string>>) {
  const manifest = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    jfpVersion: "1.0.0",
    entries,
  };
  const manifestPath = normalize(join(dir, "manifest.json"));
  files.set(manifestPath, JSON.stringify(manifest));
  dirs.add(normalize(dir));
}

beforeEach(() => {
  output = [];
  errors = [];
  warnings = [];
  exitCode = undefined;
  files.clear();
  dirs.clear();
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  console.warn = (...args: unknown[]) => {
    warnings.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error("process.exit");
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
  process.exit = originalExit;
});

afterAll(() => {
  mock.restore();
});

describe("installCommand", () => {
  it("installs a prompt and outputs JSON", () => {
    installCommand(["idea-wizard"], { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.installed).toContain("idea-wizard");
    expect(payload.failed.length).toBe(0);
    expect(payload.targetDir).toContain(".config/claude/skills");

    const skillPath = normalize(join(personalDir, "idea-wizard", "SKILL.md"));
    expect(files.has(skillPath)).toBe(true);
  });

  it("exits when no ids are provided", () => {
    expect(() => installCommand([], { json: true })).toThrow();
    expect(errors.join("\n")).toContain("No prompts specified");
    expect(exitCode).toBe(1);
  });
});

describe("uninstallCommand", () => {
  it("removes a skill and outputs JSON", () => {
    const skillDir = normalize(join(personalDir, "idea-wizard"));
    const skillPath = normalize(join(skillDir, "SKILL.md"));
    files.set(skillPath, "---\nx_jfp_generated: true\n---\nOld");
    dirs.add(skillDir);

    writeManifest(personalDir, [
      {
        id: "idea-wizard",
        kind: "prompt",
        version: "1.0.0",
        hash: "old-hash",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    uninstallCommand(["idea-wizard"], { json: true, confirm: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.removed).toContain("idea-wizard");
    expect(files.has(skillPath)).toBe(false);
  });
});

describe("installedCommand", () => {
  it("lists installed skills from personal and project manifests", () => {
    const projectDir = normalize(resolve(process.cwd(), ".claude/skills"));

    writeManifest(personalDir, [
      {
        id: "idea-wizard",
        kind: "prompt",
        version: "1.0.0",
        hash: "hash-1",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    writeManifest(projectDir, [
      {
        id: "readme-reviser",
        kind: "prompt",
        version: "1.0.0",
        hash: "hash-2",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    installedCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.installed.length).toBe(2);
    expect(payload.locations.personal).toContain(".config/claude/skills");
    expect(payload.locations.project).toContain(".claude/skills");
  });
});

describe("updateCommand", () => {
  it("reports updates in dry-run JSON output", () => {
    const skillDir = normalize(join(personalDir, "idea-wizard"));
    const skillPath = normalize(join(skillDir, "SKILL.md"));
    files.set(skillPath, "---\nx_jfp_generated: true\n---\nOld content");
    dirs.add(skillDir);

    writeManifest(personalDir, [
      {
        id: "idea-wizard",
        kind: "prompt",
        version: "1.0.0",
        hash: "old-hash",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    updateCommand({ json: true, dryRun: true, diff: true, force: true, personal: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.dryRun).toBe(true);
    expect(payload.updated.length).toBeGreaterThan(0);
    expect(payload.updated[0].id).toBe("idea-wizard");
    expect(payload.updated[0]).toHaveProperty("diff");
  });
});
