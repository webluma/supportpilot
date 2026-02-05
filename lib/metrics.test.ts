import { strict as assert } from "node:assert";
import test from "node:test";

import { computeTicketMetrics } from "@/lib/metrics";
import type { Ticket } from "@/lib/tickets/types";

const baseTicket = {
  id: "1",
  title: "Test",
  description: "Desc",
  category: "Bug",
  priority: "High",
  status: "Open",
  channel: "Web",
  environment: {},
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
} as Ticket;

test("computeTicketMetrics with no tickets", () => {
  const metrics = computeTicketMetrics([]);
  assert.equal(metrics.total, 0);
  assert.equal(metrics.avgFirstResponseHrs, 0);
  assert.equal(metrics.avgResolutionHrs, 0);
});

test("computeTicketMetrics averages and counts", () => {
  const tickets: Ticket[] = [
    {
      ...baseTicket,
      id: "a",
      status: "Open",
      answeredAt: "2026-02-01T04:00:00.000Z",
      aiOutput: {} as any,
    },
    {
      ...baseTicket,
      id: "b",
      status: "Resolved",
      answeredAt: "2026-02-01T02:00:00.000Z",
      resolvedAt: "2026-02-02T00:00:00.000Z",
      aiOutput: {} as any,
    },
  ];

  const metrics = computeTicketMetrics(tickets);
  assert.equal(metrics.total, 2);
  assert.equal(metrics.open, 1);
  assert.equal(metrics.resolved, 1);
  assert.equal(metrics.pendingAi, 0);
  assert.equal(metrics.avgFirstResponseHrs, 3); // (4h + 2h) / 2
  assert.equal(metrics.avgResolutionHrs, 24);
});

test("computeTicketMetrics ignores invalid dates", () => {
  const tickets: Ticket[] = [
    { ...baseTicket, id: "c", createdAt: "invalid-date", answeredAt: "invalid" },
  ];
  const metrics = computeTicketMetrics(tickets);
  assert.equal(metrics.avgFirstResponseHrs, 0);
  assert.ok(metrics.atRisk >= 0);
});
