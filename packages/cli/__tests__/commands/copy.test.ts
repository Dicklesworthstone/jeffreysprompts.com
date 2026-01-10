import { describe, it, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";

const spawnCalls: Array<{ cmd: string; args: string[] }> = [];
const spawnWrites: string[] = [];

const childProcessMock = {
  spawnSync: () => ({ status: 0, stdout: "", stderr: "" }),
  execSync: () => "",
  exec: () => {},
  fork: () => ({}),
  spawn: (cmd: string, args: string[] = []) => {
    spawnCalls.push({ cmd, args });

    if (cmd === "which") {
      return {
        on: (event: string, handler: (code?: number) => void) => {
          if (event === "close") {
            handler(1);
          }
          return undefined;
        },
      };
    }

    const stdin = {
      write: (data: string) => {
        spawnWrites.push(String(data));
      },
      end: () => undefined,
    };

    return {
      stdin,
      on: (event: string, handler: (code?: number) => void) => {
        if (event === "close") {
          handler(0);
        }
        return undefined;
      },
    };
  },
};

mock.module("child_process", () => childProcessMock);
mock.module("node:child_process", () => childProcessMock);

const { copyCommand } = await import("../../src/commands/copy");

let output: string[] = [];
let errors: string[] = [];

const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
  output = [];
  errors = [];
  spawnCalls.length = 0;
  spawnWrites.length = 0;
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
});

afterAll(() => {
  mock.restore();
});

describe("copyCommand", () => {
  it("copies prompt content using clipboard tool", async () => {
    await copyCommand("idea-wizard", {});

    const text = output.join("\n");
    expect(text).toContain("Copied");
    expect(spawnCalls.length).toBeGreaterThan(0);
    expect(spawnWrites.join("\n")).toContain("Come up with your very best ideas");
    expect(errors.length).toBe(0);
  });
});
