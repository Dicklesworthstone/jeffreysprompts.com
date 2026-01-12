export const SUPPORT_EMAIL = "support@jeffreysprompts.com";

export const SUPPORT_CATEGORIES = [
  {
    value: "billing",
    label: "Billing & Payments",
    description: "Invoices, refunds, and subscription questions.",
  },
  {
    value: "technical",
    label: "Technical Issue",
    description: "Trouble with the site, CLI, or integrations.",
  },
  {
    value: "feedback",
    label: "Feedback",
    description: "General feedback about the product experience.",
  },
  {
    value: "feature",
    label: "Feature Request",
    description: "Ideas for new features or improvements.",
  },
  {
    value: "bug",
    label: "Bug Report",
    description: "Something is broken or not working as expected.",
  },
  {
    value: "account",
    label: "Account Help",
    description: "Login, access, or account management questions.",
  },
  {
    value: "other",
    label: "Other",
    description: "Anything else we should know about.",
  },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["value"];

export const SUPPORT_PRIORITIES = [
  {
    value: "low",
    label: "Low",
    description: "General question with no urgency.",
  },
  {
    value: "normal",
    label: "Normal",
    description: "Standard response time.",
  },
  {
    value: "high",
    label: "High",
    description: "Blocking your workflow or deliverable.",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Time-sensitive, business-critical issue.",
  },
] as const;

export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number]["value"];

export const SUPPORT_STATUSES = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export type SupportStatus = (typeof SUPPORT_STATUSES)[number]["value"];

export const SUPPORT_CATEGORY_SET = new Set<SupportCategory>(
  SUPPORT_CATEGORIES.map((item) => item.value)
);

export const SUPPORT_PRIORITY_SET = new Set<SupportPriority>(
  SUPPORT_PRIORITIES.map((item) => item.value)
);

export const SUPPORT_STATUS_SET = new Set<SupportStatus>(
  SUPPORT_STATUSES.map((item) => item.value)
);

export function isSupportCategory(value: string): value is SupportCategory {
  return SUPPORT_CATEGORY_SET.has(value as SupportCategory);
}

export function isSupportPriority(value: string): value is SupportPriority {
  return SUPPORT_PRIORITY_SET.has(value as SupportPriority);
}

export function isSupportStatus(value: string): value is SupportStatus {
  return SUPPORT_STATUS_SET.has(value as SupportStatus);
}

export function getSupportCategoryLabel(category: SupportCategory): string {
  return SUPPORT_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

export function getSupportPriorityLabel(priority: SupportPriority): string {
  return SUPPORT_PRIORITIES.find((item) => item.value === priority)?.label ?? priority;
}

export function getSupportStatusLabel(status: SupportStatus): string {
  return SUPPORT_STATUSES.find((item) => item.value === status)?.label ?? status;
}
