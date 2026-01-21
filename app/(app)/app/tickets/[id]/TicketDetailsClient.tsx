"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TicketPriority, TicketStatus } from "@/lib/tickets/types";
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

export default function TicketDetailsClient({ id }: TicketDetailsClientProps) {
  const ticket = useTicketsStore((state) =>
    state.tickets.find((item) => item.id === id),
  );
  const isHydrated = useTicketsStore((state) => state.isHydrated);
  const hydrateTickets = useTicketsStore((state) => state.hydrateTickets);
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiOutput, setAiOutput] = useState<AiOutput | null>(null);

  useEffect(() => {
    hydrateTickets();
  }, [hydrateTickets]);

  useEffect(() => {
    setAiState("idle");
    setAiError(null);
    setAiOutput(null);
  }, [id]);

  const handleGenerateAi = async () => {
    if (!ticket || aiState === "loading") {
      return;
    }

    setAiState("loading");
    setAiError(null);

    try {
      const response = await fetch("/api/ai/ticket-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
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
      setAiOutput(data);
      setAiState("success");
    } catch {
      setAiError("Failed to generate AI output.");
      setAiState("error");
    }
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
      {aiState === "idle" ? (
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
      {aiState === "success" && aiOutput ? (
        <div className="grid gap-4">
          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Customer Reply
              </p>
              <p className="whitespace-pre-line text-sm text-slate-600">
                {aiOutput.customerReply}
              </p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">QA Summary</p>
              <p className="whitespace-pre-line text-sm text-slate-600">
                {aiOutput.qaSummary}
              </p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Follow-up Questions
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                {aiOutput.followUpQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
