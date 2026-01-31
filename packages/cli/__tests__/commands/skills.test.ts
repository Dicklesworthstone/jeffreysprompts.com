import { describe, it, expect } from "bun:test";
import { spawnJfp } from "@jeffreysprompts/core/testing";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dir, "../../../..");

async function runJfp(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await spawnJfp([...args, "--json"], {
    cwd: PROJECT_ROOT,
    timeout: 15000,
  });

  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe("deprecated skill commands", () => {
  it("install command redirects to jsm", async () => {
    const result = await runJfp(["install", "idea-wizard"]);
    const payload = JSON.parse(result.stdout);
    expect(result.exitCode).toBe(1);
    expect(payload.code).toBe("deprecated_command");
    expect(payload.message).toContain("jsm install <skill>");
  });

  for (const command of ["uninstall", "installed", "update", "skills"]) {
    it(`${command} command redirects to jsm`, async () => {
      const result = await runJfp(command === "uninstall" ? [command, "idea-wizard"] : [command]);
      const payload = JSON.parse(result.stdout);
      expect(result.exitCode).toBe(1);
      expect(payload.code).toBe("deprecated_command");
      expect(payload.message).toContain("jsm --help");
    });
  }
});

describe("export command", () => {
  it("rejects skill format", async () => {
    const result = await runJfp(["export", "--format", "skill"]);
    const payload = JSON.parse(result.stdout);
    expect(result.exitCode).toBe(1);
    expect(payload.code).toBe("deprecated_command");
    expect(payload.message).toContain("jsm --help");
  });
});
