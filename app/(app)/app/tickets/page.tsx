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

const priorityRank: Record<TicketPriority, number> = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

type StatusFilter = "All" | TicketStatus;

type SortOption = "newest" | "oldest" | "priority";

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

  const searchValue = searchParams.get("q") ?? "";
  const sortFromQuery = searchParams.get("sort");
  const sortOption: SortOption =
    sortFromQuery === "oldest" || sortFromQuery === "priority"
      ? sortFromQuery
      : "newest";

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
    let list = tickets;
    if (activeFilter !== "All") {
      list = list.filter((ticket) => ticket.status === activeFilter);
    }
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (normalizedSearch) {
      list = list.filter((ticket) => {
        const haystack = `${ticket.title} ${ticket.description}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }
    return list;
  }, [tickets, activeFilter, searchValue]);

  const sortedTickets = useMemo(() => {
    const list = [...filteredTickets];
    if (sortOption === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return list;
    }
    if (sortOption === "priority") {
      list.sort((a, b) => {
        const rankDiff = priorityRank[b.priority] - priorityRank[a.priority];
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      return list;
    }

    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  }, [filteredTickets, sortOption]);

  const updateQuery = (next: {
    status?: StatusFilter;
    q?: string;
    sort?: SortOption;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.status !== undefined) {
      if (next.status === "All") {
        params.delete("status");
      } else {
        params.set("status", next.status);
      }
    }

    if (next.q !== undefined) {
      const trimmed = next.q.trim();
      if (!trimmed) {
        params.delete("q");
      } else {
        params.set("q", trimmed);
      }
    }

    if (next.sort !== undefined) {
      if (next.sort === "newest") {
        params.delete("sort");
      } else {
        params.set("sort", next.sort);
      }
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleFilterChange = (status: StatusFilter) => {
    updateQuery({ status });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateQuery({ q: event.target.value });
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateQuery({ sort: event.target.value as SortOption });
  };

  const handleClearSearch = () => {
    updateQuery({ q: "" });
  };

  const hasSearch = searchValue.trim().length > 0;

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
      <div className="flex min-w-0 flex-col gap-3 px-1 sm:px-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full min-w-0 sm:max-w-sm">
          <label className="sr-only" htmlFor="ticketSearch">
            Search tickets
          </label>
          <input
            id="ticketSearch"
            name="ticketSearch"
            type="text"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 sm:focus-visible:ring-offset-2 ring-offset-white"
            placeholder="Search tickets..."
            value={searchValue}
            onChange={handleSearchChange}
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="sr-only" htmlFor="ticketSort">
            Sort tickets
          </label>
          <select
            id="ticketSort"
            name="ticketSort"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 sm:focus-visible:ring-offset-2 ring-offset-white"
            value={sortOption}
            onChange={handleSortChange}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>
      {!isHydrated ? (
        <Card className="p-6">
          <EmptyState
            title="Loading tickets"
            description="Fetching the latest ticket activity for this workspace."
          />
        </Card>
      ) : sortedTickets.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="No tickets found"
            description={
              hasSearch
                ? "No tickets match your search. Try a different query or clear the search."
                : "No tickets match the current filter. Try another status or create a new ticket."
            }
            action={
              hasSearch ? (
                <Button variant="secondary" onClick={handleClearSearch}>
                  Clear search
                </Button>
              ) : (
                <ButtonLink href="/app/tickets/new">
                  Create a new ticket
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <div className="min-w-0 grid gap-4">
          {sortedTickets.map((ticket) => (
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
                  <Badge variant={ticket.aiOutput ? "success" : "default"}>
                    {ticket.aiOutput ? "Answered" : "Pending"}
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
