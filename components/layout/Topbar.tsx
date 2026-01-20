type TopbarProps = {
  isMenuOpen: boolean;
  onMenuClick: () => void;
};

export function Topbar({ isMenuOpen, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-4">
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
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Workspace
            </p>
            <p className="text-base font-semibold text-slate-900">SupportPilot</p>
          </div>
        </div>
        <div className="text-sm text-slate-500">AI Support Assistant demo</div>
      </div>
    </header>
  );
}
