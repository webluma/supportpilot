import type { AuditEvent } from "@/lib/tickets/types";

export function appendAuditEntry(
  list: AuditEvent[] = [],
  event: AuditEvent,
  limit = 20
): AuditEvent[] {
  const next = [event, ...list];
  return next.slice(0, limit);
}
