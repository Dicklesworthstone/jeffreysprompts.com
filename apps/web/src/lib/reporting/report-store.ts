export type ReportStatus = "pending" | "reviewed" | "actioned" | "dismissed";
export type ReportAction = "dismiss" | "warn" | "remove" | "ban";
export type ReportPriorityLevel = "critical" | "high" | "medium" | "low";
export type ReportSlaStatus = "ok" | "warning" | "breach";
export type ReportAuthorTier = "standard" | "premium" | "trusted";

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
  authorTier?: ReportAuthorTier | null;
  reporter: ReportReporter;
}

export interface ReportPriorityBreakdown {
  reasonScore: number;
  reportCountScore: number;
  ageScore: number;
  reporterBoost: number;
  authorTierPenalty: number;
  escalationBoost: number;
}

export interface ReportPriority {
  score: number;
  level: ReportPriorityLevel;
  reportCount: number;
  reporterReliability: number;
  authorTier: ReportAuthorTier;
  ageHours: number;
  escalatedAt: string | null;
  slaStatus: ReportSlaStatus;
  slaDeadlineAt: string;
  breakdown: ReportPriorityBreakdown;
}

export type ContentReportWithPriority = ContentReport & { priority: ReportPriority };

interface ReportStore {
  reports: Map<string, ContentReport>;
  order: string[];
}

const STORE_KEY = "__jfp_content_report_store__";
const MAX_REPORTS_IN_MEMORY = 50000;
const REPORT_COUNT_CAP = 5;
const AGE_SCORE_CAP_HOURS = 72;
const SLA_WARNING_HOURS = 24;
const SLA_BREACH_HOURS = 48;
const ESCALATION_HOURS = 24;

const REASON_SEVERITY: Record<ReportReason, number> = {
  harmful: 1,
  offensive: 0.85,
  copyright: 0.7,
  spam: 0.5,
  other: 0.35,
};

const AUTHOR_TIER_PENALTY: Record<ReportAuthorTier, number> = {
  standard: 0,
  premium: -3,
  trusted: -6,
};

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

function evictOldestReportsIfNeeded(store: ReportStore): void {
  if (store.reports.size <= MAX_REPORTS_IN_MEMORY) return;

  const numToRemove = Math.ceil(MAX_REPORTS_IN_MEMORY * 0.1);
  for (let i = 0; i < numToRemove; i++) {
    const oldestId = store.order.pop();
    if (oldestId) {
      store.reports.delete(oldestId);
    }
  }
}

function getReportAgeHours(createdAt: string): number {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return 0;
  return Math.max(0, (Date.now() - createdMs) / 3600000);
}

function getSlaStatus(ageHours: number): ReportSlaStatus {
  if (ageHours >= SLA_BREACH_HOURS) return "breach";
  if (ageHours >= SLA_WARNING_HOURS) return "warning";
  return "ok";
}

function buildPriorityContext(reports: ContentReport[]) {
  const reportCounts = new Map<string, number>();
  const reporterStats = new Map<string, { actioned: number; dismissed: number }>();

  for (const report of reports) {
    const key = `${report.contentType}:${report.contentId}`;
    reportCounts.set(key, (reportCounts.get(key) ?? 0) + 1);

    if (report.status === "actioned" || report.status === "dismissed") {
      const reporterId = report.reporter.id;
      const stats = reporterStats.get(reporterId) ?? { actioned: 0, dismissed: 0 };
      if (report.status === "actioned") stats.actioned += 1;
      if (report.status === "dismissed") stats.dismissed += 1;
      reporterStats.set(reporterId, stats);
    }
  }

  return { reportCounts, reporterStats };
}

function getReporterReliability(
  reporterId: string,
  reporterStats: Map<string, { actioned: number; dismissed: number }>
): number {
  const stats = reporterStats.get(reporterId);
  if (!stats) return 0.5;
  const total = stats.actioned + stats.dismissed;
  if (total === 0) return 0.5;
  return (stats.actioned + 1) / (total + 2);
}

