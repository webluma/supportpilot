 "use client";

import { useMemo } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTicketsStore } from "@/store/useTicketsStore";

export default function DashboardPage() {
  const tickets = useTicketsStore((state) => state.tickets);

  const metrics = useMemo(() => {
    const base = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      pendingAi: 0,
    };
    tickets.forEach((ticket) => {
      if (ticket.status === "Open") base.open += 1;
      if (ticket.status === "In Progress") base.inProgress += 1;
      if (ticket.status === "Resolved") base.resolved += 1;
      if (!ticket.aiOutput) base.pendingAi += 1;
    });
    return base;
  }, [tickets]);

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-10">
      <PageHeader
        title="Workspace Overview"
        description="Monitor support velocity, AI coverage, and operational health at a glance."
        badge={<Badge variant="info">Live</Badge>}
        actions={
          <ButtonLink href="/app/tickets/new" className="shadow-md">
            Create ticket
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Open", value: metrics.open },
          { label: "In Progress", value: metrics.inProgress },
          { label: "Resolved", value: metrics.resolved },
          { label: "Pending AI", value: metrics.pendingAi },
        ].map((item) => (
          <Card
            key={item.label}
            className="card-surface h-full p-3 sm:p-5 transition hover:shadow-lg flex flex-col"
          >
            <p className="meta-label truncate">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 sm:text-3xl">
              {item.value}
            </p>
            <p className="mt-auto text-xs text-slate-500 leading-relaxed line-clamp-2">
              Updated in real time from your local workspace
            </p>
          </Card>
        ))}
      </div>

      <Card className="card-surface p-5 sm:p-6 flex flex-col gap-4">
        {recentTickets.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Create your first support ticket to generate AI insights and summaries."
            action={
              <ButtonLink href="/app/tickets/new">
                Create a new ticket
              </ButtonLink>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">
                  Recent tickets
                </p>
                <p className="text-xs text-slate-500">
                  Latest activity across channels
                </p>
              </div>
              <ButtonLink variant="secondary" href="/app/tickets">
                View all
              </ButtonLink>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {ticket.title}
                    </p>
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Badge variant="default">{ticket.status}</Badge>
                    <Badge variant="default">{ticket.priority}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
