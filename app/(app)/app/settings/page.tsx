"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTicketsStore } from "@/store/useTicketsStore";

type Settings = {
  workspaceName: string;
  timezone: Timezone;
  aiEnabled: boolean;
  aiTone: Tone;
  aiRedact: boolean;
  notifications: {
    newTicket: boolean;
    slaRisk: boolean;
    dailyDigest: boolean;
    digestFrequency: DigestFrequency;
  };
  security: {
    confirmBulkDelete: boolean;
    sessionTimeout: SessionTimeout;
  };
  integrations: {
    slack: IntegrationState;
    zendesk: IntegrationState;
    webhooks: IntegrationState;
    email: IntegrationState;
    intercom: IntegrationState;
  };
  auditLog: AuditEvent[];
};

type IntegrationState = {
  connected: boolean;
  connectedAt?: string;
  lastSyncedAt?: string;
  endpoint?: string;
};

type IntegrationKey = "slack" | "zendesk" | "webhooks" | "email" | "intercom";

type AuditEvent = {
  id: string;
  eventType: string;
  actor: string;
  detail: string;
  createdAt: string;
};

const STORAGE_KEY = "supportpilot:settings:v1";

const timezones = ["UTC", "America/Sao_Paulo", "Europe/Lisbon"] as const;
const tones = ["Professional", "Friendly", "Direct"] as const;
const digestFrequencies = ["Daily", "Weekly", "Off"] as const;
const sessionTimeouts = ["15m", "30m", "60m", "4h"] as const;

const defaultSettings: Settings = {
  workspaceName: "SupportPilot Demo",
  timezone: "UTC",
  aiEnabled: true,
  aiTone: "Professional",
  aiRedact: true,
  notifications: {
    newTicket: true,
    slaRisk: true,
    dailyDigest: true,
    digestFrequency: "Daily",
  },
  security: {
    confirmBulkDelete: true,
    sessionTimeout: "30m",
  },
  integrations: {
    slack: { connected: false },
    zendesk: { connected: false },
    webhooks: { connected: false, endpoint: "" },
    email: { connected: false },
    intercom: { connected: false },
  },
  auditLog: seedAuditLog(),
};

const safeId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isValidAuditEvent = (event: any): event is AuditEvent => {
  return (
    event &&
    typeof event === "object" &&
    typeof event.id === "string" &&
    typeof event.eventType === "string" &&
    typeof event.actor === "string" &&
    typeof event.detail === "string" &&
    typeof event.createdAt === "string"
  );
};

const normalizeIntegration = (value: any): IntegrationState => {
  if (!value || typeof value !== "object") return { connected: false };
  return {
    connected: !!value.connected,
    connectedAt:
      typeof value.connectedAt === "string" ? value.connectedAt : undefined,
    lastSyncedAt:
      typeof value.lastSyncedAt === "string" ? value.lastSyncedAt : undefined,
    endpoint: typeof value.endpoint === "string" ? value.endpoint : undefined,
  };
};

function isValidSettings(raw: unknown): raw is Settings {
  if (!raw || typeof raw !== "object") return false;
  const data = raw as Settings;

  if (typeof data.workspaceName !== "string") return false;
  if (typeof data.timezone !== "string") return false;
  if (typeof data.aiEnabled !== "boolean") return false;
  if (typeof data.aiTone !== "string") return false;
  if (typeof data.aiRedact !== "boolean") return false;

  if (!data.notifications || typeof data.notifications !== "object")
    return false;
  if (typeof data.notifications.newTicket !== "boolean") return false;
  if (typeof data.notifications.slaRisk !== "boolean") return false;
  if (typeof data.notifications.dailyDigest !== "boolean") return false;
  if (typeof data.notifications.digestFrequency !== "string") return false;

  if (!data.security || typeof data.security !== "object") return false;
  if (typeof data.security.confirmBulkDelete !== "boolean") return false;
  if (typeof data.security.sessionTimeout !== "string") return false;

  return true;
}