function getReportPriority(
  report: ContentReport,
  context: ReturnType<typeof buildPriorityContext>
): ReportPriority {
  const ageHours = getReportAgeHours(report.createdAt);
  const slaStatus = getSlaStatus(ageHours);
  const createdMs = new Date(report.createdAt).getTime();
  const safeCreatedMs = Number.isNaN(createdMs) ? Date.now() : createdMs;
  const slaDeadlineAt = new Date(safeCreatedMs + SLA_WARNING_HOURS * 3600000).toISOString();
  const escalatedAt =
    report.status === "pending" && ageHours >= ESCALATION_HOURS
      ? new Date(safeCreatedMs + ESCALATION_HOURS * 3600000).toISOString()
      : null;

  const reportCountKey = `${report.contentType}:${report.contentId}`;
  const reportCount = context.reportCounts.get(reportCountKey) ?? 1;
  const reporterReliability = getReporterReliability(report.reporter.id, context.reporterStats);
  const authorTier = report.authorTier ?? "standard";

  const reasonScore = (REASON_SEVERITY[report.reason] ?? 0.35) * 30;
  const reportCountScore = Math.min(REPORT_COUNT_CAP, reportCount) * 6;
  const ageScore = (Math.min(AGE_SCORE_CAP_HOURS, ageHours) / AGE_SCORE_CAP_HOURS) * 20;
  const reporterBoost = (reporterReliability - 0.5) * 10;
  const authorTierPenalty = AUTHOR_TIER_PENALTY[authorTier] ?? 0;
  const escalationBoost = report.status === "pending" && escalatedAt ? 5 : 0;

  const rawScore = 25 + reasonScore + reportCountScore + ageScore + reporterBoost + escalationBoost + authorTierPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let level: ReportPriorityLevel = "low";
  if (score >= 80) level = "critical";
  else if (score >= 65) level = "high";
  else if (score >= 45) level = "medium";

  return {
    score,
    level,
    reportCount,
    reporterReliability: Number(reporterReliability.toFixed(2)),
    authorTier,
    ageHours: Number(ageHours.toFixed(1)),
    escalatedAt,
    slaStatus,
    slaDeadlineAt,
    breakdown: {
      reasonScore: Number(reasonScore.toFixed(1)),
      reportCountScore: Number(reportCountScore.toFixed(1)),
      ageScore: Number(ageScore.toFixed(1)),
      reporterBoost: Number(reporterBoost.toFixed(1)),
      authorTierPenalty: Number(authorTierPenalty.toFixed(1)),
      escalationBoost: Number(escalationBoost.toFixed(1)),
    },
  };
}

export function createContentReport(input: {
  contentType: ReportContentType;
  contentId: string;
  contentTitle?: string | null;
  reason: ReportReason;
  details?: string | null;
  reporter?: Partial<ReportReporter>;
  authorTier?: ReportAuthorTier | null;
}): ContentReport {
  const store = getStore();
  evictOldestReportsIfNeeded(store);

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
    authorTier: input.authorTier ?? "standard",
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
  priority?: ReportPriorityLevel | "all";
  sort?: "priority" | "recent";
  limit?: number;
  page?: number;
}): ContentReportWithPriority[] {
  const store = getStore();
  const limit = filters?.limit ?? 50;
  const page = Math.max(1, filters?.page ?? 1);
  const sort = filters?.sort ?? "priority";

  const allReports = Array.from(store.reports.values());
  const context = buildPriorityContext(allReports);

  const reports = store.order
    .map((id) => store.reports.get(id))
    .filter((report): report is ContentReport => Boolean(report))
    .map((report) => ({
      ...report,
      priority: getReportPriority(report, context),
    }))
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
      if (filters?.priority && filters.priority !== "all" && report.priority.level !== filters.priority) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "priority") {
        const scoreDiff = b.priority.score - a.priority.score;
        if (scoreDiff !== 0) return scoreDiff;
      }
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
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
