import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Configure workspace preferences and support workflow defaults."
        badge={<Badge variant="default">Workspace</Badge>}
      />
      <div className="grid gap-4">
        <Card className="p-8">
          <EmptyState
            title="No settings configured"
            description="Settings will appear here as the SupportPilot workflow expands."
            action={<ButtonLink href="/app">Return to dashboard</ButtonLink>}
          />
        </Card>
        <Card className="p-6 border border-slate-200">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Danger zone</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Critical settings will live here. Keep access restricted and review changes carefully.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
