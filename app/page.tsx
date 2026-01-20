import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            SupportPilot
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            AI Support Assistant SaaS
          </h1>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            A portfolio-grade experience that simulates modern customer support
            workflows with AI-assisted triage, response drafting, and QA-ready
            summaries.
          </p>
        </header>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/app">Open the demo app</ButtonLink>
          <ButtonLink href="/app/tickets/new" variant="secondary">
            Create a new ticket
          </ButtonLink>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Support-ready UX
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Clean SaaS layout with clear status, focus states, and empty
              guidance.
            </p>
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              AI-generated outputs
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Empathetic responses plus structured summaries for QA and product.
            </p>
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Product mindset
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Designed to highlight triage, prioritization, and next actions.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
