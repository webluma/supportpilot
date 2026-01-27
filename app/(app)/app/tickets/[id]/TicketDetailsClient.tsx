"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  TicketAiOutput,
  TicketPriority,
  TicketStatus,
} from "@/lib/tickets/types";
import { useTicketsStore } from "@/store/useTicketsStore";

const statusVariantMap: Record<
  TicketStatus,
  "default" | "info" | "warning" | "success"
> = {
  Open: "info",
  "In Progress": "warning",
  Resolved: "success",
};

const priorityVariantMap: Record<
  TicketPriority,
  "default" | "info" | "warning" | "success"
> = {
  Low: "default",
  Medium: "info",
  High: "warning",
  Urgent: "warning",
};

type TicketDetailsClientProps = {
  id: string;
};

type AiOutput = {
  customerReply: string;
  qaSummary: string;
  followUpQuestions: string[];
};

type AiErrorResponse = {
  error?: string;
  details?: string;
  status?: number;
  openai?: {
    message?: string | null;
    type?: string | null;
    code?: string | null;
  };
};

type AiState = "idle" | "loading" | "success" | "error";

type CopyKey = "customer" | "qa" | "followups";

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
};

export default function TicketDetailsClient({ id }: TicketDetailsClientProps) {
  const ticket = useTicketsStore((state) =>
    state.tickets.find((item) => item.id === id),
  );
  const isHydrated = useTicketsStore((state) => state.isHydrated);
  const hydrateTickets = useTicketsStore((state) => state.hydrateTickets);
  const saveAiOutput = useTicketsStore((state) => state.saveAiOutput);
  const updateTicketStatus = useTicketsStore(
    (state) => state.updateTicketStatus,
  );
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [replyCopied, setReplyCopied] = useState(false);
  const [replyCopyError, setReplyCopyError] = useState<string | null>(null);
  const [selectedAi, setSelectedAi] = useState<
    { kind: "latest" } | { kind: "version"; version: number }
  >({ kind: "latest" });
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCopyKeyRef = useRef<CopyKey | null>(null);

  useEffect(() => {
    hydrateTickets();
  }, [hydrateTickets]);

  useEffect(() => {
    setAiState("idle");
    setAiError(null);
    setReplyCopied(false);
    setReplyCopyError(null);
    setSelectedAi({ kind: "latest" });
  }, [id]);

  const historyOutputs = ticket?.aiOutputHistory ?? [];
  const latestOutput = ticket?.aiOutput ?? null;
  const allVersions = useMemo(() => {
    const versions: TicketAiOutput[] = [];
    if (latestOutput) {
      versions.push(latestOutput);
    }
    if (historyOutputs.length > 0) {
      historyOutputs.forEach((item) => versions.push(item));
    }
    const uniqueByVersion = new Map<number, TicketAiOutput>();
    versions.forEach((item) => {
      uniqueByVersion.set(item.version, item);
    });
    return Array.from(uniqueByVersion.values()).sort(
      (a, b) => a.version - b.version,
    );
  }, [latestOutput, historyOutputs]);
  const displayedOutput =
    selectedAi.kind === "latest"
      ? latestOutput
      : allVersions.find((item) => item.version === selectedAi.version) ??
        latestOutput;
  const totalVersions = latestOutput ? allVersions.length : 0;
  const shouldShowVersionSelector = totalVersions >= 2;

  useEffect(() => {
    if (
      selectedAi.kind === "version" &&
      !allVersions.find((item) => item.version === selectedAi.version)
    ) {
      setSelectedAi({ kind: "latest" });
    }
  }, [allVersions, selectedAi]);

  useEffect(() => {
    if (ticket?.aiOutput?.generatedAt) {
      setSelectedAi({ kind: "latest" });
    }
  }, [ticket?.aiOutput?.generatedAt]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (replyCopyTimeoutRef.current) {
        clearTimeout(replyCopyTimeoutRef.current);
      }
    };
  }, []);

  const handleGenerateAi = async () => {
    if (!ticket || aiState === "loading") {
      return;
    }

    setAiState("loading");
    setAiError(null);

    try {
      const ticketForAi = {
        ...ticket,
        aiOutput: undefined,
      };
      const response = await fetch("/api/ai/ticket-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: ticketForAi }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | AiErrorResponse
          | null;
        const details =
          typeof errorBody?.details === "string"
            ? errorBody.details
            : typeof errorBody?.openai?.message === "string"
              ? errorBody.openai.message
              : typeof errorBody?.error === "string"
                ? errorBody.error
                : "Failed to generate AI output.";

        let message = details;
        if (response.status === 429) {
          message = "Rate limit or quota reached. Check your OpenAI billing/limits and retry.";
        } else if (response.status === 401 || response.status === 403) {
          message = "OpenAI authentication failed. Check OPENAI_API_KEY.";
        }
        setAiError(message);
        setAiState("error");
        return;
      }

      const data = (await response.json()) as AiOutput;
      const persistedOutput: TicketAiOutput = {
        customerReply: data.customerReply,
        qaSummary: data.qaSummary,
        followUpQuestions: data.followUpQuestions,
        generatedAt: new Date().toISOString(),
        model: "gpt-5-nano",
        version: 0,
      };
      const updatedTicket = saveAiOutput(ticket.id, persistedOutput);
      if (!updatedTicket) {
        setAiError("Failed to persist AI output. Please retry.");
        setAiState("error");
        return;
      }

      setSelectedAi({ kind: "latest" });
      setAiState("success");
    } catch {
      setAiError("Failed to generate AI output.");
      setAiState("error");
    }
  };

  const handleCopy = async (key: CopyKey, text: string) => {
    lastCopyKeyRef.current = key;
    setCopyError(null);

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedKey(null);
      }, 1500);
      return;
    }

    setCopiedKey(null);
    setCopyError("Copy failed. Please try again.");
  };

  const handleCopyCustomerReply = async (output?: TicketAiOutput) => {
    if (!output || aiState === "loading") {
      return;
    }

    setReplyCopyError(null);
    if (replyCopyTimeoutRef.current) {
      clearTimeout(replyCopyTimeoutRef.current);
      replyCopyTimeoutRef.current = null;
    }

    const success = await copyToClipboard(output.customerReply);
    if (success) {
      setReplyCopied(true);
      replyCopyTimeoutRef.current = setTimeout(() => {
        setReplyCopied(false);
      }, 1000);
      return;
    }

    setReplyCopied(false);
    setReplyCopyError("Copy failed. Please try again.");
  };

  const handleRegenerateAi = async () => {
    if (!ticket || aiState === "loading") {
      return;
    }

    await handleGenerateAi();
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!ticket || aiState === "loading") {
      return;
    }
    updateTicketStatus(id, event.target.value as TicketStatus);
  };

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ticket Details"
          description="Review the AI response, QA summary, and follow-up questions for this ticket."
        />
        <Card className="p-6">
          <EmptyState
            title="Loading ticket"
            description="Fetching ticket details for this workspace."
          />
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ticket Details"
          description="Review the AI response, QA summary, and follow-up questions for this ticket."
        />
        <Card className="p-6">
          <EmptyState
            title="Ticket not found"
            description="The ticket you are looking for does not exist or was removed."
            action={<ButtonLink href="/app/tickets">Back to tickets</ButtonLink>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ticket.title}
        description="Review the AI response, QA summary, and follow-up questions for this ticket."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariantMap[ticket.status]}>
              {ticket.status}
            </Badge>
            <Badge variant={priorityVariantMap[ticket.priority]}>
              {ticket.priority} priority
            </Badge>
          </div>
        }
      />
      <Card className="p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Description</p>
          <p className="text-sm text-slate-600">{ticket.description}</p>
        </div>
      </Card>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-slate-900"
              htmlFor="ticketStatus"
            >
              Status
            </label>
            <select
              id="ticketStatus"
              name="ticketStatus"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white sm:max-w-xs"
              value={ticket.status}
              onChange={handleStatusChange}
              disabled={aiState === "loading"}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </p>
              <p className="text-sm text-slate-900">{ticket.category}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Channel
              </p>
              <p className="text-sm text-slate-900">{ticket.channel}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {ticket.stepsToReproduce ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Steps to reproduce
                </p>
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {ticket.stepsToReproduce}
                </p>
              </div>
            ) : null}
            {ticket.expectedResult ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Expected result
                </p>
                <p className="text-sm text-slate-600">{ticket.expectedResult}</p>
              </div>
            ) : null}
            {ticket.actualResult ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Actual result
                </p>
                <p className="text-sm text-slate-600">{ticket.actualResult}</p>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
      {ticket.aiOutput ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleCopyCustomerReply(displayedOutput)}
              disabled={aiState === "loading" || !displayedOutput}
            >
              {replyCopied ? "Copied" : "Copy customer reply"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRegenerateAi}
              disabled={aiState === "loading"}
            >
              Regenerate AI output
            </Button>
            {replyCopyError ? (
              <span className="text-xs text-rose-600">{replyCopyError}</span>
            ) : null}
          </div>
          {displayedOutput?.generatedAt || displayedOutput?.model ? (
            <div className="text-xs text-slate-500">
              {displayedOutput?.generatedAt
                ? `Generated at: ${displayedOutput.generatedAt}`
                : null}
              {displayedOutput?.generatedAt && displayedOutput?.model
                ? " · "
                : null}
              {displayedOutput?.model
                ? `Model: ${displayedOutput.model}`
                : null}
            </div>
          ) : null}
          {shouldShowVersionSelector ? (
            <Card className="p-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  AI Output History
                </p>
                <p className="text-xs text-slate-500">
                  Selected:{" "}
                  {selectedAi.kind === "latest"
                    ? `LATEST (Version ${latestOutput?.version ?? "—"})`
                    : `Version ${selectedAi.version}`}
                </p>
                <div className="grid gap-3">
                  <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant={
                        selectedAi.kind === "latest" ? "primary" : "secondary"
                      }
                      onClick={() => setSelectedAi({ kind: "latest" })}
                      disabled={aiState === "loading"}
                    >
                      LATEST
                    </Button>
                    <span className="text-xs text-slate-500">
                      {latestOutput?.generatedAt
                        ? `Generated at: ${latestOutput.generatedAt}`
                        : "Generated at: —"}
                      {latestOutput?.model
                        ? ` · Model: ${latestOutput.model}`
                        : ""}
                    </span>
                  </div>
                  {allVersions.length > 0
                    ? allVersions.map((version) => {
                        const historyKeyBase = version.generatedAt ?? "history";
                        const isSelected =
                          selectedAi.kind === "version" &&
                          selectedAi.version === version.version;
                        return (
                          <div
                            key={`${historyKeyBase}-${version.version}`}
                            className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <Button
                                type="button"
                                variant={isSelected ? "primary" : "secondary"}
                                onClick={() =>
                                  setSelectedAi({
                                    kind: "version",
                                    version: version.version,
                                  })
                                }
                                disabled={aiState === "loading"}
                              >
                                Version {version.version}
                              </Button>
                              <span className="text-xs text-slate-500">
                                {version.generatedAt
                                  ? `Generated at: ${version.generatedAt}`
                                  : "Generated at: —"}
                                {version.model
                                  ? ` · Model: ${version.model}`
                                  : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    : null}
                </div>
              </div>
            </Card>
          ) : null}
          <div className="grid gap-4">
            <Card className="p-6">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Customer Reply
                  </p>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3"
                      onClick={() =>
                        handleCopy("customer", displayedOutput?.customerReply ?? "")
                      }
                      disabled={!displayedOutput}
                    >
                      {copiedKey === "customer" ? "Copied!" : "Copy"}
                    </Button>
                    {copyError &&
                    lastCopyKeyRef.current === "customer" ? (
                      <span className="text-xs text-rose-600">
                        Copy failed. Please try again.
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {displayedOutput?.customerReply}
                </p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    QA Summary
                  </p>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3"
                      onClick={() =>
                        handleCopy("qa", displayedOutput?.qaSummary ?? "")
                      }
                      disabled={!displayedOutput}
                    >
                      {copiedKey === "qa" ? "Copied!" : "Copy"}
                    </Button>
                    {copyError && lastCopyKeyRef.current === "qa" ? (
                      <span className="text-xs text-rose-600">
                        Copy failed. Please try again.
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {displayedOutput?.qaSummary}
                </p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Follow-up Questions
                  </p>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3"
                      onClick={() =>
                        handleCopy(
                          "followups",
                          (displayedOutput?.followUpQuestions ?? [])
                            .map((question) => `- ${question}`)
                            .join("\n"),
                        )
                      }
                      disabled={!displayedOutput}
                    >
                      {copiedKey === "followups" ? "Copied!" : "Copy"}
                    </Button>
                    {copyError && lastCopyKeyRef.current === "followups" ? (
                      <span className="text-xs text-rose-600">
                        Copy failed. Please try again.
                      </span>
                    ) : null}
                  </div>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {(displayedOutput?.followUpQuestions ?? []).map(
                    (question, index) => {
                      const followUpKeyBase =
                        displayedOutput?.generatedAt ?? "ai";
                      return (
                        <li key={`${followUpKeyBase}-${index}`}>{question}</li>
                      );
                    },
                  )}
                </ul>
              </div>
            </Card>
        </div>
        </div>
      ) : aiState === "idle" ? (
        <Card className="p-6">
          <EmptyState
            title="AI output pending"
            description="Generate responses after a ticket is submitted to populate this view."
            action={
              <Button onClick={handleGenerateAi}>Generate AI output</Button>
            }
          />
        </Card>
      ) : null}
      {aiState === "loading" ? (
        <Card className="p-6">
          <EmptyState
            title="Generating AI output"
            description="This usually takes a few seconds. Please keep this tab open."
          />
        </Card>
      ) : null}
      {aiState === "error" ? (
        <Card className="p-6">
          <EmptyState
            title="AI output failed"
            description={aiError ?? "Something went wrong while generating AI output."}
            action={<Button onClick={handleGenerateAi}>Retry</Button>}
          />
        </Card>
      ) : null}
    </div>
  );
}
