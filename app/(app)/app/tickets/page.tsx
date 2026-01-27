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
const ANSWERED_ALL = "all";
const ANSWERED_ANSWERED = "answered";
const ANSWERED_PENDING = "pending";

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

type StatusFilter = "All" | "Active" | TicketStatus;

type SortOption = "newest" | "oldest" | "priority" | "updated";

type CategoryFilter = "All categories" | TicketCategory;

type PriorityFilter = "All priorities" | TicketPriority;

type AnsweredFilter = "all" | "pending" | "answered";

const sortOptionLabels: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  priority: "Priority",
  updated: "Recently updated",
};

export default function TicketsPage() {
  const tickets = useTicketsStore((state) => state.tickets);
  const isHydrated = useTicketsStore((state) => state.isHydrated);
  const hydrateTickets = useTicketsStore((state) => state.hydrateTickets);
  const updateTicketStatus = useTicketsStore(
    (state) => state.updateTicketStatus
  );
  const deleteTicket = useTicketsStore((state) => state.deleteTicket);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const statusFromQuery = searchParams.get("status");
  const activeFilter: StatusFilter =
    statusFromQuery === "active"
      ? "Active"
      : statusFromQuery === "Open" ||
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
    sortFromQuery === "oldest" ||
    sortFromQuery === "priority" ||
    sortFromQuery === "updated"
      ? sortFromQuery
      : "newest";

  const answeredFromQuery = searchParams.get("answered");
  const isValidAnsweredParam =
    answeredFromQuery === ANSWERED_ALL ||
    answeredFromQuery === ANSWERED_ANSWERED ||
    answeredFromQuery === ANSWERED_PENDING;
  const activeAnsweredFromQuery: AnsweredFilter = isValidAnsweredParam
    ? (answeredFromQuery as AnsweredFilter)
    : ANSWERED_ALL;

  const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
  type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
  const pageSizeFromQuery = searchParams.get("pageSize");
  const parsedPageSize = Number.parseInt(pageSizeFromQuery ?? "", 10);
  const pageSize: PageSizeOption = PAGE_SIZE_OPTIONS.includes(
    parsedPageSize as PageSizeOption
  )
    ? (parsedPageSize as PageSizeOption)
    : 10;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  }, [activeCategoryFromQuery, activePriorityFromQuery, activeAnsweredFromQuery]);

  const counts = useMemo(() => {
    const base = tickets.reduce(
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
    return {
      ...base,
      Active: base.Open + base["In Progress"],
    };
  }, [tickets]);

  const answeredCounts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc.all += 1;
        if (ticket.aiOutput) {
          acc.answered += 1;
        } else {
          acc.pending += 1;
        }
        return acc;
      },
      {
        all: 0,
        answered: 0,
        pending: 0,
      }
    );
  }, [tickets]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeFilter !== "All") {
      count += 1;
    }
    if (categoryFilter !== "All categories") {
      count += 1;
    }
    if (priorityFilter !== "All priorities") {
      count += 1;
    }
    if (answeredFilter !== "all") {
      count += 1;
    }
    if (searchValue.trim().length > 0) {
      count += 1;
    }
    if (sortOption !== "newest") {
      count += 1;
    }
    return count;
  }, [
    activeFilter,
    categoryFilter,
    priorityFilter,
    answeredFilter,
    searchValue,
    sortOption,
  ]);

  const hasActiveFilters = activeFiltersCount > 0;

  const filteredTickets = useMemo(() => {
    let list = tickets;
    if (activeFilter === "Active") {
      list = list.filter(
        (ticket) =>
          ticket.status === "Open" || ticket.status === "In Progress"
      );
    } else if (activeFilter !== "All") {
      list = list.filter((ticket) => ticket.status === activeFilter);
    }
    if (categoryFilter !== "All categories") {
      list = list.filter((ticket) => ticket.category === categoryFilter);
    }
    if (priorityFilter !== "All priorities") {
      list = list.filter((ticket) => ticket.priority === priorityFilter);
    }
    if (answeredFilter === "answered") {
      list = list.filter((ticket) => Boolean(ticket.aiOutput));
    } else if (answeredFilter === "pending") {
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
    if (sortOption === "updated") {
      list.sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
        const safeATime = Number.isNaN(aTime) ? 0 : aTime;
        const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
        return safeBTime - safeATime;
      });
      return list;
    }

    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  }, [filteredTickets, sortOption]);

  const totalTickets = sortedTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalTickets / pageSize));
  const pageFromQuery = searchParams.get("page");
  const parsedPage = Number.parseInt(pageFromQuery ?? "1", 10);
  const safePage = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const currentPage = Math.min(Math.max(safePage, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTickets);
  const paginatedTickets = sortedTickets.slice(startIndex, endIndex);

  const pageItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, "…", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "…", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "…", currentPage, "…", totalPages];
  }, [currentPage, totalPages]);

  const allOnPageSelected =
    paginatedTickets.length > 0 &&
    paginatedTickets.every((ticket) => selectedIds.has(ticket.id));

  const updateQuery = (next: {
    status?: StatusFilter;
    category?: CategoryFilter;
    priority?: PriorityFilter;
    answered?: AnsweredFilter;
    q?: string;
    sort?: SortOption;
    page?: number;
    pageSize?: number;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.status !== undefined) {
      if (next.status === "All") {
        params.delete("status");
      } else if (next.status === "Active") {
        params.set("status", "active");
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
      params.set("answered", next.answered);
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

    if (next.page !== undefined) {
      const safeNextPage = Number.isFinite(next.page)
        ? Math.max(1, Math.floor(next.page))
        : 1;
      if (safeNextPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(safeNextPage));
      }
    }

    if (next.pageSize !== undefined) {
      const safeNextPageSize = PAGE_SIZE_OPTIONS.includes(
        next.pageSize as PageSizeOption
      )
        ? next.pageSize
        : 10;
      params.set("pageSize", String(safeNextPageSize));
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!isValidAnsweredParam) {
      updateQuery({ answered: ANSWERED_ALL });
    }
  }, [isValidAnsweredParam]);

  useEffect(() => {
    if (!pageFromQuery) {
      return;
    }
    if (Number.isNaN(parsedPage) || parsedPage < 1 || parsedPage > totalPages) {
      updateQuery({ page: currentPage });
    }
  }, [pageFromQuery, parsedPage, totalPages, currentPage]);

  useEffect(() => {
    setSelectedIds((prev) => (prev.size ? new Set() : prev));
  }, [
    currentPage,
    activeFilter,
    categoryFilter,
    priorityFilter,
    answeredFilter,
    searchValue,
    sortOption,
    pageSize,
  ]);

  const handleFilterChange = (status: StatusFilter) => {
    updateQuery({ status, page: 1 });
  };

  const handleAnsweredChange = (next: AnsweredFilter) => {
    setAnsweredFilter(next);
    updateQuery({ answered: next, page: 1 });
  };

  const handleClearFilters = () => {
    setCategoryFilter("All categories");
    setPriorityFilter("All priorities");
    setAnsweredFilter(ANSWERED_ALL);
    updateQuery({
      status: "All",
      category: "All categories",
      priority: "All priorities",
      answered: ANSWERED_ALL,
      q: "",
      sort: "newest",
      page: 1,
    });
  };

  const handleRemoveStatusFilter = () => {
    updateQuery({ status: "All", page: 1 });
  };

  const handleRemoveCategoryFilter = () => {
    setCategoryFilter("All categories");
    updateQuery({ category: "All categories", page: 1 });
  };

  const handleRemovePriorityFilter = () => {
    setPriorityFilter("All priorities");
    updateQuery({ priority: "All priorities", page: 1 });
  };

  const handleRemoveAnsweredFilter = () => {
    setAnsweredFilter(ANSWERED_ALL);
    updateQuery({ answered: ANSWERED_ALL, page: 1 });
  };

  const handleRemoveSearchFilter = () => {
    updateQuery({ q: "", page: 1 });
  };

  const handleRemoveSortFilter = () => {
    updateQuery({ sort: "newest", page: 1 });
  };

  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;
    const nextCategory: CategoryFilter =
      value === ALL_CATEGORIES ? "All categories" : (value as TicketCategory);
    setCategoryFilter(nextCategory);
    updateQuery({ category: nextCategory, page: 1 });
  };

  const handlePriorityChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;
    const nextPriority: PriorityFilter =
      value === ALL_PRIORITIES ? "All priorities" : (value as TicketPriority);
    setPriorityFilter(nextPriority);
    updateQuery({ priority: nextPriority, page: 1 });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateQuery({ q: event.target.value, page: 1 });
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateQuery({ sort: event.target.value as SortOption, page: 1 });
  };

  const handleClearSearch = () => {
    updateQuery({ q: "", page: 1 });
  };

  const handlePageSizeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = Number.parseInt(event.target.value, 10);
    updateQuery({ pageSize: value, page: 1 });
  };

  const handlePageChange = (nextPage: number) => {
    updateQuery({ page: nextPage });
  };

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(paginatedTickets.map((ticket) => ticket.id)));
  };

  const handleToggleTicket = (ticketId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  const handleBulkStatusUpdate = (status: TicketStatus) => {
    selectedIds.forEach((id) => updateTicketStatus(id, status));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (!window.confirm("Delete selected tickets?")) {
      return;
    }
    selectedIds.forEach((id) => deleteTicket(id));
    setSelectedIds(new Set());
  };

  const hasSearch = searchValue.trim().length > 0;
  const hasNonSearchFilters = activeFiltersCount > (hasSearch ? 1 : 0);

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
        {(
          ["All", "Active", "Open", "In Progress", "Resolved"] as StatusFilter[]
        ).map((status) => (
          <Button
            key={status}
            type="button"
            variant={activeFilter === status ? "primary" : "secondary"}
            onClick={() => handleFilterChange(status)}
          >
            {status} ({counts[status]})
          </Button>
        ))}
      </div>
      <div className="flex min-w-0 flex-wrap gap-2">
        {(
          [
            { label: "All", value: ANSWERED_ALL },
            { label: "Answered", value: ANSWERED_ANSWERED },
            { label: "Pending", value: ANSWERED_PENDING },
          ] as Array<{ label: string; value: AnsweredFilter }>
        ).map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={answeredFilter === option.value ? "primary" : "secondary"}
            onClick={() => handleAnsweredChange(option.value)}
          >
            {option.label} ({answeredCounts[option.value]})
          </Button>
        ))}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-600">
        {hasActiveFilters ? (
          <span>Active filters: {activeFiltersCount}</span>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </Button>
      </div>
      {hasActiveFilters ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {activeFilter !== "All" ? (
            <Badge className="gap-2 pr-1">
              Status: {activeFilter}
              <button
                type="button"
                aria-label="Remove status filter"
                className="rounded-full px-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ring-offset-white"
                onClick={handleRemoveStatusFilter}
              >
                ×
              </button>
            </Badge>
          ) : null}
          {categoryFilter !== "All categories" ? (
            <Badge className="gap-2 pr-1">
              Category: {categoryFilter}
              <button
                type="button"
                aria-label="Remove category filter"
                className="rounded-full px-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ring-offset-white"
                onClick={handleRemoveCategoryFilter}
              >
                ×
              </button>
            </Badge>
          ) : null}
          {priorityFilter !== "All priorities" ? (
            <Badge className="gap-2 pr-1">
              Priority: {priorityFilter}
              <button
                type="button"
                aria-label="Remove priority filter"
                className="rounded-full px-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ring-offset-white"
                onClick={handleRemovePriorityFilter}
              >
                ×
              </button>
            </Badge>
          ) : null}
          {answeredFilter !== "all" ? (
            <Badge className="gap-2 pr-1">
              AI: {answeredFilter === "answered" ? "Answered" : "Pending"}
              <button
                type="button"
                aria-label="Remove AI filter"
                className="rounded-full px-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ring-offset-white"
                onClick={handleRemoveAnsweredFilter}
              >
                ×
              </button>
            </Badge>
          ) : null}
          {hasSearch ? (
            <Badge className="gap-2 pr-1">
              <span className="max-w-[200px] truncate">
                Search: {searchValue.trim()}
              </span>
              <button
                type="button"
                aria-label="Remove search filter"
                className="rounded-full px-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ring-offset-white"
                onClick={handleRemoveSearchFilter}
              >
                ×
              </button>
            </Badge>
          ) : null}
          {sortOption !== "newest" ? (
            <Badge className="gap-2 pr-1">
              Sort: {sortOptionLabels[sortOption]}
              <button
                type="button"
                aria-label="Remove sort filter"
                className="rounded-full px-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ring-offset-white"
                onClick={handleRemoveSortFilter}
              >
                ×
              </button>
            </Badge>
          ) : null}
        </div>
      ) : null}
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
            <option value="updated">Recently updated</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="sr-only" htmlFor="ticketPageSize">
            Items per page
          </label>
          <select
            id="ticketPageSize"
            name="ticketPageSize"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-0 sm:focus-visible:ring-offset-2 ring-offset-white"
            value={pageSize}
            onChange={handlePageSizeChange}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
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
                : hasNonSearchFilters
                ? "No tickets match the current filters. Try adjusting the filters or create a new ticket."
                : "No tickets match the current filter. Try another status or create a new ticket."
            }
            action={
              hasSearch || hasNonSearchFilters ? (
                <div className="flex flex-wrap gap-2">
                  {hasSearch ? (
                    <Button variant="secondary" onClick={handleClearSearch}>
                      Clear search
                    </Button>
                  ) : null}
                  {hasNonSearchFilters ? (
                    <Button variant="secondary" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ButtonLink href="/app/tickets/new">
                  Create a new ticket
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedTickets.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                  checked={allOnPageSelected}
                  onChange={handleToggleSelectAll}
                />
                <span>Select all on page</span>
              </label>
              {selectedIds.size > 0 ? (
                <span>{selectedIds.size} selected</span>
              ) : null}
            </div>
          ) : null}
          {selectedIds.size > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleBulkStatusUpdate("Resolved")}
              >
                Mark as Resolved
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleBulkStatusUpdate("In Progress")}
              >
                Mark as In Progress
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleBulkDelete}
              >
                Delete selected
              </Button>
            </div>
          ) : null}
          <div className="min-w-0 grid gap-4">
            {paginatedTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="min-w-0 w-full max-w-full box-border overflow-hidden p-3 sm:p-6"
              >
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <div className="flex min-w-0 w-full items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                      checked={selectedIds.has(ticket.id)}
                      onChange={() => handleToggleTicket(ticket.id)}
                      aria-label={`Select ticket ${ticket.title}`}
                    />
                    <div className="min-w-0 w-full space-y-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {ticket.title}
                      </p>
                      <p className="line-clamp-2 break-words text-sm text-slate-600 sm:truncate">
                        {ticket.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                      aria-label={`Filter by status ${ticket.status}`}
                      onClick={() => handleFilterChange(ticket.status)}
                    >
                      <Badge variant={statusVariantMap[ticket.status]}>
                        {ticket.status}
                      </Badge>
                    </button>
                    <button
                      type="button"
                      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                      aria-label={`Filter by priority ${ticket.priority}`}
                      onClick={() => {
                        setPriorityFilter(ticket.priority);
                        updateQuery({ priority: ticket.priority, page: 1 });
                      }}
                    >
                      <Badge variant={priorityVariantMap[ticket.priority]}>
                        {ticket.priority} priority
                      </Badge>
                    </button>
                    <button
                      type="button"
                      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
                      aria-label={`Filter by ${ticket.aiOutput ? "answered" : "pending"} AI status`}
                      onClick={() =>
                        handleAnsweredChange(
                          ticket.aiOutput ? ANSWERED_ANSWERED : ANSWERED_PENDING
                        )
                      }
                    >
                      <Badge variant={ticket.aiOutput ? "success" : "default"}>
                        {ticket.aiOutput ? "Answered" : "Pending"}
                      </Badge>
                    </button>
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
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              Showing {totalTickets === 0 ? 0 : startIndex + 1}–{endIndex} of{" "}
              {totalTickets}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                {pageItems.map((item, index) =>
                  typeof item === "number" ? (
                    <Button
                      key={`${item}-${index}`}
                      type="button"
                      variant={item === currentPage ? "primary" : "secondary"}
                      aria-current={item === currentPage ? "page" : undefined}
                      onClick={() => handlePageChange(item)}
                    >
                      {item}
                    </Button>
                  ) : (
                    <span key={`ellipsis-${index}`} className="px-2">
                      {item}
                    </span>
                  )
                )}
              </div>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
