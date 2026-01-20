import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Review, filter, and prioritize incoming support requests."
        badge={<Badge>All</Badge>}
      />
      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Demo ticket</p>
              <p className="text-sm text-slate-600">
                Customer reports that the mobile checkout button is unresponsive
                after the latest release.
              </p>
            </div>
            <Link
              href="/app/tickets/123"
              className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white"
            >
              View ticket
            </Link>
          </div>
        </Card>
        <Card className="p-6">
          <EmptyState
            title="No additional tickets"
            description="Create a new ticket to see it appear in the dashboard list."
            action={
              <ButtonLink href="/app/tickets/new">
                Create a new ticket
              </ButtonLink>
            }
          />
        </Card>
      </div>
    </div>
  );
}
