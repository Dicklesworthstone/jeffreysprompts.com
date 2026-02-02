"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, PencilLine, Plus, RefreshCw, Shield, Tags, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface TagMapping {
  alias: string;
  canonical: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

interface TagMappingsResponse {
  success: boolean;
  data?: TagMapping[];
  record?: Record<string, string>;
  meta?: { count: number; persisted?: boolean; lastPersistError?: string | null };
  error?: string;
  message?: string;
}

const ADMIN_TOKEN_STORAGE_KEY = "jfp_admin_token_v1";

function loadAdminToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!token) {
      window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage errors
  }
}

function formatAuthError(code?: string): string | null {
  switch (code) {
    case "admin_token_not_configured":
      return "Admin token not configured. Set JFP_ADMIN_TOKEN or enable JFP_ADMIN_DEV_BYPASS for local dev.";
    case "unauthorized":
      return "Unauthorized. Provide a valid admin token in the request headers.";
    case "forbidden":
      return "Access denied. Your admin role lacks permission.";
    default:
      return null;
  }
}

function formatMappingError(code?: string): string | null {
  switch (code) {
    case "alias_and_canonical_required":
    case "missing_fields":
      return "Alias and canonical tags are required.";
    case "alias_matches_canonical":
      return "Alias and canonical tags must be different.";
    case "tag_value_too_long":
      return "Tag values must be 80 characters or fewer.";
    default:
      return null;
  }
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60000) return "just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} min ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} hours ago`;
  return `${Math.floor(diffMs / 86400000)} days ago`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminMetadataPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [mappings, setMappings] = useState<TagMapping[]>([]);
  const [record, setRecord] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alias, setAlias] = useState("");
  const [canonical, setCanonical] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingAlias, setRemovingAlias] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [meta, setMeta] = useState<TagMappingsResponse["meta"] | null>(null);

  const authHeaders = useMemo(() => {
    const token = adminToken.trim();
    if (!token) return undefined;
    return {
      "x-jfp-admin-token": token,
    };
  }, [adminToken]);

  useEffect(() => {
    setAdminToken(loadAdminToken());
  }, []);

  useEffect(() => {
    persistAdminToken(adminToken.trim());
  }, [adminToken]);

  const loadMappings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/admin/tag-mappings", {
        cache: "no-store",
        headers: authHeaders,
      });
      const payload = (await response.json().catch(() => null)) as TagMappingsResponse | null;

      if (!response.ok || !payload?.success) {
        setMappings([]);
        setRecord({});
        setMeta(null);
        setLoadError(
          formatAuthError(payload?.error)
            ?? payload?.message
            ?? "Unable to load tag mappings."
        );
        return;
      }

      setMappings(payload.data ?? []);
      setRecord(payload.record ?? {});
      setMeta(payload.meta ?? null);
    } catch {
      setMappings([]);
      setRecord({});
      setMeta(null);
      setLoadError("Unable to load tag mappings.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const latestMapping = mappings[0];
  const lastUpdatedLabel = latestMapping
    ? `${formatRelative(latestMapping.updatedAt)} · ${formatTimestamp(latestMapping.updatedAt)}`
    : "No mappings yet";

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!alias.trim() || !canonical.trim()) {
        toastError("Alias and canonical tags are required.");
        return;
      }

      setSaving(true);
      try {
        const response = await fetch("/api/admin/tag-mappings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authHeaders ?? {}),
          },
          body: JSON.stringify({
            alias,
            canonical,
          }),
        });
        const payload = (await response.json().catch(() => null)) as TagMappingsResponse | null;

        if (!response.ok || !payload?.success) {
          toastError(
            formatMappingError(payload?.error)
              ?? payload?.message
              ?? "Unable to save tag mapping."
          );
          return;
        }

        toastSuccess("Tag mapping saved.");
        setAlias("");
        setCanonical("");
        loadMappings();
      } catch {
        toastError("Unable to save tag mapping.");
      } finally {
        setSaving(false);
      }
    },
    [alias, canonical, authHeaders, loadMappings, toastError, toastSuccess]
  );

  const handleRemove = useCallback(
    async (aliasValue: string) => {
      setRemovingAlias(aliasValue);
      try {
        const response = await fetch(
          `/api/admin/tag-mappings?alias=${encodeURIComponent(aliasValue)}`,
          {
            method: "DELETE",
            headers: authHeaders,
          }
        );
        const payload = (await response.json().catch(() => null)) as TagMappingsResponse | null;

        if (!response.ok || payload?.success === false) {
          toastError(payload?.message ?? "Unable to remove tag mapping.");
          return;
        }

        toastSuccess("Tag mapping removed.");
        setMappings((prev) => prev.filter((item) => item.alias !== aliasValue));
        setRecord((prev) => {
          const next = { ...prev };
          delete next[aliasValue];
          return next;
        });
      } catch {
        toastError("Unable to remove tag mapping.");
      } finally {
        setRemovingAlias(null);
      }
    },
    [authHeaders, toastError, toastSuccess]
  );

  const handlePrefill = useCallback((mapping: TagMapping) => {
    setAlias(mapping.alias);
    setCanonical(mapping.canonical);
  }, []);

  const mappingCount = useMemo(() => Object.keys(record).length, [record]);
  const persistenceEnabled = Boolean(meta?.persisted);
  const persistenceLabel = persistenceEnabled ? "Enabled" : "In-memory only";
  const persistenceDetail = persistenceEnabled
    ? "File-based persistence active."
    : "Set JFP_TAG_MAPPINGS_PATH to persist mappings.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Metadata Overrides
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Normalize tag aliases so metadata assistant suggestions stay consistent.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMappings} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loadError && (
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10">
          <CardContent className="p-4 text-sm text-rose-700 dark:text-rose-200">
            {loadError}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active mappings</p>
              <p className="text-2xl font-semibold text-foreground">{mappingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
              <PencilLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last updated</p>
              <p className="text-base font-semibold text-foreground">{lastUpdatedLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Shield className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Persistence</p>
              <p className="text-base font-semibold text-foreground">{persistenceLabel}</p>
              <p className="text-xs text-muted-foreground">{persistenceDetail}</p>
              {meta?.lastPersistError && (
                <p className="text-xs text-rose-600">
                  Last error: {meta.lastPersistError}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin access</CardTitle>
          <CardDescription>
            Provide your admin token to authorize changes. Stored in this browser
            session only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Admin token</label>
            <Input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="JFP_ADMIN_TOKEN"
            />
            <p className="text-xs text-muted-foreground">
              Token is sent as <code>x-jfp-admin-token</code>. Role is
              derived server-side from <code>JFP_ADMIN_ROLE</code> env var.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdminToken("")}
              disabled={!adminToken.trim()}
            >
              Clear token
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add or update mapping
            </CardTitle>
            <CardDescription>
              Aliases are normalized (lowercase, spaces become dashes). Saving an existing alias
              updates its canonical tag.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Alias tag</label>
                  <Input
                    value={alias}
                    onChange={(event) => setAlias(event.target.value)}
                    placeholder="e.g. brainstorm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Canonical tag</label>
                  <Input
                    value={canonical}
                    onChange={(event) => setCanonical(event.target.value)}
                    placeholder="e.g. ideation"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={saving} disabled={saving} className="w-full sm:w-auto">
                  Save mapping
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current mappings</CardTitle>
            <CardDescription>
              The latest mapping appears first. Use an entry to prefill the form for edits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <p className="text-sm text-muted-foreground">Loading tag mappings...</p>
            )}
            {!loading && mappings.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No mappings yet. Add the first alias to get started.
              </div>
            )}
            {!loading && mappings.length > 0 && (
              <div className="space-y-3">
                {mappings.map((mapping) => (
                  <div
                    key={mapping.alias}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        <Badge variant="secondary">{mapping.alias}</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline">{mapping.canonical}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatRelative(mapping.updatedAt)} by {mapping.updatedBy}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrefill(mapping)}
                      >
                        Use
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(mapping.alias)}
                        disabled={removingAlias === mapping.alias}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
