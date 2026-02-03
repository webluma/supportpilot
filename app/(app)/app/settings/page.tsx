"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Settings = {
  workspaceName: string;
  timezone: string;
  aiEnabled: boolean;
  aiTone: string;
  aiRedact: boolean;
  notifications: {
    newTicket: boolean;
    slaRisk: boolean;
    dailyDigest: boolean;
    digestFrequency: string; // "Daily" | "Weekly" | "Off"
  };
  security: {
    confirmBulkDelete: boolean;
    sessionTimeout: string;
  };
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
  };

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

export default function SettingsPage() {
  const [baseline, setBaseline] = useState<Settings>(defaultSettings);
  const [draft, setDraft] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSave = () => {
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    setTimeout(() => {
      try {
        const normalized = normalizeNotifications(draft);
        persistSettings(normalized);
        setBaseline(normalized);
        setDraft(normalized);
        setMessage({ type: "success", text: "Settings saved" });
      } catch {
        setMessage({ type: "error", text: "Could not save settings" });
      } finally {
        setLoading(false);
      }
    }, 450);
  };

  const handleDiscard = () => {
    setDraft(baseline);
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

    setBaseline(defaultSettings);
    setDraft(defaultSettings);
    persistSettings(defaultSettings);
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
    setDraft(updated);
    setBaseline(updated);
    persistSettings(updated);
    setMessage({ type: "success", text: "AI features disabled" });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
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

      <div className="grid gap-4 sm:gap-6">
        {/* Workspace */}
        <Card className="p-5 sm:p-6 space-y-4">
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
        <Card className="p-5 sm:p-6 space-y-4">
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
        <Card className="p-5 sm:p-6 space-y-4">
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
                onChange={(e) => setDigestFrequency(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                disabled={loading}
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
        <Card className="p-5 sm:p-6 space-y-4">
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

        {/* Danger Zone */}
        <Card className="p-5 sm:p-6 space-y-4 border border-rose-200 bg-rose-50">
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
  );
}
