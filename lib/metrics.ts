import type { Ticket } from "@/lib/tickets/types";

export type TicketMetrics = {
  total: number;
  open: number;
  resolved: number;
  pendingAi: number;
  avgFirstResponseHrs: number;
  avgResolutionHrs: number;
  atRisk: number;
};

const HOURS_IN_MS = 36e5;

export function computeTicketMetrics(
  tickets: Ticket[],
  slaFirstHrs = 4,
  slaResolutionHrs = 48
): TicketMetrics {
  const base: TicketMetrics = {
    total: tickets.length,
    open: 0,
    resolved: 0,
    pendingAi: 0,
    avgFirstResponseHrs: 0,
    avgResolutionHrs: 0,
    atRisk: 0,
  };

  let firstResponseSum = 0;
  let firstResponseCount = 0;
  let resolutionSum = 0;
  let resolutionCount = 0;

  const now = Date.now();

  tickets.forEach((t) => {
    if (t.status === "Resolved") base.resolved += 1;
    else base.open += 1;
    if (!t.aiOutput) base.pendingAi += 1;

    if (t.answeredAt) {
      const delta = Date.parse(t.answeredAt) - Date.parse(t.createdAt);
      if (!Number.isNaN(delta) && delta > 0) {
        firstResponseSum += delta;
        firstResponseCount += 1;
      }
    }

    if (t.resolvedAt) {
      const delta = Date.parse(t.resolvedAt) - Date.parse(t.createdAt);
      if (!Number.isNaN(delta) && delta > 0) {
        resolutionSum += delta;
        resolutionCount += 1;
      }
    }

    const created = Date.parse(t.createdAt);
    if (!Number.isNaN(created) && t.status !== "Resolved") {
      const ageHrs = (now - created) / HOURS_IN_MS;
      const threshold = Math.min(slaFirstHrs, slaResolutionHrs);
      if (ageHrs > threshold * 0.75) {
        base.atRisk += 1;
      }
    }
  });

  base.avgFirstResponseHrs =
    firstResponseCount === 0
      ? 0
      : Number((firstResponseSum / firstResponseCount / HOURS_IN_MS).toFixed(1));
  base.avgResolutionHrs =
    resolutionCount === 0
      ? 0
      : Number((resolutionSum / resolutionCount / HOURS_IN_MS).toFixed(1));

  return base;
}
