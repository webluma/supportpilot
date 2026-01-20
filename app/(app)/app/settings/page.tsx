import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure workspace preferences and support workflow defaults."
        badge={<Badge variant="default">Workspace</Badge>}
      />
      <Card className="p-6">
        <EmptyState
          title="No settings configured"
          description="Settings will appear here as the SupportPilot workflow expands."
          action={<ButtonLink href="/app">Return to dashboard</ButtonLink>}
        />
      </Card>
    </div>
  );
}
