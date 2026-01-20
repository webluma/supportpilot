import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Track support activity, AI response status, and QA visibility from one place."
        badge={<Badge variant="info">MVP</Badge>}
      />
      <Card className="p-6">
        <EmptyState
          title="No activity yet"
          description="Create your first support ticket to generate AI insights and summaries."
          action={
            <ButtonLink href="/app/tickets/new">
              Create a new ticket
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}