function sanitizeSettings(raw: unknown): Settings {
  if (!isValidSettings(raw)) return { ...defaultSettings };

  const safe: Settings = {
    ...raw,
    workspaceName: raw.workspaceName ?? defaultSettings.workspaceName,
    timezone: timezones.includes(raw.timezone as any)
      ? raw.timezone
      : defaultSettings.timezone,
    aiTone: tones.includes(raw.aiTone as any)
      ? raw.aiTone
      : defaultSettings.aiTone,
    notifications: {
      ...raw.notifications,
      digestFrequency: digestFrequencies.includes(
        raw.notifications.digestFrequency as any
      )
        ? raw.notifications.digestFrequency
        : defaultSettings.notifications.digestFrequency,
    },
    security: {
      ...raw.security,
      sessionTimeout: sessionTimeouts.includes(
        raw.security.sessionTimeout as any
      )
        ? raw.security.sessionTimeout
        : defaultSettings.security.sessionTimeout,
    },
    integrations: {
      slack: normalizeIntegration(raw.integrations?.slack),
      zendesk: normalizeIntegration(raw.integrations?.zendesk),
      webhooks: normalizeIntegration(raw.integrations?.webhooks),
      email: normalizeIntegration(raw.integrations?.email),
      intercom: normalizeIntegration(raw.integrations?.intercom),
    },
    auditLog: Array.isArray(raw.auditLog)
      ? raw.auditLog.filter(isValidAuditEvent).slice(0, 50)
      : seedAuditLog(),
  };

  if (!safe.auditLog || safe.auditLog.length === 0) {
    safe.auditLog = seedAuditLog();
  }

  // S1.1: normaliza coerência do digest ao hidratar
  return normalizeNotifications(safe);
}

/**
 * S1.1: regra única e determinística (sem loop / sem dead-end)
 * - frequency Off => dailyDigest false
 * - frequency Daily/Weekly => dailyDigest true
 */
function normalizeNotifications(settings: Settings): Settings {
  const freq = settings.notifications.digestFrequency;
  const shouldDigestBeOn = freq !== "Off";

  if (settings.notifications.dailyDigest !== shouldDigestBeOn) {
    return {
      ...settings,
      notifications: {
        ...settings.notifications,
        dailyDigest: shouldDigestBeOn,
      },
    };
  }
  return settings;
}

function appendAudit(list: AuditEvent[], event: AuditEvent): AuditEvent[] {
  return [event, ...list].slice(0, 20);
}

function appendAuditOnly(
  event: AuditEvent,
  persistSettingsFn: (settings: Settings) => void,
  setBaselineFn: Dispatch<SetStateAction<Settings>>,
  setDraftFn: Dispatch<SetStateAction<Settings>>
) {
  setDraftFn((prev) => ({ ...prev, auditLog: appendAudit(prev.auditLog ?? [], event) }));
  setBaselineFn((prev) => {
    const next = { ...prev, auditLog: appendAudit(prev.auditLog ?? [], event) };
    persistSettingsFn(next);
    return next;
  });
}

function seedAuditLog(): AuditEvent[] {
  const now = new Date();
  const seeds = [
    "settings.hydrated",
    "ai.initialized",
    "notifications.synced",
    "security.reviewed",
    "integrations.checked",
    "workspace.viewed",
    "auditlog.seeded",
    "data.ready",
  ];
  return seeds.map((action, index) => ({
    id: `${now.getTime()}-${index}`,
    eventType: action,
    actor: "You",
    detail: action.replace(".", " "),
    createdAt: new Date(now.getTime() - index * 60000).toISOString(),
  }));
}

