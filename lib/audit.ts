export type AuditEvent = {
  id: string;
  eventType: string;
  actor: string;
  detail: string;
  createdAt: string;
};

export function appendAuditEntry(
  list: AuditEvent[] = [],
  event: AuditEvent,
  limit = 20
): AuditEvent[] {
  const next = [event, ...list];
  return next.slice(0, limit);
}
