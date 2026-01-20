import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type TicketDetailsPageProps = {
  params: {
    id: string;
  };
};

export default function TicketDetailsPage({
  params,
}: TicketDetailsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket Details"
        description="Review the AI response, QA summary, and follow-up questions for this ticket."
        badge={<Badge variant="success">ID {params.id}</Badge>}
      />
      <Card className="p-6">
        <EmptyState
          title="AI output pending"
          description="Generate responses after a ticket is submitted to populate this view."
          action={<ButtonLink href="/app/tickets">Back to tickets</ButtonLink>}
        />
      </Card>
    </div>
  );
}
