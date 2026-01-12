/**
 * Username Validation Utilities
 *
 * Username rules:
 * - 3-20 characters
 * - Lowercase letters, numbers, underscores
 * - Must start with a letter (not number)
 * - No reserved words
 */

export const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

export const RESERVED_USERNAMES = [
  // System routes
  "admin", "api", "help", "support", "contact", "about", "settings", "profile",
  "user", "users", "login", "logout", "signup", "register", "auth",
  // Feature routes
  "prompts", "bundles", "workflows", "pricing", "terms", "privacy",
  "contribute", "guidelines", "changelog", "install", "download",
  // Common reserved
  "root", "system", "moderator", "mod", "staff", "official", "null",
  "undefined", "anonymous", "guest", "public", "private", "test",
] as const;

/**
 * Check if a username is valid
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  if (!USERNAME_REGEX.test(username)) return false;
  if (RESERVED_USERNAMES.includes(username as typeof RESERVED_USERNAMES[number])) return false;
  return true;
}

/**
 * Validate username and return error message if invalid
 */
export function validateUsername(username: string): { valid: true } | { valid: false; error: string } {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (username.length > 20) {
    return { valid: false, error: "Username must be 20 characters or less" };
  }

  if (!/^[a-z]/.test(username)) {
    return { valid: false, error: "Username must start with a letter" };
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return { valid: false, error: "Username can only contain lowercase letters, numbers, and underscores" };
  }

  if (RESERVED_USERNAMES.includes(username as typeof RESERVED_USERNAMES[number])) {
    return { valid: false, error: "This username is reserved" };
  }

  return { valid: true };
}

/**
 * Normalize a username (lowercase, trim)
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}