function formatTimestamp(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toCsv(headers: string[], rows: string[][]) {
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const [baseline, setBaseline] = useState<Settings>(defaultSettings);
  const [draft, setDraft] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connectModal, setConnectModal] = useState<IntegrationKey | null>(null);
  const { tickets, hydrateTickets, isHydrated } = useTicketsStore();

  useEffect(() => {
    if (!isHydrated) hydrateTickets();
  }, [isHydrated, hydrateTickets]);

  // Hydrate from localStorage (com guard + sanitize)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as unknown;
      const safe = sanitizeSettings(parsed);
      setBaseline(safe);
      setDraft(safe);
    } catch {
      // se estiver corrompido, ignora e mantém defaults
    }
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline]
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const name = draft.workspaceName.trim();

    if (name.length < 2 || name.length > 40) {
      nextErrors.workspaceName = "Name must be between 2 and 40 characters.";
    }
    if (!timezones.includes(draft.timezone as any)) {
      nextErrors.timezone = "Select a valid timezone.";
    }
    if (!tones.includes(draft.aiTone as any)) {
      nextErrors.aiTone = "Select a valid tone.";
    }
    if (
      !digestFrequencies.includes(draft.notifications.digestFrequency as any)
    ) {
      nextErrors.digestFrequency = "Select a valid frequency.";
    }
    if (!sessionTimeouts.includes(draft.security.sessionTimeout as any)) {
      nextErrors.sessionTimeout = "Select a valid session timeout.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const persistSettings = (settings: Settings) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  };

  const addAudit = (eventType: string, detail: string) => ({
    id: safeId(),
    eventType,
    actor: "You",
    detail,
    createdAt: new Date().toISOString(),
  });

  const persistWithAudit = (settings: Settings, evt?: AuditEvent) => {
    const next: Settings = {
      ...settings,
      auditLog: evt ? appendAudit(settings.auditLog ?? [], evt) : settings.auditLog ?? [],
    };
    persistSettings(next);
    setBaseline(next);
    setDraft(next);
  };

  const handleSave = () => {
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    setTimeout(() => {
      try {
        const normalized = normalizeNotifications(draft);
        const evt = addAudit("settings.updated", "Settings saved");
        persistWithAudit(normalized, evt);
        setMessage({ type: "success", text: "Settings saved" });
      } catch {
        setMessage({ type: "error", text: "Could not save settings" });
      } finally {
        setLoading(false);
      }
    }, 450);
  };

  const handleDiscard = () => {
    const clone: Settings = JSON.parse(JSON.stringify(baseline));
    setDraft(clone);
    setErrors({});
    setMessage(null);
  };

  const updateField = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  // S1.1: handlers explícitos, sem useEffect “auto-corrigindo” que trava UX
  const setDigestFrequency = (value: string) => {
    setDraft((prev) => {
      const next: Settings = {
        ...prev,
        notifications: {
          ...prev.notifications,
          digestFrequency: value,
        },
      };
      return normalizeNotifications(next);
    });
  };

  const setDailyDigest = (checked: boolean) => {
    setDraft((prev) => {
      const currentFreq = prev.notifications.digestFrequency;
      const nextFreq = checked
        ? currentFreq === "Off"
          ? "Daily"
          : currentFreq
        : "Off";

      const next: Settings = {
        ...prev,
        notifications: {
          ...prev.notifications,
          dailyDigest: checked,
          digestFrequency: nextFreq,
        },
      };
      return normalizeNotifications(next);
    });
  };

  const updateNotificationToggle = (
    key: "newTicket" | "slaRisk",
    checked: boolean
  ) => {
    setDraft((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: checked,
      },
    }));
  };

  const updateSecurity = (
    key: keyof Settings["security"],
    value: boolean | string
  ) => {
    setDraft((prev) => ({
      ...prev,
      security: { ...prev.security, [key]: value },
    }));
  };

  const resetDemoData = () => {
    const confirmed = window.confirm(
      "This will reset settings to defaults. Continue?"
    );
    if (!confirmed) return;

    const evt = addAudit("settings.reset", "Settings reset to defaults");
    persistWithAudit(defaultSettings, evt);
    setMessage({ type: "success", text: "Settings reset to defaults" });
  };

  const disableAiFeatures = () => {
    const confirmed = window.confirm(
      "This will disable AI assistance and redaction. Continue?"
    );
    if (!confirmed) return;

    const updated: Settings = {
      ...draft,
      aiEnabled: false,
      aiRedact: false,
    };
    const evt = addAudit("ai.disabled", "AI features disabled");
    persistWithAudit(updated, evt);
    setMessage({ type: "success", text: "AI features disabled" });
  };

  const connectIntegration = (key: keyof Settings["integrations"]) => {
    const now = new Date().toISOString();
    const next: Settings = {
      ...draft,
      integrations: {
        ...draft.integrations,
        [key]: {
          ...draft.integrations[key],
          connected: true,
          connectedAt: now,
          lastSyncedAt: now,
        },
      },
    };
    const evt = addAudit("integration.connected", `${String(key)} connected`);
    persistWithAudit(next, evt);
    setMessage({ type: "success", text: `${String(key)} connected` });
  };

  const disconnectIntegration = (key: keyof Settings["integrations"]) => {
    const confirmed = window.confirm(
      `Disconnect ${String(key)}? This will stop syncing.`
    );
    if (!confirmed) return;
    const next: Settings = {
      ...draft,
      integrations: {
        ...draft.integrations,
        [key]: { connected: false },
      },
    };
    const evt = addAudit(
      "integration.disconnected",
      `${String(key)} disconnected`
    );
    persistWithAudit(next, evt);
    setMessage({ type: "success", text: `${String(key)} disconnected` });
  };

  const formatLastSynced = (integration: IntegrationState) => {
    if (!integration.connected) return "Not connected";
    return integration.lastSyncedAt
      ? `Last synced: ${formatTimestamp(integration.lastSyncedAt)}`
      : "Connected";
  };

  const clearAuditLog = () => {
    const confirmed = window.confirm("Clear all audit log events?");
    if (!confirmed) return;
    const next: Settings = { ...draft, auditLog: [] };
    const evt = addAudit("audit.cleared", "Audit log cleared");
    persistWithAudit(next, evt);
    setMessage({ type: "success", text: "Audit log cleared" });
  };

  const exportSettingsJson = () => {
    const data = JSON.stringify(draft, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings.json";
    a.click();
    URL.revokeObjectURL(url);
    const evt = addAudit("export.settings", "Settings JSON downloaded");
    appendAuditOnly(evt, persistSettings, setBaseline, setDraft);
  };

  const exportTicketsCsv = () => {
    const rows = tickets.map((t) => [
      t.id,
      t.title,
      t.status,
      t.priority,
      t.category,
      t.channel,
      t.createdAt,
      t.updatedAt,
    ]);
    const csv = toCsv(
      [
        "id",
        "title",
        "status",
        "priority",
        "category",
        "channel",
        "createdAt",
        "updatedAt",
      ],
      rows
    );
    downloadCsv("tickets.csv", csv);
    const evt = addAudit("export.tickets", "Tickets CSV downloaded");
    appendAuditOnly(evt, persistSettings, setBaseline, setDraft);
  };

  const exportAuditCsv = () => {
    const rows = (draft.auditLog ?? []).map((e) => [
      e.id,
      e.eventType,
      e.actor,
      e.detail,
      e.createdAt,
    ]);
    const csv = toCsv(
      ["id", "eventType", "actor", "detail", "createdAt"],
      rows
    );
    downloadCsv("audit-log.csv", csv);
    const evt = addAudit("export.audit", "Audit log CSV downloaded");
    appendAuditOnly(evt, persistSettings, setBaseline, setDraft);
  };

  const exportSettingsCsv = () => {
    const rows: string[][] = [
      ["workspaceName", draft.workspaceName],
      ["timezone", draft.timezone],
      ["aiEnabled", String(draft.aiEnabled)],
      ["aiTone", draft.aiTone],
      ["aiRedact", String(draft.aiRedact)],
      ["notifications.newTicket", String(draft.notifications.newTicket)],
      ["notifications.slaRisk", String(draft.notifications.slaRisk)],
      ["notifications.dailyDigest", String(draft.notifications.dailyDigest)],
      ["notifications.digestFrequency", draft.notifications.digestFrequency],
      ["security.confirmBulkDelete", String(draft.security.confirmBulkDelete)],
      ["security.sessionTimeout", draft.security.sessionTimeout],
      ["integrations.slack.connected", String(draft.integrations.slack.connected)],
      ["integrations.zendesk.connected", String(draft.integrations.zendesk.connected)],
      ["integrations.intercom.connected", String(draft.integrations.intercom.connected)],
      ["integrations.email.connected", String(draft.integrations.email.connected)],
      ["integrations.webhooks.connected", String(draft.integrations.webhooks.connected)],
      ["auditLog.count", String(draft.auditLog?.length ?? 0)],
    ];
    const csv = toCsv(["key", "value"], rows);
    downloadCsv("settings.csv", csv);
    const evt = addAudit("export.settings", "Settings CSV downloaded");
    appendAuditOnly(evt, persistSettings, setBaseline, setDraft);
  };

  return (
    <div className="min-w-0 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6 lg:px-12 xl:px-16 2xl:px-20 lg:max-w-[1040px] xl:max-w-[1120px] space-y-6 sm:space-y-8 lg:space-y-12">
      <PageHeader
        title="Settings"
        description="Configure workspace preferences, AI controls, notifications, and safety rules."
        badge={<Badge variant="default">Workspace</Badge>}
      />

      {message ? (
        <Card
          className={`p-3 text-sm ${
            message.type === "success"
              ? "border border-slate-200 bg-white text-slate-800"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {message.text}
        </Card>
      ) : null}

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:gap-8">
        {/* Workspace */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Workspace
            </h2>
            <p className="text-sm text-slate-600">
              Define how your workspace is identified and which timezone to use
              for SLAs.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor="workspaceName"
              >
                Workspace name
              </label>
              <input
                id="workspaceName"
                name="workspaceName"
                type="text"
                value={draft.workspaceName}
                onChange={(e) => updateField("workspaceName", e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white ${
                  errors.workspaceName ? "border-amber-400" : "border-slate-200"
                }`}
                disabled={loading}
              />
              <p className="text-xs text-slate-500">
                Visible across your workspace and emails.
              </p>
              {errors.workspaceName ? (
                <p className="text-xs text-amber-700">{errors.workspaceName}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor="timezone"
              >
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                value={draft.timezone}
                onChange={(e) => updateField("timezone", e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white ${
                  errors.timezone ? "border-amber-400" : "border-slate-200"
                }`}
                disabled={loading}
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Used for reporting and SLA deadlines.
              </p>
              {errors.timezone ? (
                <p className="text-xs text-amber-700">{errors.timezone}</p>
              ) : null}
            </div>
          </div>
        </Card>

        {/* AI */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">AI</h2>
            <p className="text-sm text-slate-600">
              Control how AI assistance responds and handles sensitive
              information.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                checked={draft.aiEnabled}
                onChange={(e) => updateField("aiEnabled", e.target.checked)}
                disabled={loading}
              />
              Enable AI assistance
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-900"
                  htmlFor="aiTone"
                >
                  Tone
                </label>
                <select
                  id="aiTone"
                  name="aiTone"
                  value={draft.aiTone}
                  onChange={(e) => updateField("aiTone", e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                  disabled={!draft.aiEnabled || loading}
                >
                  {tones.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
                {errors.aiTone ? (
                  <p className="text-xs text-amber-700">{errors.aiTone}</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Applies to AI replies and summaries.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                    checked={draft.aiRedact}
                    onChange={(e) => updateField("aiRedact", e.target.checked)}
                    disabled={!draft.aiEnabled || loading}
                  />
                  Redact sensitive information
                </label>
                <p className="text-xs text-slate-500">
                  Masks PII in prompts and responses before sending to AI.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Notifications
            </h2>
            <p className="text-sm text-slate-600">
              Choose which alerts you receive and how often.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                checked={draft.notifications.newTicket}
                onChange={(e) =>
                  updateNotificationToggle("newTicket", e.target.checked)
                }
                disabled={loading}
              />
              New ticket
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                checked={draft.notifications.slaRisk}
                onChange={(e) =>
                  updateNotificationToggle("slaRisk", e.target.checked)
                }
                disabled={loading}
              />
              SLA risk
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                checked={draft.notifications.dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                disabled={loading}
              />
              Daily digest
            </label>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor="digestFrequency"
              >
                Digest frequency
              </label>
              <select
                id="digestFrequency"
                name="digestFrequency"
                value={draft.notifications.digestFrequency}
                onChange={(e) => setDigestFrequency(e.target.value as DigestFrequency)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                disabled={loading || !draft.notifications.dailyDigest}
              >
                {digestFrequencies.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
              {errors.digestFrequency ? (
                <p className="text-xs text-amber-700">
                  {errors.digestFrequency}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Off disables digests. Daily/Weekly enables them automatically.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">Security</h2>
            <p className="text-sm text-slate-600">
              Add friction to risky actions and control session duration.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                checked={draft.security.confirmBulkDelete}
                onChange={(e) =>
                  updateSecurity("confirmBulkDelete", e.target.checked)
                }
                disabled={loading}
              />
              Confirm before bulk delete
            </label>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor="sessionTimeout"
              >
                Session timeout
              </label>
              <select
                id="sessionTimeout"
                name="sessionTimeout"
                value={draft.security.sessionTimeout}
                onChange={(e) =>
                  updateSecurity("sessionTimeout", e.target.value)
                }
                className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white ${
                  errors.sessionTimeout
                    ? "border-amber-400"
                    : "border-slate-200"
                }`}
                disabled={loading}
              >
                {sessionTimeouts.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.sessionTimeout ? (
                <p className="text-xs text-amber-700">
                  {errors.sessionTimeout}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Auto-logout after inactivity.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Integrations */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Integrations
            </h2>
            <p className="text-sm text-slate-600">
              Connect external tools to sync tickets and notifications.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {(
              [
                { key: "slack", title: "Slack", desc: "Send alerts to your Slack workspace." },
                { key: "email", title: "Email", desc: "Route ticket alerts via email." },
                { key: "zendesk", title: "Zendesk", desc: "Sync ticket status with Zendesk." },
                { key: "intercom", title: "Intercom", desc: "Push AI replies to Intercom." },
                { key: "webhooks", title: "Webhooks", desc: "Send events to your endpoint." },
              ] as const
            ).map((item) => {
const integration = draft.integrations[item.key];
              const connected = integration.connected;
              const statusText = connected
                ? integration.lastSyncedAt
                  ? `Last synced: ${formatTimestamp(integration.lastSyncedAt)}`
                  : "Connected"
                : "Not connected";
              return (
                <div
                  key={item.key}
                  className="space-y-3 rounded-lg border border-slate-200 p-4 sm:p-5 lg:p-6 shadow-sm min-w-0 w-full overflow-hidden"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-600 break-words">
                        {item.desc}
                      </p>
                    </div>
                    <Badge variant={connected ? "default" : "secondary"}>
                      {connected ? "Connected" : "Not connected"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 break-words">{statusText}</p>
                  {item.key === "webhooks" && !connected ? (
                    <input
                      className="w-full min-w-0 max-w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                      placeholder="https://example.com/webhook"
                      value={draft.integrations.webhooks.endpoint ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          integrations: {
                            ...prev.integrations,
                            webhooks: {
                              ...prev.integrations.webhooks,
                              endpoint: e.target.value,
                            },
                          },
                        }))
                      }
                      disabled={loading}
                    />
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {connected ? (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => setConnectModal(item.key)}
                          disabled={loading}
                          className="w-full sm:w-auto"
                        >
                          Manage
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => disconnectIntegration(item.key)}
                          disabled={loading}
                          className="w-full sm:w-auto"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => setConnectModal(item.key)}
                        disabled={loading}
                        className="w-full sm:w-auto"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {connectModal ? (
            <div className="fixed inset-0 z-20 flex items-center justify-center px-4 sm:px-6">
              <div
                className="absolute inset-0 bg-slate-900/40"
                onClick={() => setConnectModal(null)}
              />
              <div className="relative w-full max-w-md min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xl space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {`Connect ${connectModal}`}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Allow SupportPilot to sync tickets and notifications with {connectModal}.
                  </p>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Permissions: basic profile, workspace access, send notifications.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => setConnectModal(null)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!connectModal) return;
                      connectIntegration(connectModal);
                      setConnectModal(null);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Confirm connection
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Audit log */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Audit log
            </h2>
            <p className="text-sm text-slate-600">
              Track recent configuration changes in this workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              Last {Math.min(20, draft.auditLog?.length ?? 0)} events.
            </p>
            <Button
              variant="secondary"
              onClick={clearAuditLog}
              disabled={loading || (draft.auditLog ?? []).length === 0}
            >
              Clear log
            </Button>
          </div>
          {(draft.auditLog ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-slate-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Actor</th>
                    <th className="py-2 pr-4">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.auditLog ?? []).map((event) => (
                    <tr key={event.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 text-slate-700">
                        {formatTimestamp(event.createdAt)}
                      </td>
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {event.eventType}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">{event.actor}</td>
                      <td className="py-2 pr-4 text-slate-700">{event.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Data export */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Data export
            </h2>
            <p className="text-sm text-slate-600">
              Export tickets and audit log as CSV.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={exportSettingsCsv} disabled={loading}>
              Download settings CSV
            </Button>
            <Button variant="primary" onClick={exportTicketsCsv} disabled={loading}>
              Download tickets CSV
            </Button>
            <Button variant="secondary" onClick={exportAuditCsv} disabled={loading}>
              Download audit log CSV
            </Button>
          </div>
        </Card>

        {/* SLAs & Business Hours (read-only) */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              SLAs & Business Hours
            </h2>
            <p className="text-sm text-slate-600">
              Define operational targets and working hours used for SLA risk flags and reporting.
            </p>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">SLA targets</p>
                <Badge variant="secondary">Demo</Badge>
              </div>
              <p className="text-sm text-slate-700">First response target: 4h</p>
              <p className="text-sm text-slate-700">Resolution target: 2d</p>
              <p className="text-sm text-slate-700">SLA warning threshold: 80% to breach</p>
              <p className="text-xs text-slate-600">
                Targets are demo values (editable in a future version).
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 sm:p-4">
              <p className="text-sm font-semibold text-slate-900">Business hours</p>
              <p className="text-sm text-slate-700">Mon–Fri, 09:00–18:00</p>
              <p className="text-xs text-slate-600">Timezone: {draft.timezone}</p>
              <p className="text-xs text-slate-600">
                Used for SLA calculations and ticket routing windows.
              </p>
            </div>
          </div>
        </Card>

        {/* Roles & Access (read-only) */}
        <Card className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Roles & Access
            </h2>
            <p className="text-sm text-slate-600">
              Control who can access workspace settings and destructive actions.
            </p>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 sm:p-4">
              <p className="text-sm font-semibold text-slate-900">Your role</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-800">You</p>
                <Badge variant="default">Admin</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Admins can change workspace settings, AI policies, and routing rules.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 p-3 sm:p-4">
              <p className="text-sm font-semibold text-slate-900">
                Permissions (read-only in demo)
              </p>
              <p className="text-xs text-slate-600">
                Role-based access control is coming soon.
              </p>
              <div className="space-y-2">
                {[
                  "Manage AI policies",
                  "Connect integrations",
                  "Export tickets",
                  "Bulk status updates",
                  "Delete tickets",
                  "Reset workspace data",
                ].map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-2 text-sm text-slate-800"
                  >
                    <input type="checkbox" checked readOnly className="h-4 w-4" disabled />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Members</p>
              <p className="text-xs text-slate-600">Read-only preview</p>
            </div>
            <div className="space-y-2">
              {[
                { name: "Gabriella (You)", email: "gabriella@example.com", role: "Admin" },
                { name: "Alex", email: "alex.agent@example.com", role: "Agent" },
                { name: "Maya", email: "maya.viewer@example.com", role: "Viewer" },
              ].map((member) => (
                <div
                  key={member.email}
                  className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-600 break-words">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{member.role}</Badge>
                    <Button variant="secondary" disabled className="opacity-60">
                      ...
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="primary" disabled className="opacity-60">
              Invite member (Coming soon)
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="min-w-0 w-full rounded-xl border border-rose-200 bg-rose-50 p-5 sm:p-6 lg:p-7 xl:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-rose-900">
                Danger zone
              </h2>
              <p className="text-sm text-rose-800">
                These actions affect settings only (demo workspace).
              </p>
            </div>
            <Badge variant="default" className="bg-rose-100 text-rose-800">
              Restricted
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="secondary"
              className="border-rose-200 text-rose-900 hover:border-rose-300 hover:bg-rose-100"
              onClick={resetDemoData}
              disabled={loading}
            >
              Reset settings to defaults
            </Button>

            <Button
              variant="secondary"
              className="border-rose-200 text-rose-900 hover:border-rose-300 hover:bg-rose-100"
              onClick={disableAiFeatures}
              disabled={loading}
            >
              Disable AI features
            </Button>

            <Button
              variant="secondary"
              className="sm:col-span-2 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
              disabled
            >
              Delete workspace (Coming soon)
            </Button>
          </div>
        </Card>
      </div>

      {/* Action bar */}
      {isDirty ? (
        <Card className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 border border-slate-200 bg-white px-4 py-3 shadow-md sm:flex-nowrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              You have unsaved changes
            </p>
            <p className="text-xs text-slate-600">
              Save or discard before leaving this page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDiscard}
              disabled={loading}
            >
              Discard
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </Card>
      ) : null}
      </div>
    </div>
  );
}
