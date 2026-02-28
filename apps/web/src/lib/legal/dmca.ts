export type DmcaStatus = "pending" | "removed" | "counter_pending" | "restored" | "dismissed";
export type DmcaResolution = "removed" | "restored" | "dismissed";
export type DmcaContentType =
  | "prompt"
  | "bundle"
  | "workflow"
  | "collection"
  | "skill"
  | "other";

export const DMCA_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "removed", label: "Removed" },
  { value: "counter_pending", label: "Counter Notice" },
  { value: "restored", label: "Restored" },
  { value: "dismissed", label: "Dismissed" },
] as const;

export function isDmcaStatus(value: string): value is DmcaStatus {
  return DMCA_STATUSES.some((status) => status.value === value);
}

export interface DmcaRequest {
  id: string;
  claimantName: string;
  claimantEmail: string;
  claimantAddress: string;
  copyrightedWorkDescription: string;
  copyrightedWorkUrl?: string | null;
  infringingContentUrl: string;
  signature: string;
  signatureDate: string;
  contentType?: DmcaContentType | null;
  contentId?: string | null;
  contentOwnerId?: string | null;
  status: DmcaStatus;
  createdAt: string;
  updatedAt: string;
  counterNoticeAt?: string | null;
  counterNoticeContent?: string | null;
  counterSignature?: string | null;
  counterSignatureDate?: string | null;
  counterName?: string | null;
  counterEmail?: string | null;
  counterAddress?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolution?: DmcaResolution | null;
  reviewNotes?: string | null;
  strikeId?: string | null;
}

export interface DmcaCounterNoticeInput {
  requestId: string;
  name: string;
  email: string;
  address: string;
  statement: string;
  signature: string;
  signatureDate?: string | null;
}

export interface CopyrightStrike {
  id: string;
  userId: string;
  dmcaRequestId: string;
  reason: string;
  issuedAt: string;
  expiresAt?: string | null;
}

interface DmcaStore {
  requests: Map<string, DmcaRequest>;
  order: string[];
  strikes: Map<string, CopyrightStrike>;
  strikeOrder: string[];
}

const STORE_KEY = "__jfp_dmca_store__";
const MAX_DMCA_REQUESTS_IN_MEMORY = 10000;

function getStore(): DmcaStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: DmcaStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      requests: new Map(),
      order: [],
      strikes: new Map(),
      strikeOrder: [],
    };
  }

  return globalStore[STORE_KEY];
}

function touchRequest(store: DmcaStore, requestId: string) {
  store.order = [requestId, ...store.order.filter((id) => id !== requestId)];
}

function evictOldestDmcaRequestsIfNeeded(store: DmcaStore): void {
  if (store.requests.size <= MAX_DMCA_REQUESTS_IN_MEMORY) return;

  const numToRemove = Math.ceil(MAX_DMCA_REQUESTS_IN_MEMORY * 0.1);
  for (let i = 0; i < numToRemove; i++) {
    const oldestId = store.order.pop();
    if (oldestId) {
      store.requests.delete(oldestId);
    }
  }
}

