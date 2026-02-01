"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, DollarSign, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const STORAGE_KEY = "jfp_budget_settings_v1";
const ALERTS_STORAGE_KEY = "jfp_budget_alerts_log_v1";
const ALERT_PREVIEW_LIMIT = 10;
const ALERT_LOG_MAX = 200;
const CLI_ALERT_LOG_PATH = "~/.config/jfp/budget-alerts.jsonl";

type BudgetSettings = {
  monthlyCapUsd: number | null;
  perRunCapUsd: number | null;
  alertsEnabled: boolean;
  hardStopEnabled: boolean;
  updatedAt: string | null;
};

type BudgetAlertEntry = {
  type: "per_run" | "monthly";
  capUsd: number;
  totalCostUsd: number;
  currency: string;
  promptId: string;
  promptTitle: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
};

const DEFAULT_SETTINGS: BudgetSettings = {
  monthlyCapUsd: null,
  perRunCapUsd: null,
  alertsEnabled: true,
  hardStopEnabled: false,
  updatedAt: null,
};

function parseCurrency(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return NaN;
  return parsed;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "";
  return String(value);
}

function loadSettings(): BudgetSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<BudgetSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: BudgetSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function clearSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function isBudgetAlertEntry(value: unknown): value is BudgetAlertEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as BudgetAlertEntry;
  if (record.type !== "per_run" && record.type !== "monthly") return false;
  if (typeof record.capUsd !== "number") return false;
  if (typeof record.totalCostUsd !== "number") return false;
  if (typeof record.currency !== "string") return false;
  if (typeof record.promptId !== "string") return false;
  if (typeof record.promptTitle !== "string") return false;
  if (typeof record.model !== "string") return false;
  if (typeof record.inputTokens !== "number") return false;
  if (typeof record.outputTokens !== "number") return false;
  if (typeof record.createdAt !== "string") return false;
  return true;
}

function normalizeAlertLog(entries: BudgetAlertEntry[]): BudgetAlertEntry[] {
  const normalized = entries.filter(isBudgetAlertEntry);
  normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return normalized.slice(0, ALERT_LOG_MAX);
}

function loadAlertLog(): BudgetAlertEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeAlertLog(parsed);
  } catch {
    return [];
  }
}

function saveAlertLog(alerts: BudgetAlertEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

function clearAlertLog(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ALERTS_STORAGE_KEY);
}

function parseAlertImport(raw: string): { alerts: BudgetAlertEntry[]; invalidCount: number } {
  const trimmed = raw.trim();
  if (!trimmed) return { alerts: [], invalidCount: 0 };

  try {
    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return { alerts: [], invalidCount: 1 };
      }
      const alerts = normalizeAlertLog(parsed as BudgetAlertEntry[]);
      const invalidCount = parsed.length - alerts.length;
      return { alerts, invalidCount };
    }
  } catch {
    return { alerts: [], invalidCount: 1 };
  }

  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  const alerts: BudgetAlertEntry[] = [];
  let invalidCount = 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (isBudgetAlertEntry(parsed)) {
        alerts.push(parsed);
      } else {
        invalidCount += 1;
      }
    } catch {
      invalidCount += 1;
    }
  }
  return { alerts: normalizeAlertLog(alerts), invalidCount };
}

function mergeAlertLogs(
  existing: BudgetAlertEntry[],
  incoming: BudgetAlertEntry[]
): BudgetAlertEntry[] {
  const map = new Map<string, BudgetAlertEntry>();
  const add = (entry: BudgetAlertEntry) => {
    const key = [
      entry.type,
      entry.promptId,
      entry.model,
      entry.createdAt,
      entry.totalCostUsd,
      entry.capUsd,
    ].join("|");
    map.set(key, entry);
  };
  existing.forEach(add);
  incoming.forEach(add);
  return normalizeAlertLog(Array.from(map.values()));
}

function formatAlertCurrency(value: number, currency: string): string {
  if (currency !== "USD") return `${value.toFixed(4)} ${currency}`;
  return `$${value.toFixed(4)}`;
}

function formatAlertTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function BudgetSettingsPage() {
  const { success, error } = useToast();
  const [monthlyCapInput, setMonthlyCapInput] = useState("");
  const [perRunCapInput, setPerRunCapInput] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [hardStopEnabled, setHardStopEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [alertLog, setAlertLog] = useState<BudgetAlertEntry[]>([]);
  const [alertImportInput, setAlertImportInput] = useState("");

  useEffect(() => {
    const settings = loadSettings();
    setMonthlyCapInput(formatCurrency(settings.monthlyCapUsd));
    setPerRunCapInput(formatCurrency(settings.perRunCapUsd));
    setAlertsEnabled(settings.alertsEnabled);
    setHardStopEnabled(settings.hardStopEnabled);
    setLastUpdated(settings.updatedAt);
    setAlertLog(loadAlertLog());
    setLoaded(true);
  }, []);

  const monthlyCapValue = useMemo(
    () => parseCurrency(monthlyCapInput),
    [monthlyCapInput]
  );
  const perRunCapValue = useMemo(
    () => parseCurrency(perRunCapInput),
    [perRunCapInput]
  );

  const monthlyCapError =
    loaded && Number.isNaN(monthlyCapValue)
      ? "Enter a non-negative number."
      : undefined;
  const perRunCapError =
    loaded && Number.isNaN(perRunCapValue)
      ? "Enter a non-negative number."
      : undefined;

  const capMismatch =
    monthlyCapValue !== null &&
    perRunCapValue !== null &&
    !Number.isNaN(monthlyCapValue) &&
    !Number.isNaN(perRunCapValue) &&
    perRunCapValue > monthlyCapValue;

  const canSave = loaded && !monthlyCapError && !perRunCapError;

  const alertLogSorted = useMemo(
    () => normalizeAlertLog(alertLog),
    [alertLog]
  );
  const alertPreview = useMemo(
    () => alertLogSorted.slice(0, ALERT_PREVIEW_LIMIT),
    [alertLogSorted]
  );

  const cliCommands = useMemo(() => {
    const monthlyValue =
      typeof monthlyCapValue === "number" && Number.isFinite(monthlyCapValue)
        ? monthlyCapValue
        : null;
    const perRunValue =
      typeof perRunCapValue === "number" && Number.isFinite(perRunCapValue)
        ? perRunCapValue
        : null;

    return [
      `jfp config set budgets.monthlyCapUsd ${monthlyValue ?? "null"}`,
      `jfp config set budgets.perRunCapUsd ${perRunValue ?? "null"}`,
      `jfp config set budgets.alertsEnabled ${alertsEnabled}`,
    ];
  }, [monthlyCapValue, perRunCapValue, alertsEnabled]);

  const handleSave = () => {
    if (!canSave) {
      error("Fix the highlighted fields before saving.");
      return;
    }

    const next: BudgetSettings = {
      monthlyCapUsd: monthlyCapValue ?? null,
      perRunCapUsd: perRunCapValue ?? null,
      alertsEnabled,
      hardStopEnabled,
      updatedAt: new Date().toISOString(),
    };

    saveSettings(next);
    setLastUpdated(next.updatedAt);
    success("Budget settings saved", "Stored locally on this device.");
  };

  const handleReset = () => {
    clearSettings();
    setMonthlyCapInput("");
    setPerRunCapInput("");
    setAlertsEnabled(DEFAULT_SETTINGS.alertsEnabled);
    setHardStopEnabled(DEFAULT_SETTINGS.hardStopEnabled);
    setLastUpdated(null);
    success("Budget settings cleared", "Local overrides removed.");
  };

  const handleImportAlerts = () => {
    const { alerts, invalidCount } = parseAlertImport(alertImportInput);
    if (alerts.length === 0) {
      const detail = invalidCount > 0 ? `Skipped ${invalidCount} invalid entries.` : undefined;
      error("No valid alerts found.", detail);
      return;
    }

    const merged = mergeAlertLogs(alertLogSorted, alerts);
    saveAlertLog(merged);
    setAlertLog(merged);
    setAlertImportInput("");
    const detail = invalidCount > 0 ? `Skipped ${invalidCount} invalid entries.` : "Stored locally.";
    success("Budget alerts imported", detail);
  };

  const handleClearAlerts = () => {
    clearAlertLog();
    setAlertLog([]);
    success("Alert history cleared", "Local log removed.");
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-10">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
              Budget & Alerts
            </h1>
            <Badge variant="secondary">Pro</Badge>
          </div>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Set monthly caps and per-run warnings to keep prompt spending predictable.
          </p>
        </div>
      </div>

      <div className="container-wide py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-sky-500" />
              Local-only preview
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            These settings are stored locally in your browser until the Pro backend is ready.
            You can already use them alongside <span className="font-mono">jfp cost</span> to
            estimate usage.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Budget limits
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              label="Monthly budget cap (USD)"
              placeholder="e.g. 25"
              value={monthlyCapInput}
              onChange={(event) => setMonthlyCapInput(event.target.value)}
              error={monthlyCapError}
              hint="Leave blank for no monthly cap."
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              label="Per-run warning threshold (USD)"
              placeholder="e.g. 2.50"
              value={perRunCapInput}
              onChange={(event) => setPerRunCapInput(event.target.value)}
              error={perRunCapError}
              hint="Warn when a prompt run exceeds this amount."
            />
            {capMismatch && (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                Per-run threshold is higher than your monthly cap.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Enable budget alerts</p>
                <p className="text-sm text-muted-foreground">
                  Show warnings when estimates cross your thresholds.
                </p>
              </div>
              <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Hard stop on overage</p>
                <p className="text-sm text-muted-foreground">
                  Block runs when you hit the monthly cap (backend required).
                </p>
              </div>
              <Switch checked={hardStopEnabled} onCheckedChange={setHardStopEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-sky-500" />
              Sync to CLI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Apply these settings to your local CLI configuration so budget alerts match this
              page.
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <pre className="whitespace-pre-wrap text-xs text-foreground">
                {cliCommands.join("\n")}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground">
              Run the commands in a terminal where <span className="font-mono">jfp</span> is
              installed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alert history (local)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste the JSONL log from <span className="font-mono">{CLI_ALERT_LOG_PATH}</span> to
              review your CLI budget alerts in the browser.
            </p>
            <Textarea
              label="Import budget alert log (JSONL)"
              rows={6}
              value={alertImportInput}
              onChange={(event) => setAlertImportInput(event.target.value)}
              placeholder="Paste lines from budget-alerts.jsonl here"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleImportAlerts} disabled={!alertImportInput.trim()}>
                Import log
              </Button>
              <Button
                variant="outline"
                onClick={handleClearAlerts}
                disabled={alertLogSorted.length === 0}
              >
                Clear history
              </Button>
            </div>

            {alertLogSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No alerts stored on this device yet.
              </p>
            ) : (
              <div className="space-y-2">
                {alertPreview.map((alert, index) => {
                  const label = alert.type === "per_run" ? "Per-run cap" : "Monthly cap";
                  return (
                    <div
                      key={`${alert.promptId}-${alert.createdAt}-${index}`}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-white/60 px-3 py-2 text-sm dark:bg-neutral-900/40"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {alert.promptTitle}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({alert.promptId})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {label} · {alert.model} · {formatAlertTimestamp(alert.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tokens: {alert.inputTokens} in / {alert.outputTokens} out
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatAlertCurrency(alert.totalCostUsd, alert.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cap {formatAlertCurrency(alert.capUsd, alert.currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {alertLogSorted.length > alertPreview.length && (
                  <p className="text-xs text-muted-foreground">
                    Showing latest {alertPreview.length} of {alertLogSorted.length} alerts.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save settings
          </Button>
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last saved: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
