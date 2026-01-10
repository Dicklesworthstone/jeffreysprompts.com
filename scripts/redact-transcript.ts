import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, extname, join, basename } from "path";

const DEFAULT_INPUT = "apps/web/src/data/transcript.json";
const DEFAULT_OUTPUT = "apps/web/src/data/transcript.redacted.json";

interface RedactionRule {
  label: string;
  pattern: RegExp;
  replacement: string;
}

const REDACTION_RULES: RedactionRule[] = [
  {
    label: "OpenAI keys",
    pattern: /sk-[A-Za-z0-9]{16,}/g,
    replacement: "sk-REDACTED",
  },
  {
    label: "Bearer tokens",
    pattern: /Bearer\s+[A-Za-z0-9._~+\/=\-]+/gi,
    replacement: "Bearer [REDACTED]",
  },
  {
    label: "GitHub tokens",
    pattern: /ghp_[A-Za-z0-9]{20,}/g,
    replacement: "ghp_REDACTED",
  },
  {
    label: "Generic secret fields",
    pattern:
      /("?(?:api[_-]?key|secret|token|password|access[_-]?token|refresh[_-]?token)"?\s*:\s*)"[^"]*"/gi,
    replacement: "$1\"[REDACTED]\"",
  },
  {
    label: "Env assignments",
    pattern: /(API_KEY|SECRET|TOKEN|PASSWORD)=[^\s"']+/gi,
    replacement: "$1=[REDACTED]",
  },
  {
    label: "Authorization header",
    pattern: /("authorization"\s*:\s*)"[^"]+"/gi,
    replacement: "$1\"[REDACTED]\"",
  },
  {
    label: "macOS user paths",
    pattern: /(\/Users\/)([^/\s]+)(\/)/g,
    replacement: "$1<redacted>$3",
  },
  {
    label: "Linux home paths",
    pattern: /(\/home\/)([^/\s]+)(\/)/g,
    replacement: "$1<redacted>$3",
  },
  {
    label: "Windows user paths",
    pattern: /(C:\\Users\\)([^\\\s]+)(\\)/g,
    replacement: "$1<redacted>$3",
  },
];

function resolveOutputPath(inputPath: string, outputArg?: string): string {
  if (outputArg) return outputArg;
  if (inputPath === DEFAULT_INPUT) return DEFAULT_OUTPUT;

  const dir = dirname(inputPath);
  const ext = extname(inputPath) || ".json";
  const name = basename(inputPath, ext);
  return join(dir, `${name}.redacted${ext}`);
}

function redact(content: string): { result: string; applied: string[] } {
  let output = content;
  const applied: string[] = [];

  for (const rule of REDACTION_RULES) {
    const next = output.replace(rule.pattern, rule.replacement);
    if (next !== output) {
      applied.push(rule.label);
      output = next;
    }
  }

  return { result: output, applied };
}

function main() {
  const inputPath = process.argv[2] ?? DEFAULT_INPUT;
  const outputPath = resolveOutputPath(inputPath, process.argv[3]);

  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = readFileSync(inputPath, "utf-8");
  const { result, applied } = redact(raw);

  writeFileSync(outputPath, result, "utf-8");

  const labels = applied.length ? applied.join(", ") : "none";
  console.log(`Redacted transcript written to ${outputPath}`);
  console.log(`Applied rules: ${labels}`);
}

main();
