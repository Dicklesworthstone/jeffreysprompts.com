import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

export type ShareContentType = "prompt" | "bundle" | "workflow" | "collection";

// Password hashing configuration
// Using PBKDF2-SHA256 with 100,000 iterations (OWASP recommended minimum)
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

export interface ShareLink {
  id: string;
  userId?: string | null;
  contentType: ShareContentType;
  contentId: string;
  linkCode: string;
  passwordHash?: string | null;
  expiresAt?: string | null;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ShareLinkView {
  id: string;
  linkId: string;
  viewerId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  viewedAt: string;
}

interface ShareLinkStore {
  links: Map<string, ShareLink>;
  linksByCode: Map<string, string>;
  views: Map<string, ShareLinkView[]>;
  order: string[];
}

const STORE_KEY = "__jfp_share_link_store__";
const CODE_LENGTH = 12;
const MAX_CODE_ATTEMPTS = 10;
const MAX_VIEWS_PER_LINK = 1000;
const MAX_LINKS_IN_MEMORY = 50000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function getStore(): ShareLinkStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ShareLinkStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      links: new Map(),
      linksByCode: new Map(),
      views: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function touchLink(store: ShareLinkStore, linkId: string) {
  store.order = [linkId, ...store.order.filter((id) => id !== linkId)];
}

function evictOldestLinksIfNeeded(store: ShareLinkStore): void {
  if (store.links.size <= MAX_LINKS_IN_MEMORY) return;

  const numToRemove = Math.ceil(MAX_LINKS_IN_MEMORY * 0.1);
  for (let i = 0; i < numToRemove; i++) {
    const oldestId = store.order.pop();
    if (oldestId) {
      const link = store.links.get(oldestId);
      if (link) {
        store.linksByCode.delete(link.linkCode);
      }
      store.links.delete(oldestId);
      store.views.delete(oldestId);
    }
  }
}

/**
 * Generate a cryptographically secure link code.
 * Uses randomBytes with rejection sampling to prevent modulo bias.
 *
 * Security note: Simple `byte % charSetLength` creates modulo bias when
 * 256 doesn't divide evenly by the character set length (57 chars here).
 * This would make some characters ~3% more likely than others.
 * Rejection sampling ensures uniform distribution.
 */
function createLinkCode(): string {
  const charSetLength = CODE_CHARS.length; // 57
  // Maximum byte value that divides evenly: floor(256 / 57) * 57 = 228
  // Values 0-227 are unbiased, 228-255 would cause bias
  const maxUnbiasedValue = Math.floor(256 / charSetLength) * charSetLength;

  let code = "";
  while (code.length < CODE_LENGTH) {
    // Generate extra bytes to account for rejected values
    const bytesNeeded = (CODE_LENGTH - code.length) * 2;
    const bytes = randomBytes(bytesNeeded);
    for (const byte of bytes) {
      if (code.length >= CODE_LENGTH) break;
      // Rejection sampling: only use bytes in unbiased range
      if (byte < maxUnbiasedValue) {
        code += CODE_CHARS[byte % charSetLength];
      }
    }
  }
  return code;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Hash a password using PBKDF2-SHA256 with random salt.
 * Returns format: "salt:hash" where both are hex-encoded.
 *
 * Security properties:
 * - Random 128-bit salt prevents rainbow table attacks
 * - 100,000 iterations provides computational resistance
 * - PBKDF2 is NIST-approved for password hashing
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha256");
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a password against a stored hash using constant-time comparison.
 *
 * Security properties:
 * - Uses timingSafeEqual to prevent timing attacks
 * - Handles both new (salt:hash) and legacy (plain SHA256) formats
 * - Returns true if no password is required (hash is null/undefined)
 */
export function verifyPassword(password: string, hash: string | null | undefined): boolean {
  // Constant-time branch: always compute a hash to prevent timing attacks
  // that could reveal whether a share link has a password set
  if (!hash) {
    // Dummy hash computation to match timing of password-protected case
    const dummySalt = Buffer.alloc(SALT_LENGTH, 0);
    pbkdf2Sync(password || "dummy", dummySalt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha256");
    return true;
  }

  // Check if this is the new salt:hash format
  if (hash.includes(":")) {
    const [saltHex, storedHashHex] = hash.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(storedHashHex, "hex");

    const computedHash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha256");

    // Constant-time comparison prevents timing attacks
    if (storedHash.length !== computedHash.length) {
      return false;
    }
    return timingSafeEqual(storedHash, computedHash);
  }

  // Legacy format: plain SHA256 (for backwards compatibility with existing links)
  // Note: New links should always use the salt:hash format
  const legacyHash = hashValue(password);
  const storedBuffer = Buffer.from(hash, "hex");
  const computedBuffer = Buffer.from(legacyHash, "hex");

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }
  return timingSafeEqual(storedBuffer, computedBuffer);
}

export function createShareLink(input: {
  userId?: string | null;
  contentType: ShareContentType;
  contentId: string;
  password?: string | null;
  expiresAt?: string | null;
}): ShareLink {
  const store = getStore();
  evictOldestLinksIfNeeded(store);

  const now = new Date().toISOString();

  let linkCode = "";
  let attempts = 0;
  while (!linkCode || store.linksByCode.has(linkCode)) {
    linkCode = createLinkCode();
    attempts += 1;
    if (attempts > MAX_CODE_ATTEMPTS) {
      // Use cryptographically secure random for collision fallback
      const extraByte = randomBytes(1)[0] % 10;
      linkCode = `${createLinkCode()}${extraByte}`.slice(0, CODE_LENGTH);
    }
  }

  const link: ShareLink = {
    id: crypto.randomUUID(),
    userId: input.userId ?? null,
    contentType: input.contentType,
    contentId: input.contentId,
    linkCode,
    passwordHash: input.password ? hashPassword(input.password) : null,
    expiresAt: input.expiresAt ?? null,
    viewCount: 0,
    isActive: true,
    createdAt: now,
  };

  store.links.set(link.id, link);
  store.linksByCode.set(link.linkCode, link.id);
  store.views.set(link.id, []);
  touchLink(store, link.id);
  return link;
}

export function getShareLinkByCode(code: string): ShareLink | null {
  const store = getStore();
  const linkId = store.linksByCode.get(code);
  if (!linkId) return null;
  return store.links.get(linkId) ?? null;
}

export function listShareLinks(filters?: {
  userId?: string | null;
  includeInactive?: boolean;
}): ShareLink[] {
  const store = getStore();
  const includeInactive = filters?.includeInactive ?? false;
  const userId = filters?.userId ?? null;

  return store.order
    .map((id) => store.links.get(id))
    .filter((link): link is ShareLink => Boolean(link))
    .filter((link) => {
      if (!includeInactive && !link.isActive) return false;
      if (userId && link.userId !== userId) return false;
      return true;
    });
}

export function updateShareLinkSettings(input: {
  code: string;
  password?: string | null;
  expiresAt?: string | null;
}): ShareLink | null {
  const store = getStore();
  const link = getShareLinkByCode(input.code);
  if (!link) return null;

  if (input.password !== undefined) {
    link.passwordHash = input.password ? hashPassword(input.password) : null;
  }
  if (input.expiresAt !== undefined) {
    link.expiresAt = input.expiresAt;
  }

  store.links.set(link.id, link);
  touchLink(store, link.id);
  return link;
}

export function revokeShareLink(code: string): ShareLink | null {
  const store = getStore();
  const link = getShareLinkByCode(code);
  if (!link) return null;
  link.isActive = false;
  store.links.set(link.id, link);
  touchLink(store, link.id);
  return link;
}

export function recordShareLinkView(input: {
  linkId: string;
  viewerId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): ShareLinkView | null {
  const store = getStore();
  const link = store.links.get(input.linkId);
  if (!link) return null;

  const view: ShareLinkView = {
    id: crypto.randomUUID(),
    linkId: input.linkId,
    viewerId: input.viewerId ?? null,
    ipHash: input.ip ? hashValue(input.ip) : null,
    userAgent: input.userAgent ?? null,
    viewedAt: new Date().toISOString(),
  };

  const list = store.views.get(input.linkId) ?? [];
  list.push(view);
  // Evict oldest views to prevent unbounded memory growth
  if (list.length > MAX_VIEWS_PER_LINK) {
    list.splice(0, list.length - MAX_VIEWS_PER_LINK);
  }
  store.views.set(input.linkId, list);

  link.viewCount += 1;
  store.links.set(link.id, link);
  touchLink(store, link.id);

  return view;
}
