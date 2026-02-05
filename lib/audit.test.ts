import { strict as assert } from "node:assert";
import test from "node:test";

import { appendAuditEntry } from "@/lib/audit";
import type { AuditEvent } from "@/lib/tickets/types";

const event = (id: string): AuditEvent => ({
  id,
  eventType: "test",
  actor: "You",
  detail: `Event ${id}`,
  createdAt: "2026-02-01T00:00:00.000Z",
});

test("appendAuditEntry keeps order and applies limit", () => {
  const initial: AuditEvent[] = [event("1"), event("2")];
  const next = appendAuditEntry(initial, event("0"), 3);
  assert.deepEqual(next.map((e) => e.id), ["0", "1", "2"]);

  const limited = appendAuditEntry(next, event("3"), 3);
  assert.deepEqual(limited.map((e) => e.id), ["3", "0", "1"]);
});

test("appendAuditEntry handles empty list", () => {
  const next = appendAuditEntry([], event("x"), 2);
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "x");
});
