export function shouldOutputJson(options: { json?: boolean }): boolean {
  return options.json === true || !process.stdout.isTTY;
}
