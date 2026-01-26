"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  TicketCategory,
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

const priorityRank: Record<TicketPriority, number> = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const ALL_CATEGORIES = "all";
const ALL_PRIORITIES = "all";
const ALL_ANSWERED = "all";
const ANSWERED_YES = "yes";
const ANSWERED_NO = "no";

const categoryOptions: TicketCategory[] = [
  "Bug",
  "Performance",
  "Billing",
  "Login",
  "UI",
  "Feature Request",
  "Other",
];

const priorityOptions: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

type StatusFilter = "All" | TicketStatus;

type SortOption = "newest" | "oldest" | "priority";

type CategoryFilter = "All categories" | TicketCategory;

type PriorityFilter = "All priorities" | TicketPriority;

type AnsweredFilter = "All" | "Answered" | "Pending";
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

  const categoryFromQuery = searchParams.get("category");
  const activeCategoryFromQuery: CategoryFilter =
    !categoryFromQuery || categoryFromQuery === ALL_CATEGORIES
      ? "All categories"
      : categoryOptions.includes(categoryFromQuery as TicketCategory)
        ? (categoryFromQuery as TicketCategory)
        : "All categories";

  const priorityFromQuery = searchParams.get("priority");
  const activePriorityFromQuery: PriorityFilter =
    !priorityFromQuery || priorityFromQuery === ALL_PRIORITIES
      ? "All priorities"
      : priorityOptions.includes(priorityFromQuery as TicketPriority)
        ? (priorityFromQuery as TicketPriority)
        : "All priorities";

  const searchValue = searchParams.get("q") ?? "";
  const sortFromQuery = searchParams.get("sort");
  const sortOption: SortOption =
    sortFromQuery === "oldest" || sortFromQuery === "priority"
      ? sortFromQuery
      : "newest";

  const answeredFromQuery = searchParams.get("answered");
  const activeAnsweredFromQuery: AnsweredFilter =
    !answeredFromQuery || answeredFromQuery === ALL_ANSWERED
      ? "All"
      : answeredFromQuery === ANSWERED_YES
        ? "Answered"
        : answeredFromQuery === ANSWERED_NO
          ? "Pending"
          : "All";

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(
    activeCategoryFromQuery
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(
    activePriorityFromQuery
  );
  const [answeredFilter, setAnsweredFilter] = useState<AnsweredFilter>(
    activeAnsweredFromQuery
  );

  useEffect(() => {
    hydrateTickets();
  }, [hydrateTickets]);

  useEffect(() => {
    setCategoryFilter(activeCategoryFromQuery);
    setPriorityFilter(activePriorityFromQuery);
    setAnsweredFilter(activeAnsweredFromQuery);
  }, [
    activeCategoryFromQuery,
    activePriorityFromQuery,
    activeAnsweredFromQuery,
  ]);

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
    if (categoryFilter !== "All categories") {
      list = list.filter((ticket) => ticket.category === categoryFilter);
    }
    if (priorityFilter !== "All priorities") {
      list = list.filter((ticket) => ticket.priority === priorityFilter);
    }
    if (answeredFilter === "Answered") {
      list = list.filter((ticket) => Boolean(ticket.aiOutput));
    } else if (answeredFilter === "Pending") {
      list = list.filter((ticket) => !ticket.aiOutput);
    }
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (normalizedSearch) {
      list = list.filter((ticket) => {
        const haystack = `${ticket.title} ${ticket.description}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }
    return list;
  }, [
    tickets,
    activeFilter,
    categoryFilter,
    priorityFilter,
    answeredFilter,
    searchValue,
  ]);

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
    category?: CategoryFilter;
    priority?: PriorityFilter;
    answered?: AnsweredFilter;
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

    if (next.category !== undefined) {
      if (next.category === "All categories") {
        params.set("category", ALL_CATEGORIES);
      } else {
        params.set("category", next.category);
      }
    }

    if (next.priority !== undefined) {
      if (next.priority === "All priorities") {
        params.set("priority", ALL_PRIORITIES);
      } else {
        params.set("priority", next.priority);
      }
    }

    if (next.answered !== undefined) {
      if (next.answered === "All") {
        params.set("answered", ALL_ANSWERED);
      } else if (next.answered === "Answered") {
        params.set("answered", ANSWERED_YES);
      } else {
        params.set("answered", ANSWERED_NO);
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
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleFilterChange = (status: StatusFilter) => {
    updateQuery({ status });
  };

  const handleAnsweredChange = (next: AnsweredFilter) => {
    setAnsweredFilter(next);
    updateQuery({ answered: next });
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const nextCategory: CategoryFilter =
      value === ALL_CATEGORIES
        ? "All categories"
        : (value as TicketCategory);
    setCategoryFilter(nextCategory);
    updateQuery({ category: nextCategory });
  };

  const handlePriorityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const nextPriority: PriorityFilter =
      value === ALL_PRIORITIES
        ? "All priorities"
        : (value as TicketPriority);
    setPriorityFilter(nextPriority);
    updateQuery({ priority: nextPriority });
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
      <div className="flex min-w-0 flex-wrap gap-2">
        {(["All", "Answered", "Pending"] as AnsweredFilter[]).map((option) => (
          <Button
            key={option}
            type="button"
            variant={answeredFilter === option ? "primary" : "secondary"}
            onClick={() => handleAnsweredChange(option)}
          >
            {option}
          </Button>
        ))}
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
      <div className="flex min-w-0 flex-col gap-3 px-1 sm:px-0 sm:flex-row sm:items-center sm:gap-4">
        <div className="w-full sm:w-56">
          <label className="sr-only" htmlFor="ticketCategory">
            Filter by category
          </label>
          <select
            id="ticketCategory"
            name="ticketCategory"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 sm:focus-visible:ring-offset-2 ring-offset-white"
            value={
              categoryFilter === "All categories"
                ? ALL_CATEGORIES
                : categoryFilter
            }
            onChange={handleCategoryChange}
          >
            <option value={ALL_CATEGORIES}>All categories</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="sr-only" htmlFor="ticketPriority">
            Filter by priority
          </label>
          <select
            id="ticketPriority"
            name="ticketPriority"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 sm:focus-visible:ring-offset-2 ring-offset-white"
            value={
              priorityFilter === "All priorities"
                ? ALL_PRIORITIES
                : priorityFilter
            }
            onChange={handlePriorityChange}
          >
            <option value={ALL_PRIORITIES}>All priorities</option>
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
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
