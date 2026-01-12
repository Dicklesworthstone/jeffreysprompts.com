export type ReportStatus = "pending" | "reviewed" | "actioned" | "dismissed";
export type ReportAction = "dismiss" | "warn" | "remove" | "ban";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading content" },
  { value: "offensive", label: "Inappropriate or offensive" },
  { value: "copyright", label: "Copyright violation" },
  { value: "harmful", label: "Contains harmful content" },
  { value: "other", label: "Other" },
] as const;

export const REPORT_CONTENT_TYPES = [
  "prompt",
  "bundle",
  "workflow",
  "collection",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportContentType = (typeof REPORT_CONTENT_TYPES)[number];

const REPORT_REASON_SET = new Set(REPORT_REASONS.map((item) => item.value));
const REPORT_CONTENT_TYPE_SET = new Set(REPORT_CONTENT_TYPES);

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASON_SET.has(value as ReportReason);
}

export function isReportContentType(value: string): value is ReportContentType {
  return REPORT_CONTENT_TYPE_SET.has(value as ReportContentType);
}

export function getReportReasonLabel(reason: string): string {
  return REPORT_REASONS.find((item) => item.value === reason)?.label ?? reason;
}

export interface ReportReporter {
  id: string;
  name?: string | null;
  email?: string | null;
  ip?: string | null;
}

export interface ContentReport {
  id: string;
  contentType: ReportContentType;
  contentId: string;
  contentTitle?: string | null;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  action?: ReportAction | null;
  reviewNotes?: string | null;
  reporter: ReportReporter;
}

interface ReportStore {
  reports: Map<string, ContentReport>;
  order: string[];
}

const STORE_KEY = "__jfp_content_report_store__";

function getStore(): ReportStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ReportStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      reports: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function touchReport(store: ReportStore, reportId: string) {
  store.order = [reportId, ...store.order.filter((id) => id !== reportId)];
}

export function createContentReport(input: {
  contentType: ReportContentType;
  contentId: string;
  contentTitle?: string | null;
  reason: ReportReason;
  details?: string | null;
  reporter?: Partial<ReportReporter>;
}): ContentReport {
  const store = getStore();
  const now = new Date().toISOString();

  const report: ContentReport = {
    id: crypto.randomUUID(),
    contentType: input.contentType,
    contentId: input.contentId,
    contentTitle: input.contentTitle ?? null,
    reason: input.reason,
    details: input.details ?? null,
    status: "pending",
    createdAt: now,
    reviewedAt: null,
    reviewedBy: null,
    action: null,
    reviewNotes: null,
    reporter: {
      id: input.reporter?.id ?? "anonymous",
      name: input.reporter?.name ?? "Anonymous",
      email: input.reporter?.email ?? null,
      ip: input.reporter?.ip ?? null,
    },
  };

  store.reports.set(report.id, report);
  touchReport(store, report.id);
  return report;
}

export function getContentReport(reportId: string): ContentReport | null {
  const store = getStore();
  return store.reports.get(reportId) ?? null;
}

export function listContentReports(filters?: {
  status?: ReportStatus | "all";
  contentType?: ReportContentType | "all";
  reason?: ReportReason | "all";
  limit?: number;
  page?: number;
}): ContentReport[] {
  const store = getStore();
  const limit = filters?.limit ?? 50;
  const page = Math.max(1, filters?.page ?? 1);

  const reports = store.order
    .map((id) => store.reports.get(id))
    .filter((report): report is ContentReport => Boolean(report))
    .filter((report) => {
      if (filters?.status && filters.status !== "all" && report.status !== filters.status) {
        return false;
      }
      if (filters?.contentType && filters.contentType !== "all" && report.contentType !== filters.contentType) {
        return false;
      }
      if (filters?.reason && filters.reason !== "all" && report.reason !== filters.reason) {
        return false;
      }
      return true;
    });

  const start = (page - 1) * limit;
  return reports.slice(start, start + limit);
}

export function getReportStats(): Record<ReportStatus, number> {
  const store = getStore();
  const stats: Record<ReportStatus, number> = {
    pending: 0,
    reviewed: 0,
    actioned: 0,
    dismissed: 0,
  };

  for (const report of store.reports.values()) {
    stats[report.status] += 1;
  }

  return stats;
}

export function updateContentReport(input: {
  reportId: string;
  action: ReportAction;
  reviewerId?: string | null;
  notes?: string | null;
}): ContentReport | null {
  const store = getStore();
  const report = store.reports.get(input.reportId);
  if (!report) return null;

  const now = new Date().toISOString();
  report.action = input.action;
  report.reviewNotes = input.notes ?? null;
  report.reviewedAt = now;
  report.reviewedBy = input.reviewerId ?? null;
  report.status = input.action === "dismiss" ? "dismissed" : "actioned";

  store.reports.set(report.id, report);
  touchReport(store, report.id);
  return report;
}

export function hasRecentReport(input: {
  contentType: ReportContentType;
  contentId: string;
  reporterId: string;
  windowMs: number;
}): boolean {
  const store = getStore();
  const now = Date.now();
  for (const report of store.reports.values()) {
    if (
      report.contentType === input.contentType &&
      report.contentId === input.contentId &&
      report.reporter.id === input.reporterId
    ) {
      const createdAt = new Date(report.createdAt).getTime();
      if (!Number.isNaN(createdAt) && now - createdAt < input.windowMs) {
        return true;
      }
    }
  }
  return false;
}
