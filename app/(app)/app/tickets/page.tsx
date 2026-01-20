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

export default function TicketsPage() {
  const tickets = useTicketsStore((state) => state.tickets);
  const isHydrated = useTicketsStore((state) => state.isHydrated);
  const hydrateTickets = useTicketsStore((state) => state.hydrateTickets);

  useEffect(() => {
    hydrateTickets();
  }, [hydrateTickets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Review, filter, and prioritize incoming support requests."
        badge={<Badge>All</Badge>}
        actions={
          <ButtonLink href="/app/tickets/new" variant="secondary">
            Create a new ticket
          </ButtonLink>
        }
      />
      {!isHydrated ? (
        <Card className="p-6">
          <EmptyState
            title="Loading tickets"
            description="Fetching the latest ticket activity for this workspace."
          />
        </Card>
      ) : tickets.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="No tickets found"
            description="Create a new ticket to see it appear in the dashboard list."
            action={
              <ButtonLink href="/app/tickets/new">
                Create a new ticket
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="w-full max-w-full p-6">
              <div className="flex flex-col items-start gap-2">
                <div className="w-full space-y-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {ticket.title}
                  </p>
                  <p className="line-clamp-2 text-sm text-slate-600 sm:truncate">
                    {ticket.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariantMap[ticket.status]}>
                    {ticket.status}
                  </Badge>
                  <Badge variant={priorityVariantMap[ticket.priority]}>
                    {ticket.priority} priority
                  </Badge>
                </div>
                <div className="w-full pt-2">
                  <ButtonLink
                    href={`/app/tickets/${ticket.id}`}
                    className="inline-block"
                  >
                    View ticket
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