function touchStrike(store: DmcaStore, strikeId: string) {
  store.strikeOrder = [strikeId, ...store.strikeOrder.filter((id) => id !== strikeId)];
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeText(value: string) {
  return value.trim();
}

export function createDmcaRequest(input: {
  claimantName: string;
  claimantEmail: string;
  claimantAddress: string;
  copyrightedWorkDescription: string;
  copyrightedWorkUrl?: string | null;
  infringingContentUrl: string;
  signature: string;
  signatureDate: string;
  contentType?: DmcaContentType | null;
  contentId?: string | null;
  contentOwnerId?: string | null;
}): DmcaRequest {
  const store = getStore();
  evictOldestDmcaRequestsIfNeeded(store);

  const now = new Date().toISOString();

  const request: DmcaRequest = {
    id: crypto.randomUUID(),
    claimantName: sanitizeText(input.claimantName),
    claimantEmail: normalizeEmail(input.claimantEmail),
    claimantAddress: sanitizeText(input.claimantAddress),
    copyrightedWorkDescription: sanitizeText(input.copyrightedWorkDescription),
    copyrightedWorkUrl: input.copyrightedWorkUrl ?? null,
    infringingContentUrl: input.infringingContentUrl,
    signature: sanitizeText(input.signature),
    signatureDate: input.signatureDate,
    contentType: input.contentType ?? null,
    contentId: input.contentId ?? null,
    contentOwnerId: input.contentOwnerId ?? null,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    counterNoticeAt: null,
    counterNoticeContent: null,
    counterSignature: null,
    counterSignatureDate: null,
    counterName: null,
    counterEmail: null,
    counterAddress: null,
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
    reviewNotes: null,
    strikeId: null,
  };

  store.requests.set(request.id, request);
  touchRequest(store, request.id);
  return request;
}

export function getDmcaRequest(requestId: string): DmcaRequest | null {
  const store = getStore();
  return store.requests.get(requestId) ?? null;
}

export function listDmcaRequests(filters?: {
  status?: DmcaStatus | "all";
  search?: string;
  limit?: number;
  page?: number;
}): DmcaRequest[] {
  const store = getStore();
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 50));
  const page = Math.max(1, filters?.page ?? 1);
  const normalizedSearch = filters?.search?.trim().toLowerCase();

  const requests = store.order
    .map((id) => store.requests.get(id))
    .filter((request): request is DmcaRequest => Boolean(request))
    .filter((request) => {
      if (filters?.status && filters.status !== "all" && request.status !== filters.status) {
        return false;
      }
      if (normalizedSearch) {
        const haystack = [
          request.claimantName,
          request.claimantEmail,
          request.infringingContentUrl,
          request.copyrightedWorkDescription,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

  const start = (page - 1) * limit;
  return requests.slice(start, start + limit);
}

export function getDmcaStats(): Record<DmcaStatus, number> {
  const store = getStore();
  const stats: Record<DmcaStatus, number> = {
    pending: 0,
    removed: 0,
    counter_pending: 0,
    restored: 0,
    dismissed: 0,
  };

  for (const request of store.requests.values()) {
    stats[request.status] += 1;
  }

  return stats;
}

export function submitCounterNotice(input: DmcaCounterNoticeInput): DmcaRequest | null {
  const store = getStore();
  const request = store.requests.get(input.requestId);
  if (!request) return null;
  if (request.status === "dismissed" || request.status === "restored") return null;

  const now = new Date().toISOString();
  request.counterNoticeAt = now;
  request.counterNoticeContent = sanitizeText(input.statement);
  request.counterSignature = sanitizeText(input.signature);
  request.counterSignatureDate = input.signatureDate ?? now;
  request.counterName = sanitizeText(input.name);
  request.counterEmail = normalizeEmail(input.email);
  request.counterAddress = sanitizeText(input.address);
  request.status = "counter_pending";
  request.updatedAt = now;

  store.requests.set(request.id, request);
  touchRequest(store, request.id);
  return request;
}

export function updateDmcaRequestStatus(input: {
  requestId: string;
  status: DmcaStatus;
  resolvedBy?: string | null;
  reviewNotes?: string | null;
  resolution?: DmcaResolution | null;
}): DmcaRequest | null {
  const store = getStore();
  const request = store.requests.get(input.requestId);
  if (!request) return null;

  const now = new Date().toISOString();
  request.status = input.status;
  request.reviewNotes = input.reviewNotes ?? request.reviewNotes ?? null;
  request.updatedAt = now;

  if (["removed", "restored", "dismissed"].includes(input.status)) {
    request.resolution = input.resolution ?? (input.status as DmcaResolution);
    request.resolvedAt = now;
    request.resolvedBy = input.resolvedBy ?? null;
  }

  if (input.status === "removed" && request.contentOwnerId && !request.strikeId) {
    const strike = issueCopyrightStrike({
      userId: request.contentOwnerId,
      dmcaRequestId: request.id,
      reason: "DMCA takedown",
    });
    request.strikeId = strike.id;
  }

  store.requests.set(request.id, request);
  touchRequest(store, request.id);
  return request;
}

export function issueCopyrightStrike(input: {
  userId: string;
  dmcaRequestId: string;
  reason: string;
  expiresAt?: string | null;
}): CopyrightStrike {
  const store = getStore();
  const now = new Date().toISOString();
  const strike: CopyrightStrike = {
    id: crypto.randomUUID(),
    userId: input.userId,
    dmcaRequestId: input.dmcaRequestId,
    reason: input.reason,
    issuedAt: now,
    expiresAt: input.expiresAt ?? null,
  };

  store.strikes.set(strike.id, strike);
  touchStrike(store, strike.id);
  return strike;
}

export function getActiveStrikeCount(userId: string): number {
  const store = getStore();
  const now = Date.now();

  return store.strikeOrder
    .map((id) => store.strikes.get(id))
    .filter((strike): strike is CopyrightStrike => Boolean(strike))
    .filter((strike) => strike.userId === userId)
    .filter((strike) => {
      if (!strike.expiresAt) return true;
      const expiresAt = new Date(strike.expiresAt).getTime();
      return Number.isNaN(expiresAt) ? true : expiresAt > now;
    }).length;
}
