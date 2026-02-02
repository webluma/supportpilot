type TopbarProps = {
  isMenuOpen: boolean;
  onMenuClick: () => void;
  currentPath?: string | null;
};

const titleMap: Record<string, string> = {
  "/app": "Dashboard",
  "/app/tickets": "Tickets",
  "/app/tickets/new": "New Ticket",
  "/app/settings": "Settings",
};

function resolveTitle(path?: string | null) {
  if (!path) return "Workspace";
  const match = Object.entries(titleMap).find(([key]) =>
    path === key || (key === "/app/tickets" && path.startsWith("/app/tickets"))
  );
  return match ? match[1] : "Workspace";
}

export function Topbar({ isMenuOpen, onMenuClick, currentPath }: TopbarProps) {
  const currentTitle = resolveTitle(currentPath);
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/80 px-4 sm:px-6 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white md:hidden"
          >
            Menu
          </button>
          <div className="leading-tight">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              SupportPilot
            </p>
            <p className="text-base font-semibold text-slate-900">
              {currentTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="hidden sm:inline">AI Support Assistant demo</span>
          <span className="h-8 w-8 rounded-full bg-slate-200" aria-hidden />
        </div>
      </div>
    </header>
  );
}
