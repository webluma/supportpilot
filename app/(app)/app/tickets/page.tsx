"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

type StatusFilter = "All" | TicketStatus;

export default function TicketsPage() {
  const tickets = useTicketsStore((state) => state.tickets);
  const isHydrated = useTicketsStore((state) => state.isHydrated);
  const hydrateTickets = useTicketsStore((state) => state.hydrateTickets);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const statusFromQuery = searchParams.get("status");
  const activeFilter: StatusFilter =
    statusFromQuery === "Open" ||
    statusFromQuery === "In Progress" ||
    statusFromQuery === "Resolved"
      ? statusFromQuery
      : "All";

  useEffect(() => {
    hydrateTickets();
  }, [hydrateTickets]);

  const counts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc.All += 1;
        acc[ticket.status] += 1;
        return acc;
      },
      {
        All: 0,
        Open: 0,
        "In Progress": 0,
        Resolved: 0,
      }
    );
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (activeFilter === "All") {
      return tickets;
    }
    return tickets.filter((ticket) => ticket.status === activeFilter);
  }, [tickets, activeFilter]);

  const handleFilterChange = (status: StatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "All") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="min-w-0 w-full max-w-full overflow-x-hidden space-y-6">
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
      <div className="flex min-w-0 flex-wrap gap-2">
        {(["All", "Open", "In Progress", "Resolved"] as StatusFilter[]).map(
          (status) => (
            <Button
              key={status}
              type="button"
              variant={activeFilter === status ? "primary" : "secondary"}
              onClick={() => handleFilterChange(status)}
            >
              {status} ({counts[status]})
            </Button>
          )
        )}
      </div>
      {!isHydrated ? (
        <Card className="p-6">
          <EmptyState
            title="Loading tickets"
            description="Fetching the latest ticket activity for this workspace."
          />
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="No tickets found"
            description="No tickets match the current filter. Try another status or create a new ticket."
            action={
              <ButtonLink href="/app/tickets/new">
                Create a new ticket
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="min-w-0 grid gap-4">
          {filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="min-w-0 w-full max-w-full box-border overflow-hidden p-3 sm:p-6"
            >
              <div className="flex min-w-0 flex-col items-start gap-2">
                <div className="min-w-0 w-full space-y-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {ticket.title}
                  </p>
                  <p className="line-clamp-2 break-words text-sm text-slate-600 sm:truncate">
                    {ticket.description}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
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
