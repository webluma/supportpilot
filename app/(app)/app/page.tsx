"use client";

import { useEffect, useMemo } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTicketsStore } from "@/store/useTicketsStore";
import { computeTicketMetrics } from "@/lib/metrics";

export default function DashboardPage() {
  const tickets = useTicketsStore((state) => state.tickets);
  const isHydrated = useTicketsStore((state) => state.isHydrated);
  const hydrateTickets = useTicketsStore((state) => state.hydrateTickets);

  useEffect(() => {
    hydrateTickets();
  }, [hydrateTickets]);

  const metrics = useMemo(() => computeTicketMetrics(tickets), [tickets]);

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

      {!isHydrated ? (
        <Card className="card-surface p-5 sm:p-6">
          <p className="text-sm text-slate-600">Loading workspace data...</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-stretch">
            {[
              { label: "Total tickets", value: metrics.total },
              { label: "Open", value: metrics.open },
              { label: "Resolved", value: metrics.resolved },
              { label: "Pending AI", value: metrics.pendingAi },
              { label: "Avg first response (h)", value: metrics.avgFirstResponseHrs },
              { label: "Avg resolution (h)", value: metrics.avgResolutionHrs },
              { label: "SLA at risk", value: metrics.atRisk },
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
                      className="flex flex-nowrap items-center gap-4 py-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {ticket.title}
                        </p>
                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                          {ticket.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-slate-600">
                        <Badge variant="default" className="shrink-0">
                          {ticket.status}
                        </Badge>
                        <Badge variant="default" className="shrink-0">
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
