import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NewTicketPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Ticket"
        description="Capture the issue context so AI can generate an empathetic response and a structured QA report."
        badge={<Badge variant="warning">Draft</Badge>}
      />
      <Card className="p-6">
        <EmptyState
          title="Ticket form coming soon"
          description="This is where the structured ticket form will live in the next phase."
          action={<ButtonLink href="/app/tickets">View ticket history</ButtonLink>}
        />
      </Card>
    </div>
  );
}
