"use client";

import { useEffect } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
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

export default function TicketDetailsClient({ id }: TicketDetailsClientProps) {
  const ticket = useTicketsStore((state) =>
    state.tickets.find((item) => item.id === id),
  );
  const isHydrated = useTicketsStore((state) => state.isHydrated);
  const hydrateTickets = useTicketsStore((state) => state.hydrateTickets);

  useEffect(() => {
    hydrateTickets();
  }, [hydrateTickets]);

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
      <Card className="p-6">
        <EmptyState
          title="AI output pending"
          description="Generate responses after a ticket is submitted to populate this view."
          action={<ButtonLink href="/app/tickets">Back to tickets</ButtonLink>}
        />
      </Card>
    </div>
  );
}
